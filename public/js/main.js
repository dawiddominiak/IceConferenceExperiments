var lecturerOnline = angular.module('lecturerOnline', [
	'angular-extend-promises',
	'ngRoute'
]);

lecturerOnline.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	$routeProvider.
		when('/', {
			templateUrl: '/js/main_page/view.html',
			controller: 'MainPageCtrl'
		}).
		when('/conf', {
			templateUrl: '/js/conference/callee.html',
			controller: 'CalleeCtrl'
		}).
		when('/conf/:confUri', {
			templateUrl: '/js/conference/caller.html',
			controller: 'CallerCtrl'
		}).
		otherwise({
			redirectTo: '/'
		});

	$locationProvider.
		html5Mode({
			enabled: true,
			requireBase: false
		});
}]);

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

lecturerOnline.service('RTCAPI', [function RTCAPI() {
	this.PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	this.IceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
	this.SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
}]);

lecturerOnline.factory('liveConnection', ['$q', function liveConnectionFactory($q) {
	var socket = io.connect();

	return {
		onPromisified: function(name) {
			var deferred = $q.defer();
			socket.on(name, deferred.resolve);
			return deferred.promise;
		},
		on: socket.on.bind(socket),
		emit: socket.emit.bind(socket),
		wait: function(name, message) {
			var deferred = $q.defer();
			this.emit.apply(this, arguments);
			this.onPromisified(name + '|response').then(deferred.resolve, deferred.reject);
			return deferred.promise;
		}
	};
}]);

lecturerOnline.factory('RTCCallee', ['$q', 'liveConnection', 'RTCAPI', function RTCConnectionFactory($q, liveConnection, RTCAPI) {
	var configuration = {
		iceServers: [
			{
				url: "stun:stun.l.google.com:19302"
			}
		]
	};

	var connections = {};
	var streamHandlers = {};
	var localIceCandidatesPromises = {};
	var remoteIceCandidatesDeferred = {};
	var remoteIceCandidatesPromises = {};

	//TODO: in the future
	var askForAcceptation = function(p2p) {
		var deferred = $q.defer();
		deferred.resolve(true);
		return deferred.promise;
	};

	var newPeerConnection = function(p2p) {
		var iceCandidatesDeferred = $q.defer();
		var localIceCandidates = [];
		var localIceCandidatesPromise = iceCandidatesDeferred.promise;
		if(!remoteIceCandidatesDeferred[p2p.id]) {
			remoteIceCandidatesDeferred[p2p.id] = $q.defer();
		}
		if(!remoteIceCandidatesPromises[p2p.id]) {
			remoteIceCandidatesPromises[p2p.id] = remoteIceCandidatesDeferred[p2p.id].promise;
		}
		localIceCandidatesPromises[p2p.id] = localIceCandidatesPromise;
		var peerConnection = new RTCAPI.PeerConnection(configuration);
		connections[p2p.id] = {
			peerConnection: peerConnection,
			server: p2p
		};

		peerConnection.onicecandidate = function(evt) {
		console.log('onicecandidate', evt);
			if(evt.candidate) {
				localIceCandidates.push(evt.candidate);
				iceCandidatesDeferred.resolve(localIceCandidates);
			}
			peerConnection.onicecandidate = null;
		};

		peerConnection.onaddstream = function(stream) {
			if(typeof streamHandlers[p2p.id] === 'function') {
				streamHandlers[p2p.id](stream);
			} else {
				(function(stream) {
					console.log('Default stream handler of ' + p2p.id, stream);
				})(stream);
			}
		};

		return peerConnection;
	};

	liveConnection.on('CallerIceCandidatesEmitted', function(ev) {
		var p2pId = ev.p2pId;
		var connection = connections[p2pId];
		// connection.peerConnection.addIceCandidate
		if(!remoteIceCandidatesDeferred[p2pId]) {
			remoteIceCandidatesDeferred[p2pId] = $q.defer();
		}
		if(!remoteIceCandidatesPromises[p2pId]) {
			remoteIceCandidatesPromises[p2pId] = remoteIceCandidatesDeferred[p2pId].promise;
		}
		remoteIceCandidatesDeferred[p2pId].resolve(new RTCAPI.IceCandidate(ev.candidates[0]));
	});

	function setLocalDescription(peerConnection, offer) {
		var deferred = $q.defer();
		peerConnection.setLocalDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	function setRemoteDescription(peerConnection, offer) {
		var deferred = $q.defer();
		peerConnection.setRemoteDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, deferred.reject);
		return deferred.promise;
	}

	function createAnswer(peerConnection) {
		var deferred = $q.defer();
		peerConnection.createAnswer(deferred.resolve, function(error) {
			deferred.reject(new Error(error.message));
		});
		return deferred.promise;
	}

	function sendAnswerToCaller(p2pId, answer) {
		return liveConnection.wait('p2p:addAnswer', {
			p2pId: p2pId,
			answer: answer
		}).tap(function(p2p) {
			connections[p2pId].server = p2p;
		});
	}

var RTCCallee = {
	joinNewCaller: function(p2p, stream) {
		var localPeerConnection;
		return askForAcceptation(p2p).then(function() {
			return newPeerConnection(p2p);
		}).tap(function(peerConnection) {
			localPeerConnection = peerConnection;
			peerConnection.addStream(stream);
		}).tap(function(peerConnection) {
			return setRemoteDescription(peerConnection, p2p.offer);
		}).then(function(peerConnection) {
			return createAnswer(peerConnection).tap(function(answer) {
				return setLocalDescription(peerConnection, answer);
			});
		}).tap(function() {
			console.log('CHKPNT 0', localIceCandidatesPromises[p2p.id]);
			return localIceCandidatesPromises[p2p.id].then(function(candidates) {
				console.log('CHKPNT 1', candidates);
				liveConnection.emit('p2p:newCalleeIceCandidates', {
					candidates: candidates,
					p2pId: p2p.id
				});
			});
		}).then(function(answer) {
			return sendAnswerToCaller(p2p.id, answer);
		}).tap(function() {
			return remoteIceCandidatesPromises[p2p.id].tap(function(remoteIceCandidate) {
				console.log('remoteIceCandidate', remoteIceCandidate);
				localPeerConnection.addIceCandidate(remoteIceCandidate);
			});
		});
	},
	setStreamHandler: function(p2pId, handler) {
		streamHandlers[p2pId] = handler;
	}
};

	return RTCCallee;
}]);

