module.exports = function ResourcesTaskFactory(source, dest, project, fs, path, logger) {

    function createCopyTask(src, dest) {
        return function(callback) {
            fs.copy(src, dest, function(err) {
                if(err) logger.error(err);
                callback();
            });
        };
    }

    function rewriteAndroidManifestTask(src, dest, project) {
        return function(callback) {
            var manifest = fs.readFileSync(src, "utf8");

            for(var j in project) {
                var searchTerm = '\\$' + j + '\\$';
                manifest = manifest.replace(new RegExp(searchTerm, 'g'), project[j]);
            }

            manifest = manifest.replace(/android\:name=\"([^\"]*)\"/g, 'android:name="MainActivity"');
            fs.writeFileSync(dest, manifest);
            callback();
        };
    }

    function android() {
        var tasks = {},
            sourceRes = path.join(source, "App_Resources", "Android"),
            destRes = path.join(dest, "platforms", "android", "res"),
            resources = fs.readdirSync(sourceRes);

        tasks.android_clearResources = function(callback) {
            fs.removeSync(path.join(destRes, "drawable*"));
            callback();
        };

        for(var i in resources) {
            var resource = resources[i],
                resourcePath = path.join(sourceRes, resource),
                task;

            switch(resource) {
                case "AndroidManifest.xml":
                    task = rewriteAndroidManifestTask(resourcePath, 
                        path.join(dest, "platforms", "android", 
                            resource), 
                        project);
                    break;
                default:
                    var basename = path.basename(resourcePath);
                    task = createCopyTask(resourcePath, path.join(destRes, basename));
                    break;
            }

            tasks["android_" + resource] = task;
        }

        return tasks;
    }

    return {
        android: android
    };
};
