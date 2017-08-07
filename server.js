var express = require('express');
var app = express(),
    methodOverride = require('method-override'),
    morgan = require('morgan'),
    mongoose = require('mongoose'),
    session = require('express-session'),
    passport = require('passport'),
    bodyParser = require('body-parser'),
    port = process.env.PORT || 8080,
    ip = process.env.IP;

var routes = require('./routes/routes');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI);

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(morgan('tiny'));
app.use(session({
  secret: process.env.TWITTER_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/static'));

app.use(routes);

app.listen(port, ip, function() {
  console.log('Server started at port ' + port);
});
