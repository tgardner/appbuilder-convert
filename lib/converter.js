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
        async.series(commands, callback);
    }

    function addTask(name, task) {
        tasks[name] = task;
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

    var i;

    // Init cordova project
    addTask("log_begin", log("Beginning conversion of '%s'", project.ProjectName));
    addTask("cordova_create", exec(['cordova', 'create', dest, project.AppIdentifier, project.ProjectName].join(' ')));
    addTask("cordova_addIos", exec('cordova platform add ios', { cwd: dest }));
    addTask("cordova_addAndroid", exec('cordova platform add android', { cwd: dest }));

    // Add assets
    addTask("log_content", log('Copying www content'));
    addTask("assets_clear", function(callback) {
        var www = path.join(dest, 'www');
        fs.removeSync(www);
        fs.ensureDirSync(www);
        callback();
    });
    addTask("assets_copy", require("./tasks/copyAssets")(source, dest, fs, path, parser, recursive));

    // Configure resources
    addTask("log_resources", log('Configuring App_Resources'));
    var resourceTasks = require('./tasks/resources')(source, dest, project, fs, path, xmlbuilder, xmldoc, glob, logger),
        globalTasks = resourceTasks.global(),
        androidTasks = resourceTasks.android(),
        iosTasks = resourceTasks.ios();

    // Global
    for(i in globalTasks) {
        addTask(i, globalTasks[i]);
    }

    // Android
    for(i in androidTasks) {
        addTask(i, androidTasks[i]);
    }

    // iOS
    for(i in iosTasks) {
        addTask(i, iosTasks[i]);
    }

    // Add plugins
    var pluginTasks = require('./tasks/plugins')(source, dest, project, exec, fs, path),
        dynamicPluginTasks = pluginTasks.dynamic(),
        staticPluginTasks = pluginTasks.static();

    addTask("log_dynamicPlugins", log('Adding dynamic plugins'));
    for(i in dynamicPluginTasks) {
        addTask(i, dynamicPluginTasks[i]);
    }

    addTask("log_staticPlugins", log('Adding static plugins'));
    for(i in staticPluginTasks) {
        addTask(i, staticPluginTasks[i]);
    }

    // Build
    addTask("log_build", log("Beginning build"));
    addTask("cordova_build_android", exec("cordova build android", { cwd: dest }));
    addTask("cordova_build_ios", exec("cordova build ios", { cwd: dest }));

    return {
        run: run,
        tasks: function available() {
            return Object.keys(tasks);
        }
    };
};
