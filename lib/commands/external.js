var async = require('async');
var debug = require('debug')('YoubNub:commands:external');

var ObjectID = require('mongodb').ObjectID;

var Command = require('./command');
function ExternalCommand(command) {
	this.command = command;
	this.href = command.href;
	var args = command.args || {};
	var argNames = {};
	var optionalArgs = {};
	for(var k in args) {
		var arg = args[k];
		if(!arg.required) {
			optionalArgs[k] = arg.defaultValue;
		}
		args[k] = arg.description;
	}
	Command.call(this, command.name, command.man||'', this.href.indexOf('%s') > -1 ? 1 : true, argNames, optionalArgs);
}
ExternalCommand.prototype = Object.create(Command.prototype);

ExternalCommand.prototype.getLevel = function(text, args, req, res, next, commands) {
	return this.command.user.equals(req.models.globalUser._id) ? 'global' : 'local';
};

ExternalCommand.prototype.prepareHref = function(text, args, req, res, next, commands) {
	return this.href.replace(/%s/g, encodeURIComponent(text));
}

ExternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	var href = this.prepareHref.apply(this, arguments);
	return function redirect() {
		res.redirect(href);
	};
};

ExternalCommand.prototype.preview = function(text, args, req, res, next, commands) {
	this.prepareArgs.apply(this, arguments);
	var href = this.prepareHref.apply(this, arguments);
	res.render('message', {status: 'Command '+this.name, message: 'redirects to: '+JSON.stringify(href)});
};

var CommandList = require('./command_list');
function ExternalCommandList(db, user, globalUser) {
	CommandList.call(this);
	var _this = this;
	this.db = db;
	this.user = user;
	this.globalUser = globalUser;
	[this.user, this.globalUser].forEach(function(user) {
		if(!user.aliases) {
			return;
		}
		for(var alias in user.aliases) {
			_this.aliases[alias] = user.aliases[alias];
		}
	});
}
ExternalCommandList.prototype = Object.create(CommandList.prototype);

ExternalCommandList.prototype.retrieveAllCommands = function(callback) {
	var _this = this;
	// Get local commands
	_this.db.collection('commands').find({user: _this.user._id}).toArray(function(error, localCommands) {
		if(error) {
			return callback(error);
		}
		var localNames = localCommands.map(function(command) {
			return command.name;
		})
		// Get global commands
		_this.db.collection('commands').find({name: {$not: {$in: localNames}}, user: _this.globalUser._id}).toArray(function(error, commands) {
			if(error) {
				return callback(error);
			}
			commands = localCommands.concat(commands);
			debug('Found external commands', commands, error);
			callback(null, commands.map(function(command) {
				var cmd = new ExternalCommand(command);
				debug('Create external command', command, cmd);
				return cmd;
			}));
		});
	});
};

ExternalCommandList.prototype.retrieveByName = function(name, callback) {
	var _this = this;
	// Find it as local
	_this.db.collection('commands').findOne({name: name, user: _this.user._id}, function(error, command) {
		if(error) {
			return callback(error);
		}
		if(command) {
			return callback(null, new ExternalCommand(command));
		}
		// Try a global command instead
		_this.db.collection('commands').findOne({name: name, user: _this.globalUser._id}, function(error, command) {
			if(error) {
				return callback(error);
			}
			if(!command) {
				return callback(null);
			}
			return callback(null, new ExternalCommand(command));
		});
	});
};

module.exports = ExternalCommandList;