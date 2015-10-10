var express = require('express');
var router = express.Router();
var commands = require('../commands');

var debug = require('debug')('YuppieNub:routes');

function updateLocals(req, res, next) {
	res.locals = res.locals || {};
	res.locals.user = req.models.user;
	res.locals.title = "YuppieNub";
	res.locals.userPrefix = req.models.user.name === req.models.globalUser.name ? '' : '/'+req.models.user.userId;
	next();
}

router.param('user', function(req, res, next, userId) {
	debug("Got user", userId);
	req.collections.users.findOne({userId: userId}, function(err, user) {
		if(err) {
			debug("User", userId, "could not be retrieved");
			return next(err);
		}
		debug('Got user object', user, userId);
		if(user) {
			req.models.user = user;
			return next();
		} else {
			req.collections.users.insertOne({userId: userId}, function(err, user) {
				if(err) {
					debug('User insertion error', err, userId);
					return next(err);
				}
				req.models.user = {userId: userId};
				res.locals.user
				debug('Created user', req.models.user);
				next();
			});
		}
	})
});

router.use(updateLocals);
router.param('user', updateLocals);

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', {});
});
router.get('/:user', function(req, res, next) {
	res.render('index', {});
});

function exec(req, res, next) {
	var q = req.body.q;
	var cmd = commands.parse(q, req.models.user, req.models.globalUser);
	list = commands.list(req.db, req.models.user, req.models.globalUser);
	list.byName(cmd.name, function(err, command) {
		if(err) {
			return next(err);
		}
		if(!command) {
			return res.render('message', {status: "Command not found", message: "The command "+cmd.name+" isn’t available."});
		}
		debug("Executing command", command.name, "with", cmd);
		command.getCommand(cmd.text, cmd.args, req, res, next, list)();
	});
}

router.post('/execute', exec);
router.post('/:user/execute', exec);

module.exports = router;
