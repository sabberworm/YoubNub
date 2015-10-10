var async = require('async');

var Command = require('./command');
function ExternalCommand(command) {
	this.command = command;
	this.href = command.href;
	Command.call(this, command.name, command.man, this.href.indexOf('%s') > -1);
}
ExternalCommand.prototype = Object.create(Command.prototype);

ExternalCommand.prototype.prepareArgNames = function(text, args, req, res, next, commands) {
	if(this.argNames) {
		return;
	}
	this.argNames = {};
	// FIXME: Do we keep a list of arguments in the doc? Or do we parse it from the URL like yubnub?
};

ExternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	var href = this.href;
	return function redirect() {
		res.redirect(href);
	};
};

var CommandList = require('./command_list');
function ExternalCommandList(db, user, globalUser) {
	this.db = db;
	this.user = user;
	this.globalUser = globalUser;
	CommandList.call(this);
}
ExternalCommandList.prototype = Object.create(CommandList.prototype);

ExternalCommandList.prototype.allCommands = function(callback) {
	this.db.collection('commands').find({$or: [{user: this.user}, {user: this.globalUser}]}, function(error, commands) {
		if(error) {
			return callback(error);
		}
		callback(null, commands.map(function(command) {
			return new ExternalCommand(command);
		}));
	});
};

ExternalCommandList.prototype.byName = function(name, callback) {
	this.db.collection('commands').findOne({name: name}, function(error, command) {
		if(error) {
			return callback(error);
		}
		return callback(null, new ExternalCommand(command));
	});
};

module.exports = ExternalCommandList;