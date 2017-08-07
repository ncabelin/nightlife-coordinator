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
        location: loc,
      });
    };

require('dotenv').config();
router.get('/', function(req, res) {
  res.render('index', {
    user: req.user || '',
    page: 'home'
  });
})

.post('/search', function(req, res) {
  var location = req.body.location;
  if (!location) {
    res.status(400).json({'message':'No locations found'});
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
      res.status(400).json(err);
    });
  }
})

.post('/zipcode', function(req, res) {
  var lat = req.body.lat,
      lng = req.body.lng;
  // https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=YOUR_API_KEY
  console.log(lat, lng);
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&key=' + process.env.GOOGLE_KEY;
  request(url, function(error, response, body) {
    if (error) {
      res.status(400).json({ 'message': error})
    } else {
      res.status(200).json(body);
    }
  })
})

.get('/auth/twitter', twitter.authenticate('twitter'))
.get('/auth/twitter/callback', twitter.authenticate('twitter', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/');
});

router.get('/login', function(req, res) {
  res.render('login', {
    user: req.user || '',
    page: 'login'
  });
});

router.get('/logout', isLoggedIn, function(req, res) {
  req.logout();
  res.redirect('/')
});

function isLoggedIn(req, res, next) {
  if (req.user) {
    return next();
  }
  res.redirect('/login');
}

module.exports = router;
