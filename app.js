var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./lib/routes/index');

var app = express();

// Config set up
require('./lib/config')(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Static stuff
var stylus = require('stylus');
var styl = stylus.middleware({
	src: path.join(__dirname, 'stylus'),
	dest: path.join(__dirname, 'public', 'stylesheets'),
	compile: function compile(str, path) {
		return stylus(str)
		.set('filename', path)
		.use(require('jeet')())
		.import('jeet');
 }
});
app.use('/stylesheets/', styl);
app.use(express.static(path.join(__dirname, 'public')));

// DB
app.use('/', require('./lib/models')(app, {}));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