lecturerOnline.factory('RTCCaller', ['$q', 'liveConnection', 'RTCAPI', 'conference', function RTCConnectionFactory($q, liveConnection, RTCAPI, conference) {
	var configuration = {
	    iceServers: [
	        {
	        	url: "stun:stun.l.google.com:19302"
	        }
	    ]
	};

	var p2pServer;
	var iceCandidatesDeferred = $q.defer();
	var localIceCandidates = [];
	iceCandidatesPromise = iceCandidatesDeferred.promise;

	var peerConnection = new RTCAPI.PeerConnection(configuration);
	
	var addStream = peerConnection.addStream.bind(peerConnection);

	peerConnection.onicecandidate = function(evt) {
		console.log('onicecandidate', evt);
		if(evt.candidate) {
			localIceCandidates.push(evt.candidate);
			iceCandidatesDeferred.resolve(localIceCandidates);
		}
		peerConnection.onicecandidate = null;
	};

	liveConnection.on('CalleeIceCandidatesEmitted', function(ev) {
		ev.candidates.forEach(function(candidate) {
			peerConnection.addIceCandidate(new RTCAPI.IceCandidate(candidate));
		});
	});

	var streamHandler = function(stream) {
		console.log('Default stream handler', stream);
	};

	peerConnection.onaddstream = function(stream) {
		streamHandler(stream);
	};

	function getOffer() {
		var deferred = $q.defer();
		peerConnection.createOffer(deferred.resolve, function(error) {
			deferred.reject(new Error(error.message));
		});
		return deferred.promise;
	}

	function setLocalDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setLocalDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, function(error) {
			deferred.reject(new Error(error.message));
		});
		return deferred.promise;
	}

	function setRemoteDescription(offer) {
		var deferred = $q.defer();
		peerConnection.setRemoteDescription(new RTCAPI.SessionDescription(offer), deferred.resolve, function(error) {
			deferred.reject(new Error(error.message));
		});
		return deferred.promise;
	}

	function demandP2PConnection(ev) {
		return liveConnection.wait('caller:demandP2PConnection', ev).tap(function(p2p) {
			p2pServer = p2p;
		});
	}

	var RTCCaller = {
		prepareP2POffer: function(stream) {
			peerConnection.addStream(stream);
			return getOffer().tap(function(offer) {
				return setLocalDescription(offer);
			}).then(function(offer) {
				return demandP2PConnection({
					conferenceUri: conference.conferenceInfo.uri,
					offer: offer
				});
			}).tap(function(p2p) {
					console.log('CHKPNT 0', iceCandidatesPromise);
				return iceCandidatesPromise.then(function(candidates) {
					console.log('CHKPNT 1', candidates);
					liveConnection.emit('p2p:newCallerIceCandidates', {
						candidates: candidates,
						p2pId: p2p.id
					});
				});
			});
		},
		establish: function(answer) {
			return setRemoteDescription(answer);
		},
		setStreamHandler: function(handler) {
			streamHandler = handler;
		}
	};

	return RTCCaller;
}]);

