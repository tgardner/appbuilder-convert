module.exports = function ConverterFactory(source, dest, logger, async, fs, path, childProcess, parser, recursive) {
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

        var commands = [];
        if(taskList) {
            for (var i in taskList) {
                var task = tasks[taskList[i]];
                if(task)
                    commands.push(task);
            }
        } else {
            for(var i in tasks) {
                commands.push(tasks[i]);
            }
        }
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
        }
    }

    // Init cordova project
    addTask("log_begin", log("Beginning conversion of '%s'", project.ProjectName));
    addTask("cordova_create", exec(['cordova', 'create', dest, project.AppIdentifier, project.ProjectName].join(' ')));
    addTask("cordova_addIos", exec('cordova platform add ios', { cwd: dest }));
    addTask("cordova_addAndroid", exec('cordova platform add android', { cwd: dest }));

    // Add plugins
    var pluginTasks = require('./tasks/plugins')(source, dest, project, exec, fs, path),
        dynamicPluginTasks = pluginTasks.dynamic(),
        staticPluginTasks = pluginTasks.static();

    addTask("log_dynamicPlugins", log('Adding dynamic plugins'));
    for(var i in dynamicPluginTasks) {
        addTask(i, dynamicPluginTasks[i]);
    }

    addTask("log_staticPlugins", log('Adding static plugins'));
    for(var i in staticPluginTasks) {
        addTask(i, staticPluginTasks[i]);
    }

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
    var resourceTasks = require('./tasks/resources')(source, dest, project, fs, path, logger),
        androidTasks = resourceTasks.android();

    // Global
    // TODO: Write config.xml

    // Android
    for(var i in androidTasks) {
        addTask(i, androidTasks[i]);
    }

    // iOS

    // Build
    addTask("cordova_build", exec("cordova build", { cwd: dest }));

    return {
        run: run,
        tasks: function available() {
            return Object.keys(tasks);
        }
    };
};
