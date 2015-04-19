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
        logger.log("Clearing assets");
        var www = path.join(dest, 'www');
        fs.removeSync(www);
        fs.ensureDirSync(www);
        callback();
    }

    function copy(callback) {
        logger.log("Copying assets");

        recursive(source, function (err, files) {
            files = files.filter(function(f) {
                f = f.replace(source, '');
                return abignore.accepts(f);
            });

            for(var i in files) {
                var file = files[i];
                fs.copySync(file, path.join(dest, "www", file.replace(source, '')));
            }

            callback();
        });
    }

    return {
        clear: clear,
        copy: copy
    };
};
