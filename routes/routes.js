var express = require('express');
var router = express.Router(),
    twitter = require('../auth/twitter'),
    moment = require('moment'),
    request = require('request'),
    Yelp = require('yelp'),
    My_bar = require('../models/my_bars'),
    My_location = require('../models/my_locations'),
    User = require('../models/users'),
    yelp_search = function(loc) {
      var yelp = new Yelp({
        consumer_key: process.env.YELP_KEY,
      	consumer_secret: process.env.YELP_SECRET,
      	token: process.env.YELP_TOKEN,
      	token_secret: process.env.YELP_TOKEN_SECRET
      });
      return yelp.search({
        term: 'bar',
        location: loc
      });
    };

require('dotenv').config();

// AUTHENTICATION ROUTES
// ---------------------
router.get('/auth/twitter', twitter.authenticate('twitter'))
.get('/auth/twitter/callback', twitter.authenticate('twitter', { failureRedirect: '/login' }), function(req, res) {
  // TO-DO: delete all previous bars based on date
  res.redirect('/');
})

.get('/login', function(req, res) {
  res.render('login', {
    user: req.user || '',
    page: 'login'
  });
})

.get('/logout', isLoggedIn, function(req, res) {
  req.logout();
  res.redirect('/')
});

function isLoggedIn(req, res, next) {
  if (req.user) {
    return next();
  }
  res.redirect('/login');
}

function barIsToday(bar) {
  var dateNow = new Date(),
      month = dateNow.getMonth();
      day = dateNow.getDay();
      year = dateNow.getFullYear();

  var barDate = new Date(bar.date),
      barMonth = barDate.getMonth(),
      barDay = barDate.getDay(),
      barYear = barDate.getFullYear();

  if (month == barMonth && day == barDay && year == barYear) {
    return true;
  } else {
    return false;
  }
}

// OTHER ROUTES
// -----------
router.get('/', function(req, res) {
  if (req.user) {
    User.findById(req.user._id)
      .populate({
          path: 'my_locations',
          options: {
            limit: 10,
            sort: { date: -1 }
          }
      })
      .exec(function(err, user) {
        if (err) {
          console.log(err);
        } else {
          res.render('index', {
            user: user,
            page: 'home',
            my_locations: user.my_locations
          });
        }
      });
  } else {
    res.render('index', {
      user: '',
      page: 'home',
      my_locations: []
    });
  }
})

.post('/search', function(req, res) {
  var location = req.body.location;
  if (!location) {
    res.status(400).json({'message':'No locations found'});
  } else {

    // if user is logged in save location searches
    if (req.user) {
      // save location
      var updates = {
        user: req.user._id,
        location: location,
        date: new Date()
      };

      var options = {
        upsert: true,
        new: true
      };

      My_location.findOneAndUpdate({ location: location}, updates, options, function(err, my_location) {
        if (err) {
          console.log(err);
        } else {
          User.findById(req.user._id)
            .exec(function(err, user) {
              if (err) {
                res.status(400).json({error:err});
              } else {
                user.my_locations.push(my_location);
                user.save();
              }
            });
        }
      });
    }

  //
  yelp_search(location)
    .then(function(data) {
      res.render('results', {
        user: req.user || '',
        page: 'results',
        location: location,
        results: data
      });
    })
    .catch(function(err) {
      res.status(400).json({ error: err });
    });
  }
})

// checks if bar exists
.post('/check_bar', isLoggedIn, function(req, res) {
  var id = req.body.id;
  console.log(id);
  My_bar.findOne({ id: id})
    .populate('going')
    .exec(function(error, my_bar) {
      if (error) {
        res.status(400).json({ error: error });
      } else {
        var month_now = new Date().getMonth(),
            day_now = new Date().getDay(),
            year_now = new Date().getFullYear();
        // var month = my_bar.date.getMonth(),
        //     day = my_bar.date.getDay(),
        //     year = my_bar.date.getFullYear();
        //
        // console.log(month_now, day_now, year_now, month, day, year);

        if (my_bar) {
          console.log(my_bar);
          res.json(my_bar);
        } else {
          res.status(400).json({ error: 'Could not find ' + id });
        }
      }
    });
})

.post('/zipcode', function(req, res) {
  var lat = req.body.lat,
      lng = req.body.lng;
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&key=' + process.env.GOOGLE_KEY;
  request(url, function(error, response, body) {
    if (error) {
      res.status(400).json({ error: error });
    } else {
      res.status(200).json(body);
    }
  })
})

