var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
require('dotenv').config();
var User = require('../models/users');
var init = require('../auth/init');

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_KEY,
  consumerSecret: process.env.TWITTER_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK
}, function(accessToken, refreshToken, profile, done) {
  var searchQuery = {
    name: profile.displayName
  };

  var updates = {
    name: profile.displayName,
    someId: profile.id
  };

  var options = {
    upsert: true
  };

  User.findOneAndUpdate(searchQuery, updates, options, function(err, user) {
    if (err) {
      return done(err);
    } else {
      return done(null, user);
    }
  });

}));

init();

module.exports = passport;
