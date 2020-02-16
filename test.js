'use strict';
global.__basedir = __dirname;

const requirer = require("extended-requirer");
const r = new requirer(__dirname, { "currentConfig": "PRO" });

const logger = r.require("logger-to-memory");

const consumer = require("./index.js");

var loggerConfig = {
    "logger-to-memory": {
        "logsEnabled": true,
        "maxLogLines": 20,
        "logToConsole": true,
        "lineSeparator": "\n"
    }
};
var log = new logger(loggerConfig);

function processFile(file, outputFolder) {
    log.log("Processing file " + file);
    const path = require("path");
    const f = file.split(path.sep).pop();
    if (f == "FAILSample")
        return Promise.reject("FAIL file");
    return Promise.resolve(true);
}

var config = {
    "file-consumer": {
        inputFolder: "./input",                        // Input folder. New files on that folder will be processed
        outputFolder: "./output",                      // Processed files and/or result files will be written to that folder
        failFolder: "./fail",                          // When process function fails, file will be moved to this folder
        watch: true,                                   // Initial file scan status. If false file consumer will initialize stopped.
        afterProcessPolicy: 2,                         // What to do with input file after being processed:
        // 0 - Do nothing
        // 1 - Remove input file after process
        // 2 - Move to output folder
        processFunction: processFile,  // Function to be executed for each file. Parameter is file name.
    }
};

var c = new consumer(config);
c.setLogger(log);
