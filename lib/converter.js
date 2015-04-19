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
        if(typeof(callback) !== 'function') {
            callback = function() {
                logger.log("AppBuilder conversion finished!");
            };
        }

        fs.ensureDirSync(dest);

        taskList = taskList || Object.keys(tasks);

        var commands = [];
        for (var i in taskList) {
            var task = tasks[taskList[i]];
            if(task)
                commands.push(task);
        }

        logger.debug("Runnings Tasks: %s", taskList.join(', '));
        logger.log("Beginning conversion of '%s'", project.ProjectName);

        async.series(commands, callback);
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

    function log(message) {
        var args = arguments;

        return function(callback) {
            logger.log.apply(logger, args);
            callback();
        };
    }

    var resourceTasks = require('./tasks/resources')(source, dest, project, fs, path, xmlbuilder, xmldoc, glob, logger),
        assetTasks = require("./tasks/assets")(source, dest, fs, path, parser, recursive, logger),
        pluginTasks = require('./tasks/plugins')(source, dest, project, exec, fs, path, logger);

    // Init cordova project
    addTask("cordova_create", exec(['cordova', 'create', dest, project.AppIdentifier, project.ProjectName].join(' ')));

    // Configure project
    addTask("log_project", log('Configuring project'));
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
    addTask("log_buildBegin", log("Build starting"));
    addTask("cordova_build_android", exec("cordova build android", { cwd: dest }));
    addTask("cordova_build_ios", exec("cordova build ios", { cwd: dest }));
    addTask("log_buildEnd", log("Build completed"));

    return {
        run: run,
        tasks: function available() {
            return Object.keys(tasks);
        }
    };
};
