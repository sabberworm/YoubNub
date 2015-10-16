var express = require('express');
var router = express.Router();
var commands = require('../commands');

var xmlbuilder = require('xmlbuilder');

var debug = require('debug')('YoubNub:routes');
var markdown = require('markdown');

function updateLocals(req, res, next) {
	res.locals = res.locals || {};
	res.locals.user = req.models.user;
	res.locals.title = "YoubNub";
	res.locals.userPrefix = req.models.user.name === req.models.globalUser.name ? '' : '/'+req.models.user.userId;
	res.locals.md = markdown.parse;
	res.locals.prefill = req.query.prefill;
	res.locals.host = req.hostname;
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
			// Fallback case (user is unknown) → create a new user on the fly
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

// Get open search descriptor
router.get('/:user?/opensearch.xml', function(req, res, next) {
	var builder = xmlbuilder.create('OpenSearchDescription');
	builder.att('xmlns', 'http://a9.com/-/spec/opensearch/1.1/');
	builder.att('xmlns:moz', 'http://www.mozilla.org/2006/browser/search/');
	builder.ele('ShortName', res.locals.title);
	builder.ele('Description', res.locals.title + " – A socialized command-line"+(req.models.user.userId !== 'global' ? ', personalized for '+(req.models.user.name || req.models.user.userId) : ''));
	builder.ele('Url', {type: 'text/html', 'method': 'get', 'template': ''+req.protocol+'://'+req.hostname+res.locals.userPrefix+'/execute?q={searchTerms}'});
	builder.ele('Url', {type: 'application/opensearchdescription+xml', 'rel': 'self', 'template': ''+req.protocol+'://'+req.hostname+res.locals.userPrefix+'/opensearch.xml'});
	builder.ele('Image', {width: 16, height: 16}, ''+req.protocol+'://'+req.hostname+'/images/favicon.svg');
	builder.ele('Developer', 'Raphael Schweikert');
	builder.ele('InputEncoding', 'UTF-8');
	builder.ele('moz:SearchForm', ''+req.protocol+'://'+req.hostname+res.locals.userPrefix+'/');
	builder.ele('moz:UpdateUrl', ''+req.protocol+'://'+req.hostname+res.locals.userPrefix+'/opensearch.xml');
	builder.ele('moz:UpdateInterval', 7);
	res.header('Content-Type','application/opensearchdescription+xml').send(builder.end({ pretty: true}));
});

// Execute search query
function exec(isPost, req, res, next) {
	var q = isPost ? req.body.q : req.query.q;
	var cmd = commands.parse(q, req.models.user, req.models.globalUser);
	list = commands.list(req.db, req.models.user, req.models.globalUser);
	list.byName(cmd.name, function(err, command) {
		if(err) {
			return next(err);
		}
		if(!command) {
			return res.render('message', {status: "Command not found", message: "The command "+cmd.name+" isn’t available."});
		}
		console.log('isPost', command);
		if(command.requiresPost && !isPost) {
			return res.render('message', {status: "Command requires a POST request", message: "The command "+cmd.name+" isn’t available for GET requests."});
		}
		debug("Executing command", command.name, "with", cmd);
		command.getCommand(cmd.text, cmd.args, req, res, next, list)();
	});
}

router.post('/:user?/execute', exec.bind(null, true));
router.get('/:user?/execute', exec.bind(null, false));

/* GET home page. */
router.get('/:user?', function(req, res, next) {
	res.render('index', {});
});

module.exports = router;
