var crypto = require('crypto');
var fs = require('fs');
var debug = require('debug')('YoubNub:commands:internal');

var ObjectID = require('mongodb').ObjectID;

var Command = require('./command');

function InternalCommand(name, man, hasText, argNames, optionalArgs, allowsPost, callback) {
	Command.call(this, name, man, hasText, argNames, optionalArgs, allowsPost);
	this.callback = callback;
}
InternalCommand.prototype = Object.create(Command.prototype);

InternalCommand.prototype.prepareCommand = function(text, args, req, res, next, commands) {
	return this.callback.bind(this, text, args, req, res, next, commands);
};

InternalCommand.prototype.getLevel = function(text, args, req, res, next, commands) {
	return 'builtin';
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
	this.allowsPost = false;
}

CommandBuilder.prototype.man = function(man) {
	this.manual = man;
	return this;
};

CommandBuilder.prototype.text = function(hasText) {
	this.hasText = hasText;
	return this;
};

CommandBuilder.prototype.post = function(allowsPost) {
	this.allowsPost = !!allowsPost;
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
	debug('Creating internal command with', this.name, this.manual, this.hasText, this.argNames, this.optionalArgs, this.allowsPost);
	commands[this.name] = new InternalCommand(this.name, this.manual, this.hasText, this.argNames, this.optionalArgs, this.allowsPost, callback);
};

CommandBuilder('user.edit')
	.man("Creates a new or edits an existing YoubNub user.\n\nText passed will be the user’s name.")
	.arg('id', 'The user ID. Will be randomly assigned if not given.', null)
	.arg('name', 'The new name to give the user.', null)
	.text(true)
	.post(true)
	.create(function(text, args, req, res, next, commands) {
		if(req.body.post === 'from_edit') {
			var update = {};
			['userId', 'name', 'aliases', 'envs', 'hashedEmail'].forEach(function(type) {
				if(type in req.body) {
					update[type] = req.body[type];
				}
			});
			if(update.userId === 'global') {
				return next(new Error('The global user can not be edited'))
			}
			var query = {userId: update.userId};
			if(req.body._id) {
				query = {_id: new ObjectID(req.body._id)};
			}
			req.collections.users.updateOne(query, {$set: update}, {upsert: true}, function(error, result) {
				if(error) {
					return next(error);
				}
				if(!result.matchedCount) {
					return res.render('message', {status: "Invalid user "+req.body._id, message: "User "+update.userId+" could not be updated."});
				}
				res.redirect('/'+update.userId);
			});
		} else {
			var id = args.id;
			if(id === 'global') {
				return next(new Error('The global user can not be edited'))
			}
			req.collections.users.findOne({userId: id}, function(error, user) {
				var isUpdate = !!user;
				if(error) {
					return next(error);
				}
				user = user || {};
				if(args.name || text) {
					user.name = args.name || text;
				}
				if(args.id) {
					user.userId = args.id;
				}
				function render() {
					return res.render('user_edit', {edit: user, isUpdate: isUpdate});
				}
				if(user.userId) {
					return render();
				} else {
					crypto.pseudoRandomBytes(16, function(error, bytes) {
						user.userId = bytes.toString('base64').replace(/[=\/+]+/g, '');
						return render();
					});
				}
			})
		}
	});

CommandBuilder('user.view')
	.man("Views user info.")
	.arg('id', 'The user’s id. Can be passed via text as well', null)
	.text(true)
	.create(function(text, args, req, res, next, commands) {
		var id = args.id || text;
		if(!id) {
			return res.render('message', {status: "No ID given", message: "Command requires an ID either via text or -id."});
		}
		req.collections.users.findOne({userId: id}, function(error, user) {
			if(error) {
				return next(error);
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

CommandBuilder('command.edit')
	.man("Opens the form to edit or create a command. Pass the name of the command to edit.\n\nIf logged in, the command created will be local, global otherwise.\n\nWhen editing a global command, the resulting command will _shadow_ the global one.")
	.text(true)
	.create(function(text, args, req, res, next, commands) {
		commands.byName(text, function(error, command) {
			if(error) {
				return next(error);
			}
			if(!command) {
				return res.render('message', {status: "Invalid command", message: "Command "+text+" not found."});
			}
			var level = command.getLevel(text, args, req, res, next, commands);
			if(level === 'internal') {
				return res.render('message', {status: "Cannot edit/shadow internal command", message: "Command "+command.name+" is internal."});
			}
			// if(command.command)
			res.render('man', {command: command, aliases: commands.aliasesFor(command.name), level: command.getLevel(text, args, req, res, next, commands)});
		});
	});

CommandBuilder('ls')
	.man("Lists all commands.")
	.text(false)
	.create(function(text, args, req, res, next, commands) {
		commands.allCommands(function(error, commands) {
			if(error) {
				return next(error);
			}
			res.render('ls', {commands: commands});
		});
	});

CommandBuilder('man')
	.man("Open command man page.")
	.text(1)
	.create(function(text, args, req, res, next, commands) {
		if(text === 'youbnub') {
			return fs.readFile(__dirname+'/../../README.md', {encoding: 'utf-8'}, function(error, readme) {
				if(error) {
					return next(error);
				}
				return res.render('man', {
					command: {
						name: res.locals.title,
						man: readme,
						hasText: false,
						argNames: {}
					},
					aliases: [],
					level: 'none'
				});
			});
		}
		commands.byName(text, function(error, command) {
			if(error) {
				return next(error);
			}
			if(!command) {
				return res.render('message', {status: "Invalid command", message: "Command "+text+" not found."});
			}
			res.render('man', {command: command, aliases: commands.aliasesFor(command.name), level: command.getLevel(text, args, req, res, next, commands)});
		});
	});

CommandBuilder('preview')
	.man("Preview what a command does.")
	.text(true)
	.create(function(text, args, req, res, next, commands) {
		text = text.split(/\s+/);
		commands.byName(text.shift(), function(error, command) {
			if(error) {
				return next(error);
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
	this.addAlias('command.create', 'command.edit');
	this.addAlias('user.create', 'user.edit');
	this.addAlias('new', 'command.edit');
}
InternalCommandList.prototype = Object.create(CommandList.prototype);

InternalCommandList.prototype.retrieveAllCommands = function(callback) {
	callback(null, Object.keys(commands).map(function(key) {
		return commands[key];
	}));
};

InternalCommandList.prototype.retrieveByName = function(name, callback) {
	debug("Searching command", name, 'have', Object.keys(commands));
	callback(null, commands[name]);
};

module.exports = InternalCommandList;