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

lecturerOnline.service('streamingURL', [function streamingURL() {
	this.uuid = uuid.v4();
	this.buffer = uuid.parse(this.uuid);
	this.string = this.buffer.map(e => String.fromCharCode(e)).join('');
	this.uriComponent = encodeURIComponent(this.string);
	this.location = document.location;
}]);

lecturerOnline.factory('liveConnection', ['$q', function liveConnectionFactory($q) {
	var socket = io.connect();
	return {
		on: function(name) {
			var deferred = $q.defer();
			socket.on(name, deferred.resolve);
			return deferred.promise;
		},
		emit: socket.emit.bind(socket),
		wait: function(name, message) {
			var deferred = $q.defer();
			this.emit.apply(this, arguments);
			this.on(name + '|response').then(deferred.resolve, deferred.reject);
			return deferred.promise;
		}
	};
}]);

lecturerOnline.factory('RTCConnection', ['$q', 'liveConnection', 'streamingURL', function RTCConnectionFactory($q, liveConnection, streamingURL) {
	var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
	var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

	var streamHandler;

	var configuration = {
	    iceServers: [
	        {
	        	url: "stun:stun.l.google.com:19302"
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

	function connect(offer) {
		return liveConnection.wait('callee:sendOffer', {
			'sdp': offer,
			'uri': streamingURL.string
		});
	}

	var RTC = {
		createAsCallee: function(stream) {
			peerConnection.onicecandidate = function(evt) {
				console.log('CalleeIceCandidate', evt);
				liveConnection.emit('calleeCandidate:add', {
					candidate: evt.candidate
				});
			};

			addStream(stream);
			return getOfferPromise().then(function(offer) {
				return connect(offer);
			});
		},

		createAsCaller: function(stream) {
			peerConnection.onicecandidate = function(evt) {
				console.log('CallerIceCandidate', evt);
				liveConnection.emit('callerCandidate:add', {
					candidate: evt.candidate
				});
			};

			peerConnection.onaddstream = function(evt) {
				streamHandler.apply(this, arguments);
			};
		},

		setCallerStreamHandler: function(handler) {
			streamHandler = handler;
		}

	};

	return RTC;
}]);


lecturerOnline.controller('MainPageCtrl', ['$scope', 'userMedia', 'RTCConnection', 'streamingURL', function($scope, userMedia, RTCConnection, streamingURL) {
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
		RTCConnection.createAsCallee(stream).then(function(response) {
			$scope.url = streamingURL.location.protocol + '//' + streamingURL.location.host + '/' + streamingURL.uriComponent;
		});
	});
}]);

lecturerOnline.controller('CallerCtrl', ['$scope', 'liveConnection', 'RTCConnection', function($scope, liveConnection, RTCConnection) {
	console.log('CHKPNT 1');
	RTCConnection.setCallerStreamHandler(function(evt) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(evt.stream);
		video.play();
	});
	liveConnection.wait('caller:demandOffer', decodeURIComponent(location.pathname.slice(1))).then(function(offer) {
		console.log(offer);
	});
}]);
