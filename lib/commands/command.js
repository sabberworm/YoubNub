var debug = require('debug')('YuppieNub:commands');

function Command(name, man, hasText, argNames, requiredArgs) {
	this.name = name;
	this.man = man;
	this.hasText = !!hasText;
	this.argNames = argNames;
	this.requiredArgs = requiredArgs;
};

Command.prototype.prepareArgNames = function(text, args, req, res, next, commands) {
	this.argNames = this.argNames || {};
	this.requiredArgs = this.requiredArgs || {};
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
		if(key in this.requiredArgs) {
			return next(new Error('Argument ' + key + ' required for command ' + this.name));
		}
		args[key] = this.requiredArgs[key];
	}
	return this.prepareCommand.apply(this, arguments);
};

module.exports = Command;