'use strict';
const requirer = require("extended-requirer");
const r = new requirer(__dirname);

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const mergeJSON = require('merge-json');

const configLoader = r.require('config-loader-manager');

function getModuleName() {
    return __dirname.split(path.sep).slice(-1)[0];
}

module.exports = class fileconsumer {
    constructor(config) {

        this._logger = console;
        var defaultConfig = {};
        defaultConfig[getModuleName()] = {
            inputFolder: "./input",                        // Input folder. New files on that folder will be processed
            outputFolder: "./output",                      // Processed files and/or result files will be written to that folder
            failFolder: "./fail",                          // When process function fails, file will be moved to this folder
            watch: true,                                   // Initial file scan status. If false file consumer will initialize stopped.
            afterProcessPolicy: 2,                         // What to do with input file after being processed:
            // 0 - Do nothing
            // 1 - Remove input file after process
            // 2 - Move to output folder
            processFunction: this.defaultProcessFunction,  // Function to be executed for each file. Parameter is file name.
        };
        this._config = configLoader.load(__dirname, config, defaultConfig);

        this.DO_NOTHING = 0;
        this.REMOVE_AFTER_PROCESS = 1;
        this.MOVE_AFTER_PROCESS = 2;

        if (this.getConfig("watch")) {
            this.setConfig("watch", false);
            this.startWatching();
        }
    }

    getConfig(key) {
        return this._config[__dirname.split(path.sep).slice(-1)[0]][key];
    }
    setConfig(key, value) {
        this._config[__dirname.split(path.sep).slice(-1)[0]][key] = value;
    }

    setLogger(logger) {
        this._logger = logger;
    }

    defaultProcessFunction(file) {
        this._log("default (DUMMY) PROCESS FUNCTION ");
    }

    startWatching() {
        if (this.getConfig("watch")) {
            return false;
        }
        else {
            var folder = path.resolve(this.getConfig("inputFolder"));
            folder = folder.split("\\").join("/") + "/";
            this._watcher = chokidar.watch(folder, {
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                }
            });
            this._logger.log("Watching folder " + folder);
            this._watcher.on('add', (event, p) => {
                this._logger.log("add event");
                this.processEvent(event);
            });
            this.setConfig("watch", true);
            return true;
        }
    }

    getOutputFile(file) {
        const fileName = path.basename(file);
        const outFile = path.join(this.getConfig("outputFolder"), fileName);
        return outFile;
    }

    getFailFile(file) {
        const fileName = path.basename(file);
        const outFile = path.join(this.getConfig("failFolder"), fileName);
        return outFile;
    }

    getOutputFileWithNoExtension(file) {
        const fileName = path.basename(file, path.extname(file));
        const outFile = path.join(this.getConfig("outputFolder"), fileName);
        return outFile;
    }

    processEvent(file) {
        return this.getConfig("processFunction")(file, this.getConfig("outputFolder")).then((out) => {
            this._logger.log("File processed: " + out);
            if (this.getConfig("afterProcessPolicy") == this.REMOVE_AFTER_PROCESS)
                fs.unlinkSync(file);
            if (this.getConfig("afterProcessPolicy") == this.MOVE_AFTER_PROCESS) {
                const outFile = this.getOutputFile(file);
                fs.copyFileSync(file, outFile);
                fs.unlinkSync(file);
            }
        }).catch((err) => {
            this._logger.log("Error processing file [" + file + "] => " + err);
            const failFile = this.getFailFile(file);
            fs.copyFileSync(file, failFile);
            fs.unlinkSync(file);
            this._logger.log("File moved to fail folder: [" + this.getConfig("failFolder") + "]");
        });
    }

    stopWatching() {
        if (!this.getConfig("watch")) {
            return false;
        } else {
            this._watcher.close().then(() => {
                this.setConfig("watch", false);
            });
            return true;
        }
    }

    getStatus() {
        return this.getConfig("watch");
    }
}
