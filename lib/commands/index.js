var async = require('async');

var CommandList = require('./command_list');

var InternalCommandList = require('./internal');
var ExternalCommandList = require('./external');

function UnifiedCommandList(lists) {
	this.lists = lists;
}

UnifiedCommandList.prototype.allCommands = function(callback) {
	async.map(this.lists, function(item, callback) {
		item.allCommands(name, callback);
	}, function(err, lists) {
		if(err) {
			return callback(err);
		}
		var result = {};
		lists.forEach(function(list) {
			list.forEach(function(command) {
				if(name in result) {
					return;
				}
				result[name] = command;
			});
		});
		return callback(null, Object.values(result));
	});
};
UnifiedCommandList.prototype.byName = function(name, callback) {
	async.map(this.lists, function(item, callback) {
		item.byName(name, callback);
	}, function(err, lists) {
		if(err) {
			return callback(err);
		}
		for(var i=0;i<lists.length;i++) {
			if(lists[i]) {
				return callback(null, lists[i]);
			}
		}
	});
};


exports.list = function(db, user, globalUser) {
	var internal = new InternalCommandList();
	var external = new ExternalCommandList(db, user, globalUser);
	return new UnifiedCommandList([internal, external]);
};

exports.parse = function(str) {
	str = str.trim();
	words = str.split(/\s+/);
	var name = words.unshift();
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