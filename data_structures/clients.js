var uuid = require('node-uuid');

function Client(name, io) {
	this.id = uuid.v4();
	this.name = name;
	this.io = io;
	this.iceCandidates = [];
}

Client.prototype.simplify = function() {
	var self = this;
	return {
		id: self.id,
		name: self.name,
		hasIO: !!self.io,
		iceCandidates: self.iceCandidates
	};
};

function Callee(name, io) {
	Client.apply(this, arguments);
	this.offer;
}
Callee.prototype = Object.create(Client.prototype);

function Caller(name, io) {
	Client.apply(this, arguments);
	this.answer;
}
Caller.prototype = Object.create(Client.prototype);

module.exports = {
	'Callee': Callee,
	'Caller': Caller
};