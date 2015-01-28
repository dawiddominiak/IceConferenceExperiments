module.exports = {
	_current: [],
	addNew: function(name) {
		var camelsifiedUniqueName = this._nameGenerator(name);
		console.log(this._current);
		this._current.push(camelsifiedUniqueName);
		return camelsifiedUniqueName;
	},
	_nameGenerator: function(name) {
		var i = 0;
		var camelsified = this._camelsify(name);
		var unique;
		do {
			if(i === 0) {
				unique = camelsified;
			} else {
				unique = camelsified + i;
			}
			i++;
		} while(this._current.indexOf(unique) >= 0); //TODO do better complexity
		return unique;
	},
	_camelsify: function(string) {
		var self = this;
		return string.split(/\W+/i).map(function(element) {
			return self._upperCaseFirst(element);
		}).join('');
	},
	_upperCaseFirst: function(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
};