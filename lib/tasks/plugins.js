module.exports = function PluginsTaskFactory(source, dest, project, exec, fs, path, logger) {
    "use strict";

    function staticPlugins() {
        var tasks = {};

        var pluginDir = path.join(source, 'Plugins');
        if(fs.existsSync(pluginDir)) {
            var staticPlugins = fs.readdirSync(pluginDir);
            for(var i in staticPlugins) {
                var plugin = staticPlugins[i],
                    src = path.join(pluginDir, plugin),
                    command = ['cordova', 'plugin', 'add', src, '--save'];

                tasks["plugin_" + plugin] = exec(command.join(' '), { cwd: dest });
            }
        }

        return tasks;
    }

    function dynamicPlugins() {
        var tasks = {};

        for(var i in project.CorePlugins) {
            var plugin = project.CorePlugins[i],
                command = ['cordova', 'plugin', 'add', plugin, '--save'],
                name = plugin.replace(/@.*/g,''),
                variables = project.CordovaPluginVariables[name] || [];

            for(var j in variables) {
                command.push('--variable', j + '=' + variables[j]);
            }

            tasks["plugin_" + name] = exec(command.join(' '), { cwd: dest });
        }

        return tasks;
    }

    return {
        "static": staticPlugins,
        "dynamic": dynamicPlugins
    };
};
