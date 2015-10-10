var express = require('express');
var router = express.Router();
var commands = require('../commands');

var debug = require('debug')('YuppieNub:routes');

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
				debug('Created user', req.models.user);
				next();
			});
		}
	})
});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'YuppieNub', user: req.models.user });
});
router.post('/execute', function(req, res, next) {
	console.log(req.query);
	var q = req.query.q;
	var cmd = commands.parse(q);
	res.send(cmd);
});
router.get('/user/create', function(req, res, next) {
	res.redirect('/'+user.userId);
});
router.get('/:user', function(req, res, next) {
  res.render('index', { title: 'YuppieNub', user: req.models.user });
});

module.exports = router;
