module.exports = function ResourcesTaskFactory(source, dest, project, fs, path, builder, xslt, xmldoc, glob, logger) {

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

    function rewriteIosInfoPlistTask(src, dest, project) {
        return function(callback) {
            var contents = fs.readFileSync(src, "utf8");
            for(var j in project) {
                var searchTerm = '\\$' + j + '\\$';

                switch(j) {
                    case "DisplayName":
                        contents = contents.replace(new RegExp(searchTerm, 'g'), "${PRODUCT_NAME}");
                        break;
                    default:
                        contents = contents.replace(new RegExp(searchTerm, 'g'), project[j]);
                        break;
                }
            }

            contents = contents.replace(new RegExp("\\$BundleExecutable\\$", "g"), "${EXECUTABLE_NAME}");
            fs.writeFileSync(dest, contents);
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

            var androidConfig = path.join(source, "App_Resources", "Android", "xml", "config.xml");
            if(fs.existsSync(androidConfig)) {
                var androidXml = new xmldoc.XmlDocument(fs.readFileSync(androidConfig));
                var androidNode = root.ele("platform", { name: "android" });

                androidXml.eachChild(function (child, index, array) {
                    androidNode.ele(child.name, child.attr);
                });
            }

            var iosConfig = path.join(source, "App_Resources", "iOS", "config.xml");
            if(fs.existsSync(iosConfig)) {
                var iosXml = new xmldoc.XmlDocument(fs.readFileSync(iosConfig));
                var iosNode = root.ele("platform", { name: "ios" });

                iosXml.eachChild(function (child, index, array) {
                    iosNode.ele(child.name, child.attr);
                });
            }

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
        var tasks = {},
            sourceRes = path.join(source, "App_Resources", "iOS"),
            destRes = path.join(dest, "platforms", "ios", project.ProjectName, "Resources");

        // tasks.ios_clearResources = function(callback) {
        //     fs.removeSync(path.join(destRes, "icons"));
        //     fs.removeSync(path.join(destRes, "splash"));
        //     callback();
        // };

        var icons = glob.sync(path.join(sourceRes, "icon*"), {nocase: true});
        tasks.ios_copyIcons = function(callback) {
            for(var i in icons) {
                var icon = icons[i],
                    basename = path.basename(icon);

                fs.copySync(icon, path.join(destRes, "icons", basename));
            }

            callback();
        };

        var splashscreens = glob.sync(path.join(sourceRes, "default*"), {nocase: true});
        tasks.ios_copySplashscreens = function(callback) {
            for(var i in splashscreens) {
                var splashscreen = splashscreens[i],
                    basename = path.basename(splashscreen);

                fs.copySync(splashscreen, path.join(destRes, "splash", basename));
            }
            callback();
        };

        var infoPlist = path.join(sourceRes, "Info.plist");
        if(fs.existsSync(infoPlist)) {
            tasks["ios_Info.plist"] = rewriteIosInfoPlistTask(infoPlist, 
                path.join(dest, "platforms", "ios", project.ProjectName, project.ProjectName + "-Info.plist"), 
                project);
        }

        return tasks;
    }

    return {
        global: global,
        android: android,
        ios: ios
    };
};
