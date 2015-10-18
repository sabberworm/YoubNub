function CommandList() {
	this.aliases = {};
}

CommandList.prototype.retrieveAllCommands = function(callback) {};
CommandList.prototype.retrieveByName = function(name, callback) {};

CommandList.prototype.allCommands = function(callback) {
	return this.retrieveAllCommands(callback);
};
CommandList.prototype.resolveAlias = function(alias) {
	var loopDetection = [];
	while(alias in this.aliases) {
		loopDetection.push(alias);
		alias = this.aliases[alias];
		if(loopDetection.indexOf(alias) > -1) {
			break;
		}
	}
	return alias;
};
CommandList.prototype.byName = function(name, callback) {
	name = this.resolveAlias(name);
	return this.retrieveByName(name, callback);
};
CommandList.prototype.aliasesFor = function(name) {
	var _this = this;
	return Object.keys(this.aliases).reduce(function(result, alias) {
		var original = _this.resolveAlias(_this.aliases[alias]);
		if(original === name) {
			result.push(alias);
		}
		return result;
	}, []);
};
CommandList.prototype.addAlias = function(alias, original) {
	this.aliases[alias] = original;
};

module.exports = CommandList;