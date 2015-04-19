module.exports = function ConverterFactory(source, dest, logger, 
    async, fs, path, childProcess, parser, recursive, xmlbuilder, xmldoc, glob) {
    "use strict";

    var tasks = {},
        projectFile = path.join(source, '.abproject');

    if(!fs.existsSync(projectFile)) {
        logger.error("No project found at '%s'", source);
        process.exit(1);
    }

    var project = fs.readJsonSync(projectFile);
    source = path.resolve(source);
    dest = path.resolve(dest);

    function run(taskList, callback) {
        fs.ensureDirSync(dest);

        taskList = taskList || Object.keys(tasks);

        var commands = [];
        for (var i in taskList) {
            var task = tasks[taskList[i]];
            if(task)
                commands.push(task);
        }
        
        logger.log("Starting AppBuilder conversion of '%s'", project.ProjectName);

        async.series(commands, function() {
            logger.log("Finished AppBuilder conversion!");

            if(typeof(callback) === 'function') {
                callback.apply(this, arguments);
            }
        });
    }

    function addTask(name, task) {
        tasks[name] = task;
    }

    function addTasks(tasks) {
        for(var i in tasks) {
            addTask(i, tasks[i]);
        }
    }

    function exec(cmd, options) {
        var opts = options || {};
        if(!opts.stdio)
            opts.stdio = 'inherit';

        var parts = cmd.split(/\s+/g);

        return function(callback) {
            logger.debug(cmd);

            var p = childProcess.spawn(parts[0], parts.slice(1), opts);
            p.on('error', function(error) {
                logger.error(error);
            });
            p.on('exit', function(){
                callback();
            });
        };
    }

    var resourceTasks = require('./tasks/resources')(source, dest, project, fs, path, xmlbuilder, xmldoc, glob, logger),
        assetTasks = require("./tasks/assets")(source, dest, fs, path, parser, recursive, logger),
        pluginTasks = require('./tasks/plugins')(source, dest, project, exec, fs, path, logger);

    // Init cordova project
    addTask("cordova_create", exec(['cordova', 'create', dest, project.AppIdentifier, project.ProjectName].join(' ')));

    // Configure project
    addTasks(resourceTasks.global());

    // Configure iOS
    addTask("cordova_addIos", exec('cordova platform add ios', { cwd: dest }));
    addTasks(resourceTasks.ios());

    // Configure Android
    addTask("cordova_addAndroid", exec('cordova platform add android', { cwd: dest }));
    addTasks(resourceTasks.android());

    // Add assets
    addTask("assets_clear", assetTasks.clear);
    addTask("assets_copy", assetTasks.copy);

    // Add plugins
    addTasks(pluginTasks.dynamic());
    addTasks(pluginTasks.static());

    // Build
    addTask("cordova_build_android", exec("cordova build android", { cwd: dest }));
    addTask("cordova_build_ios", exec("cordova build ios", { cwd: dest }));

    return {
        run: run,
        tasks: function available() {
            return Object.keys(tasks);
        }
    };
};
