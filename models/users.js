var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var My_bars = require('../models/my_bars');

var User = new Schema({
  name: String,
  twitter_id: String,
  my_bars: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'My_bars'
    }
  ],
  my_friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'My_friends'
    }
  ],
  // pending requests, which you need to approve
  my_friend_requests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'My_friends_requests'
    }
  ],
  my_locations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'My_locations'
    }
  ]
});

module.exports = mongoose.model('Nightlife_users', User);
