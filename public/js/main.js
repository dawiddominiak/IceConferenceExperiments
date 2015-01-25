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

// lecturerOnline.factory('liveConnection', ['$q', function liveConnectionFactory($q) {
// 	// var socket = io();
// 	// return {
// 	// 	on: function(name) {
// 	// 		var deferred = $q.defer();
// 	// 		socket.on(name, deferred.resolve);
// 	// 		return deferred.promise;
// 	// 	},
// 	// 	emit: socket.emit,
// 	// 	wait: function(name, message) {
// 	// 		var deferred = $q.defer();
// 	// 		this.emit.apply(this, arguments);
// 	// 		this.on(name + 'Response').then(deferred.resolve, deferred.reject);
// 	// 		return deferred.promise;
// 	// 	}
// 	// };
// 	return;
// }]);

lecturerOnline.factory('RTCConnection', ['$q', function RTCConnectionFactory($q) {
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

	function addStream(stream) {
		peerConnection.addStream(stream);
	}

	function getOfferPromise() {
		var deferred = $q.defer();
		peerConnection.createOffer(deferred.resolve, deferred.reject);
		return deferred.promise.then(function(offer) {
			peerConnection.setLocalDescription(offer);
			return offer;
		});
	};

	function stunConnect(offer) {
		liveConnection.emit('calleeOffer:handle', JSON.stringify({
			'sdp': offer
		}));
	}

	var RTC = {
		createAsCallee: function(stream) {
			addStream(stream);
			return getOfferPromise().then(function(offer) {
				console.log('offer', offer);
				var socket = io.connect('http://localhost:3001');
				console.log('before emit', socket);
				socket.on('connect', function() {
					console.log('connect');
					socket.emit('callee', JSON.stringify({
						'sdp': offer
					}));
				});
				// stunConnect(offer);
			});
		}
	};

	return RTC;
}]);

lecturerOnline.controller('MainPageCtrl', ['$scope', 'userMedia', 'RTCConnection', function($scope, userMedia, RTCConnection) {
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
		RTCConnection.createAsCallee(stream);
	});
}]);
