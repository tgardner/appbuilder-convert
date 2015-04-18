module.exports = function CopyAssetsTaskFactory(source, dest, fs, path, parser, recursive) {
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

    return function Task(callback) {
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
    };
};
