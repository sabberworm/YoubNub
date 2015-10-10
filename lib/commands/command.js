function Command(name, man, hasText, argNames) {
	this.name = name;
	this.man = man;
	this.hasText = !!hasText;
	this.argNames = argNames;
};

Command.prototype.prepareArgNames = function(text, args, req, res, next, commands) {
	this.argNames = this.argNames || {};
};

Command.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	return function doNothing() {};
};

Command.prototype.getCommand = function(text, args, req, res, next, commands) {
	this.prepareArgNames.apply(this, arguments);
	for(var key in this.argNames) {
		if(key in args) {
			continue;
		}
		if(!('_default') in this.argNames[key]) {
			throw new Error('Argument ' + key + ' required for command ' + this.name);
		}
		args[key] = this.argNames[key]['_default'];
	}
	return this.prepareCommand.apply(this, arguments);
};

module.exports = Command;