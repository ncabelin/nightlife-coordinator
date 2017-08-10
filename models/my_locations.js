var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var My_locations_schema = new Schema({
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nightlife_users'
    }
  },
  location: String,
  date: Date
});

module.exports = mongoose.model('My_bars', My_bars_schema);
