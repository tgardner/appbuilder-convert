module.exports = function ResourcesTaskFactory(source, dest, project, fs, path, builder, xmldoc, glob, logger) {

    var iosIconMap = {
        "Icon-Small-50.png": "icon-50.png",
        "Icon-Small-50@2x.png": "icon-50@2x.png"
    };
    var iosSplashMap = {
        "Default-568h@2x.png": "Default-568h@2x~iphone.png",
        "Default-Landscape@2x.png": "Default-Landscape@2x~ipad.png",
        "Default-Landscape.png": "Default-Landscape~ipad.png",
        "Default-Portrait@2x.png": "Default-Portrait@2x~ipad.png",
        "Default-Portrait.png": "Default-Portrait~ipad.png",
        "Default@2x.png": "Default@2x~iphone.png",
        "Default.png": "Default~iphone.png"
    };

    function createCopyTask(src, dest) {
        return function(callback) {
            fs.copy(src, dest, function(err) {
                if(err) logger.error(err);
                callback();
            });
        };
    }

    function rewriteAndroidManifestTask(src, dest, project) {
        var xml = new xmldoc.XmlDocument(fs.readFileSync(src, "utf8"));

        return function(callback) {
            var activity = xml.descendantWithPath("application.activity");
            activity.attr["android:name"] = 'MainActivity';

            var content = xml.toString();

            for(var j in project) {
                var searchTerm = '\\$' + j + '\\$';
                content = content.replace(new RegExp(searchTerm, 'g'), project[j]);
            }

            fs.writeFileSync(dest, content);

            callback();
        }
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

            for(var i in iosIconMap) {
                contents = contents.replace(i, iosIconMap[i]);
            }

            fs.writeFileSync(dest, contents);
            callback();
        };
    }

    function copyXmlRecursive(xml, builder) {
        xml.eachChild(function(child) {
            var newNode = builder.ele(child.name, child.attr, child.val.trim() || null);

            copyXmlRecursive(child, newNode);
        });
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
                var androidXml = new xmldoc.XmlDocument(fs.readFileSync(androidConfig, "utf8"));
                var androidNode = root.ele("platform", { name: "android" });

                copyXmlRecursive(androidXml, androidNode);
            }

            var iosConfig = path.join(source, "App_Resources", "iOS", "config.xml");
            if(fs.existsSync(iosConfig)) {
                var iosXml = new xmldoc.XmlDocument(fs.readFileSync(iosConfig, "utf8"));
                var iosNode = root.ele("platform", { name: "ios" });

                copyXmlRecursive(iosXml, iosNode);
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
            iosProjectName = project.DisplayName,
            sourceRes = path.join(source, "App_Resources", "iOS"),
            destRes = path.join(dest, "platforms", "ios", iosProjectName, "Resources");

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

                if(iosIconMap[basename]) {
                    fs.copySync(icon, path.join(destRes, "icons", iosIconMap[basename]));
                } else {
                    fs.copySync(icon, path.join(destRes, "icons", basename));
                }
            }

            callback();
        };

        var splashscreens = glob.sync(path.join(sourceRes, "default*"), {nocase: true});

        tasks.ios_copySplashscreens = function(callback) {
            for(var i in splashscreens) {
                var splashscreen = splashscreens[i],
                    basename = path.basename(splashscreen);

                if(iosSplashMap[basename]) {
                    fs.copySync(splashscreen, path.join(destRes, "splash", iosSplashMap[basename]));
                } else {
                    fs.copySync(splashscreen, path.join(destRes, "splash", basename));
                }
            }
            callback();
        };

        var infoPlist = path.join(sourceRes, "Info.plist");
        if(fs.existsSync(infoPlist)) {
            tasks["ios_Info.plist"] = rewriteIosInfoPlistTask(infoPlist, 
                path.join(dest, "platforms", "ios", iosProjectName, iosProjectName + "-Info.plist"), 
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
