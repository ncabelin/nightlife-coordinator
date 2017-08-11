var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var My_bars_schema = new Schema({
  date: Date,
  name: String,
  id: String,
  picture: String,
  review: String,
  stars: String,
  going: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nightlife_users'
    }
  ]
});

module.exports = mongoose.model('My_bars', My_bars_schema);
