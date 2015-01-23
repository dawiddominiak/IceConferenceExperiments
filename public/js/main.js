var lecturerOnline = angular.module('lecturerOnline', []);

lecturerOnline.factory('userMedia', ['$q', function userMediaFactory($q) {
	navigator.getUserMedia = (
		navigator.getUserMedia || 
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.mozGetUserMedia
	);

	return $q(function(resolve, reject) {
		if(navigator.getUserMedia) {
			navigator.getUserMedia(
				{
					video: true,
					audio: true
				},
				resolve,
				reject
			);
		} else {
			reject(new Error('navigator.getUserMedia not supported in your browser'));
		}
	});
}]);



lecturerOnline.controller('MainPageCtrl', ['$scope', 'userMedia', function($scope, userMedia) {
	$scope.streamUrl = "";
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
	}, function(error) {
		console.error(error);
	})
}]);
