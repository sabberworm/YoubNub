var fs = require('fs');
var path = require('path');

var debug = require('debug')('YoubNub:config');

module.exports = function(app) {
	fs.readdirSync(__dirname).forEach(function(file) {
		if(file.indexOf('.json') !== file.length-'.json'.length) {
			return;
		}
		file = path.basename(file, '.json');
		var envs = file.split('_');
		if(envs.indexOf(app.get('env')) > -1) {
			debug('Found config file', file);
			var config = require(__dirname+'/'+file+'.json');
			for(var key in config) {
				debug('Setting config', key, "to", config[key]);
				app.set(key, config[key]);
			}
		}
	});
};