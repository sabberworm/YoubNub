var debug = require('debug')('YuppieNub:commands');

function Command(name, man, hasText, argNames, requiredArgs) {
	this.name = name;
	this.man = man;
	this.hasText = hasText;
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
			next(new Error('Argument ' + key + ' required for command ' + this.name));
			return function() {};
		}
		args[key] = this.requiredArgs[key];
	}
	if(!text && this.hasText === 1) {
		next(new Error('No text content given for command ' + this.name));
		return function() {};
	} else if(text && !this.hasText) {
		next(new Error('Text '+text+' given but command ' + this.name + ' requires no text'));
		return function() {};
	}
	return this.prepareCommand.apply(this, arguments);
};

module.exports = Command;