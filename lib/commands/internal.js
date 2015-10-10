var crypto = require('crypto');

var Command = require('./command');
function InternalCommand(name, man, hasText, argNames, callback) {
	Command.call(this, name, man, hasText, argNames);
	this.callback = callback;
}
InternalCommand.prototype = Object.create(Command.prototype);

InternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	return this.callback.bind(text, args, req, res, next, commands);
};

var commands = {};

function CommandBuilder(name) {
	if(!(this instanceof CommandBuilder)) {
		return new CommandBuilder(name);
	}
	this.name = name;
	this.manual = "";
	this.hasText = true;
	this.argNames = {};
}

CommandBuilder.prototype.man = function(man) {
	this.manual = man;
	return this;
};

CommandBuilder.prototype.text = function(hasText) {
	this.hasText = !!hasText;
	return this;
};

CommandBuilder.prototype.arg = function(name, description, defaultValue) {
	this.argNames[name] = description;
	if(arguments.length > 2) {
		this.argNames[name]._default = defaultValue;
	}
	return this;
};

CommandBuilder.prototype.create = function(callback) {
	commands[this.name] = new InternalCommand(this.name, this.man, this.hasText, this.argNames, callback);
};

CommandBuilder('user.create')
	.man("Creates a new YuppieNub user.")
	.arg('id', 'The user id. Will be randomly assigned if not given.', null)
	.create(function(text, args, req, res, next, commands) {
		var id = String(args.id||"").trim().replace(/\//g, '');
		function insert() {
			req.models.collections.users.insertOne({userId: id, name: text}, function(err, user) {
				if(err) {
					return next(err);
				}
				res.redirect('/'+id);
			});
		}
		if(!id) {
			crypto.pseudoRandomBytes(16, function(err, bytes) {
				if(err) {
					return next(err);
				}
				id = bytes.toString('base64');
				insert();
			});
		} else {
			insert();
		}
	});

CommandBuilder('user.edit')
	.man("Edits an existing YuppieNub user.")
	.arg('id', 'The users’id.')
	.arg('name', 'The new name to give the user.', null)
	.create(function(text, args, req, res, next, commands) {
		var id = arguments.id;
		if(id === 'global') {
			return next(new Error('The global user can not be edited'))
		}
		var userProps = {};
		if(args.name) {
			userProps.name = args.name;
		}
		req.models.collections.users.updateOne({userId: id}, {$set: userProps}, function(err, user) {
			if(err) {
				return next(err);
			}
			res.redirect('/'+id);
		});
	});

CommandBuilder('ls')
	.man("Lists all commands.")
	.create(function(text, args, req, res, next, commands) {
		commands.allCommands(function(err, commands) {
			if(err) {
				return next(err);
			}
			res.render('ls', {commands: commands});
		});
	});

var CommandList = require('./command_list');
function InternalCommandList() {
	CommandList.call(this);
}
InternalCommandList.prototype = Object.create(CommandList.prototype);

InternalCommandList.prototype.allCommands = function(callback) {
	callback(null, Object.values(commands));
};

InternalCommandList.prototype.byName = function(name, callback) {
	callback(null, commands[name]);
};

module.exports = InternalCommandList;