lecturerOnline.service('conference', ['liveConnection', function(liveConnection) {
	this.name;
	this.calleeName;
	this.conferenceInfo;
	var self = this;
	this.create = function() {
		return liveConnection.wait('callee:createConference', {
			calleeName: self.calleeName,
			conferenceName: self.name
		}).tap(function(result) {
			self.conferenceInfo = result;
		});
	}
	this.get = function(uri) {
		return liveConnection.wait('conference:get', {
			conferenceUri: uri
		}).tap(function(conference) {
			self.name = conference.name;
			self.calleeName = conference.callee.name;
			self.conferenceInfo = conference;
		});
	}
}]);

lecturerOnline.controller('MainPageCtrl', ['$scope', 'conference', '$location', function($scope, conference, $location) {
	$scope.submit = function() {
		conference.name = $scope.conferenceName;
		conference.calleeName = $scope.calleeName;
		$location.path('/conf');
	};
}]);



lecturerOnline.controller('CalleeCtrl', ['$scope', '$q', '$location', 'userMedia', 'conference', 'liveConnection', 'RTCCallee', function($scope, $q, $location, userMedia, conference, liveConnection, RTCCallee) {
	$scope.streamPromise = userMedia;
	$scope.conferenceName = conference.name;
	$scope.location = $location.$$protocol + '://' + $location.$$host + ':' + $location.$$port + '/conf/';
	var creationFinishedPromise = conference.create().tap(function() {
		$scope.conference = conference.conferenceInfo;
	}).done();
	liveConnection.on('P2PConnectionRequested', function(p2p) {
		console.log('p2p connection requested', p2p);
		$scope.streamPromise.then(function(stream) {
			return RTCCallee.joinNewCaller(p2p, stream);
		}).done();
	});
}]);

lecturerOnline.directive('camera', function() {
	return {
		templateUrl: '/js/player/view.html',
		link: function(scope, element, attr) {
			scope.streamPromise.tap(function(stream) {
				var video = element.find('video.camera');
				video.width('100%'); //TODO move to CSS
				var videoUrl = window.URL.createObjectURL(stream);
				video.attr('src', videoUrl);
				video[0].play();
			}).done();
		},
		scope: {
			streamPromise: '='
		}
	};
});

lecturerOnline.controller('CallerCtrl', ['$scope', '$q', '$routeParams', 'conference', 'RTCCaller', 'userMedia', 'liveConnection', function($scope, $q, $routeParams, conference , RTCCaller, userMedia, liveConnection) {
	$scope.localStreamPromise = userMedia;
	$scope.remoteStreamDeffered = $q.defer();
	$scope.remoteStreamPromise = $scope.remoteStreamDeffered.promise;
	$q.all([
		$scope.localStreamPromise,
		conference.get($routeParams.confUri)
	]).spread(function(stream, conference) {
		$scope.conference = conference;
		return RTCCaller.prepareP2POffer(stream);
	}).then(function (p2p) {
		$scope.p2p = p2p;
	}).done();

	liveConnection.on('P2PAnswerCame', function(p2p) {
		$scope.p2p = p2p;
		RTCCaller.establish(p2p.answer).done();
	});
	RTCCaller.setStreamHandler(function(remoteStreamEvent) {
		$scope.remoteStreamDeffered.resolve(remoteStreamEvent.stream);
	});
}]);
