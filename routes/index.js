var path = require('path');

module.exports = function(app, offers) {
	// app.param('offer', function(req, res, next, offer) {
	// 	if(offers)
	// });

	/* GET home page. */
	app.get('/', function(req, res, next) {
		res.render('index', {
			title: 'Lecturer online',
			controller: 'MainPageCtrl'
		});
	});

	/* GET offers. */

	app.get('/:offer', function(req, res, next) {
		res.render('caller', {
			title: 'Lecturer online',
			controller: 'CallerCtrl'
		});
	});
};
