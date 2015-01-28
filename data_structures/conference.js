var uuid = require('node-uuid');

var uriCreator = require('./uri_creator');

function Conference(name, callee) {
	this.id = uuid.v4();
	this.name = name || uuid.v4();
	this.uri = uriCreator.addNew(this.name);
	this.callee = callee;
	this.peerConnections = [];
}

Conference.prototype.simplify = function() {
	var self = this;
	return {
		id: self.id,
		uri: self.uri,
		name: self.name,
		callee: self.callee.simplify(),
		peerConnections: self.peerConnections.map(function(peerConnection) {
			return peerConnection.simplify();
		})
	};
};

module.exports = Conference;