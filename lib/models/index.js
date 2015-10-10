var MongoClient = require('mongodb').MongoClient;

var debug = require('debug')('YuppieNub:models');

function prepareDb(db, users, commands) {
	// Create user name index
	users.indexExists('UserID', function(err, exists) {
		if(!exists) {
			users.createIndex({userId: 1}, {unique: true, name: "UserID"}, function(err, result) {
				debug('Created index on users', err, result);
			});
		}
	});
	// Create global user
	users.count({userId: "global"}, function(err, count) {
		if(!count) {
			users.insertOne({userId: "global"}, function(err, user) {
				debug('Created global user', err, user);
			});
		}
	});
	// Create index over command names
	commands.indexExists('CommandNamePerUser', function(err, exists) {
		if(!exists) {
			commands.createIndex({name: 1, user: 1}, {unique: true, name: "CommandNamePerUser"}, function(err, result) {
				debug('Created index on commands', err, result);
			});
		}
	});
	
}

module.exports = function(app, config) {
	config = config || {};
	
	var db, users, commands;
	
	MongoClient.connect(app.get('database url'), function(err, mDb) {
		debug("DB opened");
		if(err) {
			debug("Error", err);
		}
		db = mDb;
		users = db.collection('users', {autoIndexId: true});
		commands = db.collection('commands', {autoIndexId: true});
		prepareDb(db, users, commands);
	});

	return function middleware(req, res, next) {
		req.db = db;
		req.collections = {
			users: users,
			commands: commands
		};
		req.models = {};
		users.findOne({userId: 'global'}, function(err, user) {
			if(err) {
				return next(err);
			}
			req.models.user = user;
			req.models.globalUser = user;
			next();
		});
	};
};