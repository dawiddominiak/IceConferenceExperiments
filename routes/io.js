
module.exports = function(io, offers) {
	io.route('callee', {
		sendOffer: function(req) {
			offers[req.data.uri] = req.data.sdp;
		    req.io.emit('callee:sendOffer|response', true);
		}
	});
};