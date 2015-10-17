var debug = require('debug')('YoubNub:commands');

function Command(name, man, hasText, argNames, optionalArgs, requiresPost) {
	this.name = name;
	this.man = man;
	this.hasText = hasText;
	this.argNames = argNames;
	this.optionalArgs = optionalArgs;
	this.requiresPost = requiresPost;
};

Command.prototype.prepareArgNames = function(text, args, req, res, next, commands) {
	this.argNames = this.argNames || {};
	this.optionalArgs = this.optionalArgs || {};
};

Command.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	return function doNothing() {};
};

Command.prototype.prepareArgs = function(text, args, req, res, next, commands) {
	this.prepareArgNames.apply(this, arguments);
	for(var key in this.argNames) {
		if(key in args) {
			continue;
		}
		if(!(key in this.optionalArgs)) {
			next(new Error('Argument ' + key + ' required for command ' + this.name));
			return function() {};
		}
		args[key] = this.optionalArgs[key];
	}
	if(!text && this.hasText === 1) {
		next(new Error('No text content given for command ' + this.name));
		return function() {};
	} else if(text && !this.hasText) {
		next(new Error('Text '+text+' given but command ' + this.name + ' requires no text'));
		return function() {};
	} else {
		args.__text = text;
	}
};

Command.prototype.getCommand = function(text, args, req, res, next, commands) {
	this.prepareArgs.apply(this, arguments);
	return this.prepareCommand.apply(this, arguments);
};

Command.prototype.getLevel = function(text, args, req, res, next, commands) {
	return 'abstract';
};

Command.prototype.preview = function(text, args, req, res, next, commands) {
	this.prepareArgs.apply(this, arguments);
	res.render('message', {status: 'Preview of '+this.name, message: 'Arguments passed to command: '+JSON.stringify(args)});
};

module.exports = Command;