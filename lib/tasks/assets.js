module.exports = function CopyAssetsTaskFactory(source, dest, fs, path, parser, recursive, logger) {
    "use strict";

    var ignores = [
        "Plugins/",
        "cordova*",
        ".abproject",
        "*.abproject",
        "App_Resources/",
        ".ab/",
        ".abignore"
    ];

    var ignoreContent = ignores.join("\n"),
        ignorePath = path.join(source, '.abignore');

    if(fs.existsSync(ignorePath)) {
        ignoreContent += "\n";
        ignoreContent += fs.readFileSync(ignorePath, 'utf8');
    }

    var abignore = parser.compile(ignoreContent);

    function clear(callback) {
        var www = path.join(dest, 'www');
        logger.debug("Clearing '%s'", www);

        fs.removeSync(www);
        fs.ensureDirSync(www);
        callback();
    }

    function copy(callback) {
        recursive(source, function (err, files) {
            files = files.filter(function(f) {
                f = f.replace(source, '');
                return abignore.accepts(f);
            });

            for(var i in files) {
                var file = files[i],
                    asset = file.replace(source, ''),
                    destPath = path.join(dest, "www", asset);

                logger.debug("Adding asset '%s'", file);

                fs.copySync(file, destPath);
            }

            callback();
        });
    }

    return {
        clear: clear,
        copy: copy
    };
};
