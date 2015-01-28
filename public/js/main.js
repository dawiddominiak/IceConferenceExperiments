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
	this.uuid = 'a';
	this.buffer = uuid.parse(this.uuid);
	this.string = 'a'; //this.buffer.map(function(e) {return String.fromCharCode(e);}).join('');
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

	var addStream = peerConnection.addStream.bind(peerConnection);

	peerConnection.onicecandidate = function(evt) {
		liveConnection.emit('callee:newIceCandidate', {
			candidate: evt.candidate,
			offerId: streamingURL.string
		});
	};

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
			return setRemoteDescription(answer).then(function() {
				return liveConnection.wait('callee:getCallerIceCandidates', {
					offerId: streamingURL.string
				});
			}).tap(function(iceCandidates) {
				iceCandidates.forEach(function(iceCandidate) {
					peerConnection.addIceCandidate(new RTCAPI.IceCandidate(iceCandidate));
				});
			});
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
	
	peerConnection.onicecandidate = function(evt) {
		console.log(evt.candidate);
		liveConnection.emit('caller:newIceCandidate', {
			candidate: evt.candidate,
			offerId: talkId
		});
	};

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
			}).then(function() {
				return liveConnection.wait('callee:getCallerIceCandidates', {
					offerId: talkId
				});
			}).tap(function(iceCandidates) {
				iceCandidates.forEach(function(iceCandidate) {
					peerConnection.addIceCandidate(new RTCAPI.IceCandidate(iceCandidate));
				});
			});
		},
		setAddStreamHandler: function(handler) {
			addStreamHandler = handler;
		}
	};

	return RTCCaller;
}]);

lecturerOnline.controller('MainPageCtrl', ['$scope', 'liveConnection', function($scope, liveConnection) {
	console.log('here I am');
	liveConnection.wait('callee:createConference', {
		calleeName: "Dawid Dominiak",
		conferenceName: "Conference with explosions"
	}).tap(function(result) {
		console.log(result);
	}).done();
}]);

lecturerOnline.controller('CalleeCtrl', ['$scope', 'userMedia', 'RTCCallee', 'streamingURL', function($scope, userMedia, RTCCallee, streamingURL) {
	userMedia.then(function(stream) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();
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

lecturerOnline.controller('CallerCtrl', ['$scope', 'RTCCaller', function($scope, RTCCaller) {
	
	RTCCaller.setAddStreamHandler(function(evt) {
		video = document.querySelector('video');
		video.src = window.URL.createObjectURL(evt.stream);
		video.play();
	});
	RTCCaller.answer().then(function(answer) {
		// console.log('answer', answer);
	}).done();
}]);
