var express = require('express.io');
var app = express();
var path = require('path');
var http = require('http');
var server = http.createServer(app);

var port = 3000;

server.listen(port);
var io = require('socket.io').listen(3001);

app.http().io();
app.use(express.static(path.join(__dirname, 'public')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Setup the ready route, and emit talk event.
app.io.route('callee', function(req) {
    console.log('CHKPNT 1');
});
io.on('connection', function (socket) {
	console.log('connection');
	io.on('callee', function(data) {
		console.log('CHKPNT 2', data);
	});
});
io.on('callee', function(data) {
	console.log('CHKPNT 3', data);
});
// Send the client html.
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/client.html')
});

app.listen(port);

// var express = require('express.io');
// var path = require('path');
// var favicon = require('serve-favicon');
// var logger = require('morgan');
// var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser');
// var http = require('http');
// var routes = require('./routes/index');

// var app = express();
// app.http().io();

// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// // uncomment after placing your favicon in /public
// //app.use(favicon(__dirname + '/public/favicon.ico'));
// app.use(logger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', routes);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//     var err = new Error('Not Found');
//     err.status = 404;
//     next(err);
// });

// app.io.route('calleeOffer', function(req) {
//     console.log('CHKPNT');
//     console.log(req);
// });
// // error handlers

// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//     app.use(function(err, req, res, next) {
//         res.status(err.status || 500);
//         res.render('error', {
//             message: err.message,
//             error: err
//         });
//     });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//         message: err.message,
//         error: {}
//     });
// });


// module.exports = app;
