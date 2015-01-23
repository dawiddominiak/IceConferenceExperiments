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

lecturerOnline.factory('liveConnection', ['$q', function liveConnectionFactory($q) {
	var socket = io();
	return {
		on: function(name) {
			var deferred = $q.defer();
			socket.on(name, deferred.resolve);
			return deferred.promise;
		},
		emit: socket.emit,
		wait: function(name, message) {
			var deferred = $q.defer();
			this.emit.apply(this, arguments);
			this.on(name + 'Response').then(deferred.resolve, deferred.reject);
			return deferred.promise;
		}
	};
}]);

lecturerOnline.factory('RTCConnection', ['$q', 'liveConnection', function RTCConnectionFactory($q, liveConnection) {
	var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
	var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

	var configuration = {
	    iceServers: [
	        {
	        	url: "stun:localhost:3000"
	        }
	    ]
	};

	var peerConnection = new PeerConnection(configuration);
	var offerPromise = $q(function(resolve, reject) {
		peerConnection.createOffer(resolve, reject);
	});
	var responsePromise = offerPromise.then(function(offer) {
		peerConnection.setLocalDescription(offer);
		return liveConnection.wait('offer', JSON.stringify(offer));
	});

	var RTC = {
		peerConnection: peerConnection,
		responsePromise: responsePromise
	};

	return RTC;
}]);

lecturerOnline.controller('MainPageCtrl', ['$scope', 'userMedia', 'RTCConnection', function($scope, userMedia, RTCConnection) {
	$scope.streamUrl = "";
	console.log(RTCConnection.peerConnection);
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
	}, function(error) {
		console.error(error);
	});
}]);
