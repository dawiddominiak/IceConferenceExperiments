
module.exports = function(io, offers, candidates) {
	io.route('callee', {
		sendOffer: function(req) {
			offers[req.data.uri] = req;
		    req.io.emit('callee:sendOffer|response', true);
		},
		newIceCandidate: function(req) {
			console.log('CHKPNT callee:newIceCandidate');
			if(!Array.isArray(candidates.callee[req.data.offerId])) {
				candidates.callee[req.data.offerId] = [];
			}
			candidates.callee[req.data.offerId].push(req.data.candidate);
		},
		getCallerIceCandidates: function(req) {
			req.io.emit('callee:getCallerIceCandidates|response', candidates.caller[req.data.offerId]);
		}
	});

	io.route('caller', {
		demandOffer: function(req) {
			console.log('CHKPNT demandOffer');
			var offer_id = req.data;
			var offer = offers[offer_id];
			offers[offer_id].returnReq = req;
			req.io.emit('caller:demandOffer|response', offer.data.sdp);
		},
		pushAnswer: function(req) {
			console.log('CHKPNT pushAnswer');
			offers[req.data.talkId].io.emit('receiveTheAnswer', req.data.answer);
		    req.io.emit('caller:pushAnswer|response', true);
		},
		newIceCandidate: function(req) {
			console.log('CHKPNT caller:newIceCandidate', req.data.candidate);
			if(!Array.isArray(candidates.caller[req.data.offerId])) {
				candidates.caller[req.data.offerId] = [];
			}
			candidates.caller[req.data.offerId].push(req.data.candidate);
		},
		getCalleeIceCandidates: function(req) {
			req.io.emit('callee:getCalleeIceCandidates|response', candidates.callee[req.data.offerId]);
		}
	})
};