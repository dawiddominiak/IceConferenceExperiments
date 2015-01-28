var uuid = require('node-uuid');

function PeerConnection(callee, caller) {
	this.id = uuid.v4();
	this.callee = callee;
	this.caller = caller;
}

PeerConnection.prototype.simplify = function() {
	var self = this;
	return {
		callee: self.callee.simplify(),
		caller: self.caller.simplify()
	};
};

module.exports = PeerConnection;