var lecturerOnline = angular.module('lecturerOnline', [
	'angular-extend-promises'
]);

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
	this.string = this.buffer.map(function(e) {return String.fromCharCode(e);}).join('');
	console.log(this.uuid);
	this.uriComponent = encodeURIComponent(this.string);
	this.location = document.location;
}]);

lecturerOnline.service('RTCAPI', [function RTCAPI() {
	this.PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	this.IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
	this.SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
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

lecturerOnline.factory('RTCCallee', ['$q', 'liveConnection', 'streamingURL', 'RTCAPI', function RTCConnectionFactory($q, liveConnection, streamingURL, RTCAPI) {
	var configuration = {
	    iceServers: [
	        {
	        	url: "stun:stun.l.google.com:19302"
	        }
	    ]
	};

	var peerConnection = new RTCAPI.PeerConnection(configuration);

	// peerConnection.onicecandidate = function(evt) {
	// 	console.log('CalleeIceCandidate', evt);
	// 	liveConnection.emit('calleeCandidate:add', {
	// 		candidate: evt.candidate
	// 	});
	// };

	var addStream = peerConnection.addStream.bind(peerConnection);

	function setLocalDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setLocalDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	function setRemoteDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setRemoteDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;		
	}

	function getOfferPromise() {
		var deferred = $q.defer();
		peerConnection.createOffer(deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	function connect(offer) {
		return liveConnection.wait('callee:sendOffer', {
			'sdp': offer,
			'uri': streamingURL.string
		});
	}

	function waitForAnAnswer() {
		return liveConnection.on('receiveTheAnswer');
	}

	var RTCCallee = {
		call: function(stream) {
			addStream(stream);
			return getOfferPromise().tap(function(offer) {
				return setLocalDescription(offer);
			}).then(function(offer) {
				return connect(offer);
			});
		},
		waitForAnAnswer: waitForAnAnswer,
		establish: function(answer) {
			return setRemoteDescription(answer);
		}
	};

	return RTCCallee;
}]);

lecturerOnline.factory('RTCCaller', ['$q', 'liveConnection', 'RTCAPI', function RTCConnectionFactory($q, liveConnection, RTCAPI) {
	var configuration = {
	    iceServers: [
	        {
	        	url: "stun:stun.l.google.com:19302"
	        }
	    ]
	};

	var peerConnection = new RTCAPI.PeerConnection(configuration);
	var talkId = decodeURIComponent(location.pathname.slice(1));
	var addStreamHandler = function(addstream) {
		console.log('Default addstream handler', addstream);
	};

	peerConnection.onaddstream = function(addstream) {
		addStreamHandler(addstream);
	};

	function getOfferFromCallee() {
		return liveConnection.wait('caller:demandOffer', talkId);
	}

	function pushAnswerToCallee(answer) {
		return liveConnection.wait('caller:pushAnswer', answer);
	}

	function setLocalDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setLocalDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;		
	}

	function setRemoteDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setRemoteDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	function createAnswer() {
		var deferred = $q.defer();
		peerConnection.createAnswer(deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	var RTCCaller = {
		answer: function() {
			return getOfferFromCallee().tap(function(calleOffer) {
				// console.log('offer', calleOffer);
				return setRemoteDescription(calleOffer);
			}).then(function() {
				return createAnswer();
			}).tap(function(answer) {
				return setLocalDescription(answer);
			}).tap(function(answer) {
				return pushAnswerToCallee({
					answer: answer,
					talkId: talkId
				});
			});
		},
		setAddStreamHandler: function(handler) {
			addStreamHandler = handler;
		}
	};

	return RTCCaller;
}]);

lecturerOnline.controller('MainPageCtrl', ['$scope', 'userMedia', 'RTCCallee', 'streamingURL', function($scope, userMedia, RTCCallee, streamingURL) {
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
		console.log(stream.getVideoTracks());
		RTCCallee.call(stream).then(function(response) {
			$scope.url = streamingURL.location.protocol + '//' + streamingURL.location.host + '/' + streamingURL.uriComponent;
			return RTCCallee.waitForAnAnswer();
		}).tap(function(answer) {
			console.log('answer', answer);
			return RTCCallee.establish(answer);
		}).tap(function() {
			console.log('connected');
		}).done();
	});
}]);

lecturerOnline.controller('CallerCtrl', ['$scope', 'userMedia', 'liveConnection', 'RTCCaller', function($scope, userMedia, liveConnection, RTCCaller) {
	
	RTCCaller.setAddStreamHandler(function(evt) {
		console.log(evt.stream, evt.stream.getTracks());
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(evt.stream);
		video.play();
	});
	RTCCaller.answer().then(function(answer) {
		// console.log('answer', answer);
	}).done();
}]);
