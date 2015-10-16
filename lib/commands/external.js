var async = require('async');

var Command = require('./command');
function ExternalCommand(command) {
	this.command = command;
	this.href = command.href;
	var args = command.args || {};
	for(var k in args) {
		
	}
	Command.call(this, command.name, command.man, this.href.indexOf('%s') > -1 ? 1 : true);
}
ExternalCommand.prototype = Object.create(Command.prototype);

ExternalCommand.prototype.prepareHref = function(text, args, req, res, next, commands) {
	return this.href;
}

ExternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	var href = this.prepareHref.apply(this, text, args, req, res, next, commands);
	return function redirect() {
		res.redirect(href);
	};
};

ExternalCommand.prototype.preview = function(text, args, req, res, next, commands) {
	this.prepareArgs.apply(this, arguments);
	var href = this.prepareHref.apply(this, text, args, req, res, next, commands);
	res.render('message', {status: 'Command '+this.name, message: 'redirects to: '+JSON.stringify(href)});
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
		if(!command) {
			return callback(null);
		}
		return callback(null, new ExternalCommand(command));
	});
};

module.exports = ExternalCommandList;