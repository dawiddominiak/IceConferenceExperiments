
module.exports = function(io, offers) {
	io.route('callee', {
		sendOffer: function(req) {
			offers[req.data.uri] = req.data.sdp;
		    req.io.emit('callee:sendOffer|response', true);
		}
	});

	io.route('caller', {
		demandOffer: function(req) {
			console.log('CHKPNT demandOffer');
			var offer_id = req.data;
			var offer = offers[offer_id];
			console.log('CHKPNT 2', offer);
			req.io.emit('caller:demandOffer|response', offer);
		}
	})
};