var path = require('path');

module.exports = function(app, offers) {
	// app.param('offer', function(req, res, next, offer) {
	// 	if(offers)
	// });


	/* GET offers. */

	app.get('/conf/:url', function(req, res, next) {
		res.render('caller', {
			title: 'Ice Conference',
			controller: 'CallerCtrl'
		});
	});

	/* GET home page. */
	app.get('/*', function(req, res, next) {
		res.render('index', {
			title: 'Ice Conference',
			controller: 'MainPageCtrl'
		});
	});
};