.post('/save_location', isLoggedIn, function(req, res) {
  var name = req.body.name,
      id = req.body.id,
      picture = req.body.image_url,
      review = req.body.snippet_text,
      date = Date.now(),
      stars = req.body.rating_img_url_large;

  var updates = {
    date: date,
    name: name,
    id: id,
    picture: picture,
    review: review,
    stars: stars,
    going: []
  }

  var options = {
    upsert: true,
    new: true
  };

  My_bar.findOneAndUpdate({ id: id}, updates, options, function(err, my_bar) {
    if (err) {
      res.status(400).json({error:err});
    } else {
      User.findById(req.user._id, function(error, user) {
        if (error) {
          res.status(400).json({error:error});
        } else {
          console.log('saved bar in user');
          user.my_bars.push(my_bar);
          user.save();
          console.log(user);
          res.status(200).json({data:my_bar});
        }
      });
    }
  });
})

// looks for users going to a bar defined by bar_id
.post('/going', isLoggedIn, function(req, res) {
  var bar_id = req.body.id;
  console.log(bar_id);
  My_bar.findOne({ id: bar_id })
    .populate('going')
    .exec(function(err, bar) {
      if (err) {
        res.status(400).json({error:err});
      } else {
        // save bar in my_bars (if you click 'go' on another user's saved bar)
        User.findById(req.user._id)
          .populate('my_bars')
          .exec(function(error, user) {
            if (error) {
              res.status(400).json({error:err});
            } else {
              var found_bar;
              user.my_bars.forEach(function(b) {
                if (b._id.toString() === bar._id.toString()) {
                  found_bar = true;
                  console.log('FOUND_BAR duplicate');
                }
              });
              console.log('FOUND_BAR is ' + found_bar);
              if (!found_bar) {
                user.my_bars.push(bar);;
                user.save();
              }
            }
          });


        // check if the logged in user is already going
        var user;
        if (bar) {
          bar.going.forEach(function(u) {
            console.log(u);
            // take user off going list
            if (u._id.toString() === req.user._id.toString()) {
              user = u.name;
              bar.going.pull(u._id.toString());
              bar.save();
            }
          });
          if (user) {
            // return bar with user off the list
            res.status(200).json({message:'user deleted',name:user,bar:bar});
          } else {
            bar.going.push(req.user);
            bar.save();
            console.log(bar);
            res.status(200).json(bar);
          }
        }
      }
    });
})

.get('/my_bars', isLoggedIn, function(req, res) {
  User.findById(req.user._id)
    .populate({
      path: 'my_bars',
      populate: { path: 'going'}
    })
    .exec(function(err, user) {
      if (err) {
        res.status(400).json({message:'Bar not found'})
      } else {
        user.my_bars.forEach(function(b) {
          console.log(barIsToday(b), b.name);
        });
        res.render('my_bars', {
            user: user || '',
            page: 'my_bars',
            moment: moment
          });
      }
    });
})

.post('/change_date', isLoggedIn, function(req, res) {
  var bar_id = req.body.bar_id;
  My_bar.findOneAndUpdate({ id: bar_id}, {date:new Date()}, function(err, bar) {
    if (err) {
      res.status(400).json({message:'Bar not found'})
    } else {
      console.log(bar);
      res.status(200).json({message:'Bar date updated'})
    }
  });
})

// 1. delete bar from user's my bar list
// 2. delete user id from bar's going list
// 3. does not delete bar itself
.post('/delete_bar', isLoggedIn, function(req, res) {
  var bar_id = req.body.bar_id;
  console.log(bar_id);
  // delete bar from user's my bar list
  User.findById(req.user._id)
    .populate({
      path: 'my_bars',
      populate: { path: 'going'}
    })
    .exec(function(err, user) {
      if (err) {
        res.status(400).json({message:'User not found'})
      } else {
        user.my_bars.forEach(function(bar) {
          bar.going.forEach(function(u) {
            if (u._id.toString() === req.user._id.toString()) {
              bar.going.pull(req.user._id.toString());
              bar.save();
            }
          });
        });
        user.my_bars.pull(bar_id);
        user.save();
        res.redirect('/my_bars');
      }
    });

});

module.exports = router;
