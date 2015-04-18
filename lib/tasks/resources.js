module.exports = function ResourcesTaskFactory(source, dest, project, fs, path, builder, xslt, logger) {

    function createCopyTask(src, dest) {
        return function(callback) {
            fs.copy(src, dest, function(err) {
                if(err) logger.error(err);
                callback();
            });
        };
    }

    function rewriteAndroidManifestTask(src, dest, project) {
        var xml = xslt.readXmlFile(src),
            xsl = xslt.readXsltFile(path.join(__dirname, "xsl", "AndroidManifest.xsl"));

        return function(callback) {
            var manifest = xslt.transform(xsl, xml, [ ]);
            for(var j in project) {
                var searchTerm = '\\$' + j + '\\$';
                manifest = manifest.replace(new RegExp(searchTerm, 'g'), project[j]);
            }

            fs.writeFileSync(dest, manifest);
            callback();
        };
    }

    function global() {
        var tasks = {};

        tasks.global_config = function(callback) {
            var root = builder.create("widget", 
                     {version: '1.0', encoding: 'UTF-8'})
                .att("id", project.AppIdentifier)
                .att("version", project.BundleVersion)
                .att("android-versionCode", project.AndroidVersionCode)
                .att("xmlns", "http://www.w3.org/ns/widgets")
                .att("xmlns:cdv", "http://cordova.apache.org/ns/1.0");

            root.ele("name", {}, project.DisplayName)
            root.ele("description", {}, project.Description)
            root.ele("author", {}, project.Author);
            root.ele("content", { src: "index.html" });
            root.ele("access", { origin: "*" });

            var xml = root.end({ pretty: true });
            fs.writeFileSync(path.join(dest, "config.xml"), xml);
            callback();
        };

        return tasks;
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

    function ios() {
        var tasks = {};

        return tasks;
    }

    return {
        global: global,
        android: android,
        ios: ios
    };
};
