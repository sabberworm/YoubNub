var async = require('async');
var debug = require('debug')('YoubNub:commands');
var parse = require('shell-quote').parse;

var CommandList = require('./command_list');
var InternalCommandList = require('./internal');
var ExternalCommandList = require('./external');

function UnifiedCommandList(lists) {
	CommandList.call(this);
	var _this = this;
	this.lists = lists;
	this.lists.forEach(function(list) {
		if(!list.aliases) {
			return;
		}
		for(var alias in list.aliases) {
			_this.aliases[alias] = list.aliases[alias];
		}
	});
}

UnifiedCommandList.prototype = Object.create(CommandList.prototype);

UnifiedCommandList.prototype.retrieveAllCommands = function(callback) {
	async.map(this.lists, function(item, callback) {
		item.retrieveAllCommands(callback);
	}, function(err, lists) {
		if(err) {
			return callback(err);
		}
		var result = {};
		lists.forEach(function(list) {
			list.forEach(function(command) {
				var name = command.name;
				if(name in result) {
					return;
				}
				result[name] = command;
			});
		});
		return callback(null, Object.keys(result).map(function(key) {
			return result[key];
		}));
	});
};
UnifiedCommandList.prototype.retrieveByName = function(name, callback) {
	async.map(this.lists, function(item, callback) {
		item.retrieveByName(name, callback);
	}, function(err, lists) {
		if(err) {
			return callback(err);
		}
		for(var i=0;i<lists.length;i++) {
			if(lists[i]) {
				debug('Mapped command by name', name, lists[i]);
				return callback(null, lists[i]);
			}
		}
		debug('Command not found for name', name);
		callback(null, null);
	});
};


exports.list = function(db, user, globalUser) {
	var internal = new InternalCommandList();
	var external = new ExternalCommandList(db, user, globalUser);
	return new UnifiedCommandList([internal, external]);
};

exports.parse = function(str, user, globalUser) {
	str = str.trim();
	words = parse(str, {USER: user.userId, GLOBAL_USER: globalUser.userId}).map(function(val) {
		if(typeof val === 'object') {
			return val.op;
		}
		return val;
	});
	debug('Got words', words, 'from string', str);
	var name = words.shift();
	var args = {};
	var argName = null;
	var text = '';
	words.forEach(function(word) {
		if(word.indexOf('-') === 0) {
			argName = word.substr(1);
		} else if(argName) {
			args[argName] = word;
			argName = null;
		} else {
			text += word + ' ';
		}
	});
	text = text.trim();
	return {
		name: name,
		args: args,
		text: text
	};
};