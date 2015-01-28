var clients = require('../data_structures/clients');
var Conference = require('../data_structures/conference');

var callees = {};
var callers = {};

//TODO Error handling & safety
module.exports = function(io, conferences) {
	io.route('conference', {
		list: function(req) {
			var conferenceList = [];
			var current;
			for(var conferenceUri in conferences) {
				current = conferences[conferenceUri];
				conferenceList.push(conference.simplify());
			}
			req.io.emit('conference:list|response', conferenceList);
		},
		get: function(req) {
			req.io.emit('conference:get|response', conferences[req.data.conferenceUri].simplify())
		}
	});

	io.route('callee', {
		createConference: function(req) {
			var localIo = req.io;
			var calleeName = req.data.calleeName;
			var conferenceName = req.data.conferenceName;
			var callee = new clients.Callee(calleeName, localIo);
			callees[callee.id] = callee;
			var conference = new Conference(conferenceName, callee);
			conferences[conference.uri] = conference;
			req.io.emit('callee:createConference|response', conference.simplify());
		},
		sendOffer: function(req) {
			var calleeId = req.data.calleeId;
			var callee = callees[calleeId];
			callee.offer = req.data.offer;
		    req.io.emit('callee:sendOffer|response', callee); 
		},
		newIceCandidate: function(req) {
			var calleeId = req.data.calleeId;
			var callee = callees[calleeId];
			callee.iceCandidates.push(req.data.candidate);
		},
		// getCallerIceCandidates: function(req) {
		// 	req.io.emit('callee:getCallerIceCandidates|response', candidates.caller[req.data.offerId]);
		// }
	});

	// io.route('caller', {
	// 	demandOffer: function(req) {
	// 		console.log('CHKPNT demandOffer');
	// 		var offer_id = req.data;
	// 		var offer = offers[offer_id];
	// 		offers[offer_id].returnReq = req;
	// 		req.io.emit('caller:demandOffer|response', offer.data.sdp);
	// 	},
	// 	pushAnswer: function(req) {
	// 		console.log('CHKPNT pushAnswer');
	// 		offers[req.data.talkId].io.emit('receiveTheAnswer', req.data.answer);
	// 	    req.io.emit('caller:pushAnswer|response', true);
	// 	},
	// 	newIceCandidate: function(req) {
	// 		console.log('CHKPNT caller:newIceCandidate', req.data.candidate);
	// 		if(!Array.isArray(candidates.caller[req.data.offerId])) {
	// 			candidates.caller[req.data.offerId] = [];
	// 		}
	// 		candidates.caller[req.data.offerId].push(req.data.candidate);
	// 	},
	// 	getCalleeIceCandidates: function(req) {
	// 		req.io.emit('callee:getCalleeIceCandidates|response', candidates.callee[req.data.offerId]);
	// 	}
	// })
};