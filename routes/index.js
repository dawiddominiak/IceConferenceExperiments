var path = require('path');

module.exports = function(app, offers) {
	// app.param('offer', function(req, res, next, offer) {
	// 	if(offers)
	// });

	/* GET home page. */
	app.get('/', function(req, res, next) {
	  res.render('index', {
	  	title: 'Lecturer online'
	  });
	});

	/* GET offers. */

	app.get('/:offer', function(req, res, next) {
		var offer = req.params.offer;
		res.send(JSON.stringify(offers[offer]));
	});
};
