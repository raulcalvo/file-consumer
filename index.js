'use strict';
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const mergeJSON = require('merge-json');

module.exports = class fileconsumer {
    constructor(config) {
        var defaultConfig = {
            consumer: {
                inputFolder : "./input",                        // Input folder. New files on that folder will be processed
                outputFolder : "./output",                      // Processed files and/or result files will be written to that folder
                watch : true,                                   // Initial file scan status. If false file consumer will initialize stopped.
                afterProcessPolicy : 2,                         // What to do with input file after being processed:
                                                                // 0 - Do nothing
                                                                // 1 - Remove input file after process
                                                                // 2 - Move to output folder
                processFunction : this.defaultProcessFunction,  // Function to be executed for each file. Parameter is file name.
            },
            logger : console,                                   // Logger. Have to be an object that have a .log method.
        };

        this._c = mergeJSON.merge(defaultConfig, config);

        this.DO_NOTHING = 0;
        this.REMOVE_AFTER_PROCESS = 1;
        this.MOVE_AFTER_PROCESS = 2;

        if (this._c.consumer.watch){
            this._c.consumer.watch = false;
            this.startWatching();
        }
    }

    defaultProcessFunction(file){
        this._log("default (DUMMY) PROCESS FUNCTION ");
    }

    startWatching() {
        if (this._c.consumer.watch) {
            return false;
        }
        else {
            this._watcher = chokidar.watch(this._c.consumer.inputFolder, {
                awaitWriteFinish: {
                  stabilityThreshold: 2000,
                  pollInterval: 100
                }
              });
            this._watcher.on('add', (event, p) => {
                this.processEvent(event);
            });
            this._c.consumer.watch = true;
            return true;
        }
    }

    getOutputFile(file){
        const fileName = path.basename(file);
        const outFile = this._c.consumer.outputFolder + "/" + fileName;
        return outFile;
    }

    getOutputFileWithNoExtension(file){
        const fileName = path.basename(file, path.extname(file));
        const outFile = this._c.consumer.outputFolder + "/" + fileName;
        return outFile;
    }

    processEvent(file){
        return this._c.consumer.processFunction(file).then( (out) => {
            this._c.logger.log("File processed: " + out);
            if (this._c.consumer.afterProcessPolicy == this.REMOVE_AFTER_PROCESS)
                fs.unlinkSync(file);
            if (this._c.consumer.afterProcessPolicy == this.MOVE_AFTER_PROCESS){
                const outFile = this.getOutputFile(file);
                fs.copyFileSync(file, outFile);
                fs.unlinkSync(file);
            }
        }).catch( (err) => {
            this._c.logger.log("Error processing file [" + file + "] => " + err);
        });
    }

    stopWatching() {
        if (!this._c.consumer.watch) {
            return false;
        } else {
            this._watcher.close().then(() => {
                this._c.consumer.watch = false;
            });
            return true;
        }
    }

    getStatus(){
        return this._c.consumer.watch;
    }
}
