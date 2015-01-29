var uuid = require('node-uuid');

function PeerConnection(callee, caller) {
	this.id = uuid.v4();
	this.callee = callee;
	this.caller = caller;
	this.offer = undefined;
	this.answer = undefined;
	this.iceCandidates = {
		callee: [],
		caller: []
	};
}

PeerConnection.prototype.simplify = function() {
	var self = this;
	return {
		id: self.id,
		callee: self.callee.simplify(),
		caller: self.caller.simplify(),
		offer: self.offer,
		answer: self.answer,
		iceCandidates: self.iceCandidates
	};
};

module.exports = PeerConnection;