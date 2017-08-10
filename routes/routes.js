var express = require('express');
var router = express.Router(),
    twitter = require('../auth/twitter'),
    request = require('request'),
    Yelp = require('yelp'),
    My_bar = require('../models/my_bars'),
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

// OTHER ROUTES
// -----------
router.get('/', function(req, res) {
  res.render('index', {
    user: req.user || '',
    page: 'home'
  });
})

// search all locations
.post('/search', function(req, res) {
  var location = req.body.location,
      bar_id = req.body.bar_id;
  if (!location) {
    res.status(400).json({'message':'No locations found'});
  } else {
    if (bar_id) {
      My_bar.findOne({ id: bar_id })
        .populate('going')
        .exec(function(err, bar) {
          if (err) {
            res.status(400).json({error:err});
          } else {
            // check if the logged in user is already going
            var user;
            bar.going.forEach(function(u) {
              console.log(u);
              if (u._id.toString() === req.user._id.toString()) {
                user = true;
              }
            });
            if (user) {
              // delete user
              res.status(200).json({message:'user exists already'});
            } else {
              bar.going.push(req.user);
              bar.save();
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
          }
        });
    } else {
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
        if (my_bar) {
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
      stars = req.body.rating_img_url_large;

  var updates = {
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
          console.log(my_bar);
          user.my_bars.push(my_bar);
          user.save()
          res.status(200).json({data:my_bar});
        }
      });
    }
  });
})

.post('/going', isLoggedIn, function(req, res) {
  var bar_id = req.body.id;
  console.log(bar_id);
  My_bar.findOne({ id: bar_id })
    .populate('going')
    .exec(function(err, bar) {
      if (err) {
        res.status(400).json({error:err});
      } else {
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
    .populate('my_bars')
    .exec(function(err, user) {
      if (err) {
        res.status(400).json({error:err});
      } else {
        res.render('my_bars', {
          user: user || '',
          page: 'my_bars'
        });
      }
    });
})

// delete bar

.get('/my_friends', isLoggedIn, function(req, res) {
  User.findById(req.user._id)
    .populate('my_bars')
    .exec(function(err, user) {
      if (err) {
        res.status(400).json({error:err});
      } else {
        res.render('my_friends', {
          user: user || '',
          page: 'my_friends'
        });
      }
    });
});


// add friend .put('/')

// delete friend .post('/')

module.exports = router;
