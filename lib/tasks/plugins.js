module.exports = function PluginsTaskFactory(source, dest, project, exec, fs, path) {
    function staticPlugins() {
        var tasks = {};

        var staticPlugins = fs.readdirSync(path.join(source, 'Plugins'));
        for(var i in staticPlugins) {
            var plugin = staticPlugins[i],
                src = path.join(source, 'Plugins', plugin),
                command = ['cordova', 'plugin', 'add', src, '--save'];

            tasks["plugin_" + plugin] = exec(command.join(' '), { cwd: dest });
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
