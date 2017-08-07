var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var My_bars_schema = new Schema({
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nightlife_users'
    }
  },
  name: String,
  picture: String,
  description: String,
  going: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nightlife_users'
    }
  ]
});

module.exports = mongoose.model('My_bars', My_bars_schema);
