#!/usr/bin/env node

var program = require('commander'),
    path = require('path'),
    chalk = require('chalk'),
    pkg = require( path.join(__dirname, 'package.json') ),
    async = require('async'),
    cp = require('child_process'),
    fs = require('fs-extra'),
    parser = require('gitignore-parser'),
    recursive = require('recursive-readdir'),
    xmlbuilder = require('xmlbuilder'),
    xmldoc = require('xmldoc'),
    glob = require('glob');

function list(val) {
    return val.split(',');
}

program
    .version(pkg.version)
    .usage('--source <source> --dest <dest>')
    .option('-s, --source <source>', 'The appbuilder project directory')
    .option('-d, --dest <dest>', 'The destination directory for the Cordova project to be created')
    .option('-t, --tasks [items]', 'A comma separated lists of tasks. Run with --debug flag to see list of available tasks', list)
    .option('--debug')
    .parse(process.argv);

var source = program.source || process.cwd(),
    dest = program.dest || path.join(process.cwd(), 'cordova'),
    tasks = program.tasks;

var logger = require('./lib/logger')(chalk, program.debug),
    converter = require('./lib/converter')(source, dest, logger, async, fs, path, cp, parser, recursive, xmlbuilder, xmldoc, glob);

var available = converter.tasks();
logger.debug("Available tasks: %s", available.join(', '));

converter.run(tasks);
