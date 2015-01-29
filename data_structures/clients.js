var uuid = require('node-uuid');

function Client(name, io) {
	this.id = uuid.v4();
	this.name = name;
	this.io = io;
}

Client.prototype.simplify = function() {
	var self = this;
	return {
		id: self.id,
		name: self.name,
		hasIO: !!self.io
	};
};

function Callee(name, io) {
	Client.apply(this, arguments);
}
Callee.prototype = Object.create(Client.prototype);

function Caller(name, io) {
	Client.apply(this, arguments);
}
Caller.prototype = Object.create(Client.prototype);

module.exports = {
	'Callee': Callee,
	'Caller': Caller
};