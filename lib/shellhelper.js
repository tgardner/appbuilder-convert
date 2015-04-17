var chalk = require('chalk'),
	cp = require('child_process'),
    fs = require('fs-extra'),
    path = require('path'),
    util = require('util');

exports.exec = function(cmd, options) {
    return function(callback) {
        console.log(chalk.yellow(cmd));

        var opts = options || {};
        if(!opts.stdio)
            opts.stdio = 'inherit';

        var parts = cmd.split(/\s+/g);
        var p = cp.spawn(parts[0], parts.slice(1), opts);
        p.on('error', function(error) {
            console.log(chalk.red(error));
        });

        p.on('exit', function(){
            callback();
        });
    };
};

exports.rewriteManifest = function(project, template, dest) {
    return function(callback) {
        var manifest = fs.readFileSync(template, "utf8");

        for(var j in project) {
            var searchTerm = util.format('\\$%s\\$', j);
            manifest = manifest.replace(new RegExp(searchTerm, 'g'), project[j]);
        }

        fs.writeFileSync(dest, manifest);
        callback();
    };
};
