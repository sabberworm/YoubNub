var crypto = require('crypto');
var debug = require('debug')('YoubNub:commands');

var Command = require('./command');
function InternalCommand(name, man, hasText, argNames, optionalArgs, requiresPost, callback) {
	Command.call(this, name, man, hasText, argNames, optionalArgs, requiresPost);
	this.callback = callback;
}
InternalCommand.prototype = Object.create(Command.prototype);

InternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	return this.callback.bind(this, text, args, req, res, next, commands);
};

var commands = {};

function CommandBuilder(name) {
	if(!(this instanceof CommandBuilder)) {
		return new CommandBuilder(name);
	}
	this.name = name;
	this.manual = "";
	this.hasText = 1;
	this.argNames = {};
	this.optionalArgs = {};
	this.requiresPost = false;
}

CommandBuilder.prototype.man = function(man) {
	this.manual = man;
	return this;
};

CommandBuilder.prototype.text = function(hasText) {
	this.hasText = hasText;
	return this;
};

CommandBuilder.prototype.post = function(requiresPost) {
	this.requiresPost = !!requiresPost;
	return this;
};

CommandBuilder.prototype.arg = function(name, description, defaultValue) {
	this.argNames[name] = description;
	if(arguments.length > 2) {
		this.optionalArgs[name] = defaultValue;
	}
	return this;
};

CommandBuilder.prototype.create = function(callback) {
	debug('Creating internal command with', this.name, this.manual, this.hasText, this.argNames, this.optionalArgs, this.requiresPost);
	commands[this.name] = new InternalCommand(this.name, this.manual, this.hasText, this.argNames, this.optionalArgs, this.requiresPost, callback);
};

CommandBuilder('user.create')
	.man("Creates a new YoubNub user. Text passed will be the user’s name.")
	.text(true)
	.arg('id', 'The user id. Will be randomly assigned if not given.', null)
	.create(function(text, args, req, res, next, commands) {
		var id = String(args.id||"").trim().replace(/\//g, '');
		function insert() {
			req.collections.users.insertOne({userId: id, name: text}, function(err, user) {
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
				id = bytes.toString('base64').replace(/[=\/]+/g, '');
				insert();
			});
		} else {
			insert();
		}
	});

CommandBuilder('user.edit')
	.man("Edits an existing YoubNub user.")
	.arg('id', 'The user’s id.')
	.text(false)
	.post(true)
	.arg('name', 'The new name to give the user.', null)
	.create(function(text, args, req, res, next, commands) {
		var id = args.id;
		if(id === 'global') {
			return next(new Error('The global user can not be edited'))
		}
		var userProps = {};
		if(args.name) {
			userProps.name = args.name;
		}
		req.collections.users.updateOne({userId: id}, {$set: userProps}, function(err, user) {
			if(err) {
				return next(err);
			}
			res.redirect('/'+id);
		});
	});

CommandBuilder('user.view')
	.man("Views user info.")
	.arg('id', 'The user’s id. Can be passed via text as well', null)
	.text(true)
	.create(function(text, args, req, res, next, commands) {
		var id = args.id || text;
		if(!id) {
			return next(new Error('No ID given'));
		}
		req.collections.users.findOne({userId: id}, function(err, user) {
			if(err) {
				return next(err);
			}
			res.render('user', {status: "User Info: "+id, object: user, props: {
				_id: {
					name: "Internal ID"
				},
				userId: {
					name: "User ID"
				},
				name: {
					name: "User name"
				}
			}});
		});
	});

CommandBuilder('ls')
	.man("Lists all commands.")
	.text(false)
	.create(function(text, args, req, res, next, commands) {
		commands.allCommands(function(err, commands) {
			if(err) {
				return next(err);
			}
			res.render('ls', {commands: commands});
		});
	});

CommandBuilder('man')
	.man("Open command man page.")
	.text(1)
	.create(function(text, args, req, res, next, commands) {
		commands.byName(text, function(err, command) {
			if(err) {
				return next(err);
			}
			if(!command) {
				return res.render('message', {status: "Invalid command", message: "Command "+text+" not found."});
			}
			res.render('man', {command: command});
		});
	});

CommandBuilder('preview')
	.man("Preview what a command does.")
	.text(true)
	.create(function(text, args, req, res, next, commands) {
		text = text.split(/\s+/);
		commands.byName(text.shift(), function(err, command) {
			if(err) {
				return next(err);
			}
			if(!command) {
				return res.render('message', {status: "Invalid command", message: "Command "+text+" not found."});
			}
			command.preview(text.join(' '), args, req, res, next, commands);
		});
	});

var CommandList = require('./command_list');
function InternalCommandList() {
	CommandList.call(this);
}
InternalCommandList.prototype = Object.create(CommandList.prototype);

InternalCommandList.prototype.allCommands = function(callback) {
	callback(null, Object.keys(commands).map(function(key) {
		return commands[key];
	}));
};

InternalCommandList.prototype.byName = function(name, callback) {
	debug("Searching command", name, 'have', Object.keys(commands));
	callback(null, commands[name]);
};

module.exports = InternalCommandList;