//Dependencies
var express = require('express.io');
var app = express();
var path = require('path');

//Settings
var port = 7076;
app.http().io();
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var offers = {};
//Static routes
require('./routes/index')(app, offers);

//IO routes
require('./routes/io')(app.io, offers);

app.listen(port);