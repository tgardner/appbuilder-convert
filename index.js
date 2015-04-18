#!/usr/bin/env node

var program = require('commander'),
    path = require('path'),
    chalk = require('chalk'),
    pkg = require( path.join(__dirname, 'package.json') ),
    async = require('async'),
    cp = require('child_process'),
    fs = require('fs-extra'),
    parser = require('gitignore-parser'),
    recursive = require('recursive-readdir');

program
    .version(pkg.version)
    .option('-s, --source <source>', 'The appbuilder project root')
    .option('-d, --dest <dest>', 'The destination directory for the Cordova project to be created')
    .option('--debug')
    .parse(process.argv);

var source = program.source || __dirname,
    dest = program.dest || path.join(__dirname, 'cordova');

var logger = require('./lib/logger')(chalk, program.debug),
    converter = require('./lib/converter')(source, dest, logger, async, fs, path, cp, parser, recursive);

var tasks = converter.tasks();
logger.debug("Runnings tasks: %s", tasks.join(', '));

converter.run();
