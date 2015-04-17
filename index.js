#!/usr/bin/env node

var path = require('path');
var pkg = require( path.join(__dirname, 'package.json') );
var program = require('commander');
var fs = require('fs-extra');
var util = require('util');

var chalk = require('chalk');
var async = require('async');
var shell = require('./lib/shellhelper');

program
    .version(pkg.version)
    .option('-s, --source <source>', 'The appbuilder project root')
    .option('-d, --dest <dest>', 'The destination directory for the Cordova project to be created')
    .option('--debug')
    .parse(process.argv);

var source = program.source || __dirname,
    dest = program.dest || path.join(__dirname, 'cordova'),
    projectFile = path.join(source, '.abproject');

if(!fs.existsSync(projectFile)) {
    console.log(chalk.red(util.format("No project found at '%s'", source)));
    process.exit(1);
}

if(!fs.existsSync(dest)) {
    fs.ensureDirSync(dest);
}

var project = JSON.parse(fs.readFileSync(projectFile, "utf8"));

var commands = [
    shell.exec(util.format("cordova create %s %s %s", dest, project.AppIdentifier, project.ProjectName), { cwd: process.cwd() }),
    shell.exec('cordova platform add ios', { cwd: dest }),
    shell.exec('cordova platform add android', { cwd: dest }),

    function(callback) {
        console.log(chalk.green("Adding dynamic plugins"));
        callback();
    } 
];

// Add dynamic plugins
for(var i in project.CorePlugins) {
    var plugin = project.CorePlugins[i];
    var command = ['cordova', 'plugin', 'add', plugin];
    var variables = project.CordovaPluginVariables[plugin.replace(/@.*/g,'')] || [];

    for(var j in variables) {
        command.push('--variable', j + '=' + variables[j]);
    }

    commands.push(shell.exec(command.join(' '), { cwd: dest }));
}

// Add static plugins
commands.push(function(callback) {
    console.log(chalk.green("Adding static plugins"));
    callback();
});

var additionalPlugins = fs.readdirSync(path.join(source, 'Plugins'));
for(var i in additionalPlugins) {
    var plugin = additionalPlugins[i];
    var src = path.resolve(path.join(source, 'Plugins', plugin));
    var command = ['cordova', 'plugin', 'add', src];

    commands.push(shell.exec(command.join(' '), { cwd: dest }));
}

// Clear www folder
commands.push(function(callback) {
    console.log(chalk.green("Copying www content"));
    callback();
});
commands.push(
    function(callback) {
        var www = path.join(dest, 'www');
        fs.remove(www, function() {
            fs.ensureDirSync(www);
            callback();
        });
    }
);

var ignoreFile = [
        "Plugins/",
        "cordova*",
        ".abproject",
        "*.abproject",
        "App_Resources/",
        ".ab/",
        ".abignore"
    ].join("\n"),
    ignorePath = path.join(source, '.abignore');

if(fs.existsSync(ignorePath)) 
    ignoreFile += "\n" + fs.readFileSync(ignorePath, 'utf8');

var parser = require('gitignore-parser');
var abignore = parser.compile(ignoreFile);

// Copy www files
var recursive = require('recursive-readdir');
recursive(source, function (err, files) {
    files = files.filter(function(f) {
        f = f.replace(source, '');
        return abignore.accepts(f);
    });

    for(var i in files) {
        var file = files[i];
        commands.push(function(callback) {
            fs.copy(path.resolve(file), path.resolve(file.replace(source, dest)), function(err) {
                if(err) console.log(chalk.red(err));
                callback();
            })
        });
    }
});

// App_Resources
commands.push(function(callback) {
    console.log(chalk.green("Configuring App_Resources"));
    callback();
});
var androidResources = fs.readdirSync(path.join(source, "App_Resources", "Android"));
var resFolder = path.resolve(path.join(dest, "platforms", "android", "res"));
fs.removeSync(path.join(resFolder, "drawable*"));

for(var i in androidResources) {
    var resource = androidResources[i];
    var resourceSource = path.join(source, "App_Resources", "Android", resource);

    switch(resource) {
        case "AndroidManifest.xml":
            commands.push(shell.rewriteManifest(project, 
                resourceSource, 
                path.join(dest, "platforms", "android", resource)));
            break;
        default:
            var command = (function(resFolder, resourceSource) {
                return function(callback) {
                    var resource = path.basename(resourceSource);
                    fs.copy(resourceSource, 
                        path.join(resFolder, resource),
                        function(err) {
                            if(err) console.log(chalk.red(err));
                            callback();
                        });
                };
            })(resFolder, resourceSource);

            commands.push(command);
            break;
    }
}


// Build
commands.push(shell.exec("cordova build", { cwd: dest }));

async.series(commands, function() {});
