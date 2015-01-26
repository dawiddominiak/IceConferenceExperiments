
module.exports = function(io, offers, answers) {
	io.route('callee', {
		sendOffer: function(req) {
			offers[req.data.uri] = req;
		    req.io.emit('callee:sendOffer|response', true);
		}
	});

	io.route('caller', {
		demandOffer: function(req) {
			console.log('CHKPNT demandOffer');
			var offer_id = req.data;
			var offer = offers[offer_id];
			req.io.emit('caller:demandOffer|response', offer.data.sdp);
		},
		pushAnswer: function(req) {
			console.log('CHKPNT pushAnswer');
			offers[req.data.talkId].io.emit('receiveTheAnswer', req.data.answer);
		    req.io.emit('caller:pushAnswer|response', true);
		}
	})
};