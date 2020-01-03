'use strict';
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

module.exports = class fileconsumer {
    constructor(inputFolder, outputFolder, watch, afterProcessPolicy, processFunction) {
        this.DO_NOTHING = 0;
        this.REMOVE_AFTER_PROCESS = 1;
        this.MOVE_AFTER_PROCESS = 2;

        this._inputFolder = inputFolder;
        this._outputFolder = outputFolder;
        this._watching = false;
        this._afterProcessPolicy = afterProcessPolicy;
        this._processFunction = processFunction;
        this._log = console.log;

        if (watch)
            this.startWatching();
    }

    setLogFunction(func){
        this._log = func;
    }

    startWatching() {
        if (this._watching) {
            return false;
        }
        else {
            this._watcher = chokidar.watch(this._inputFolder, {
                awaitWriteFinish: {
                  stabilityThreshold: 2000,
                  pollInterval: 100
                }
              });
            this._watcher.on('add', (event, p) => {
                this.processEvent(event);
            });
            this._watching = true;
            return true;
        }
    }

    getOutputFile(file){
        const fileName = path.basename(file);
        const outFile = this._outputFolder + "/" + fileName;
        return outFile;
    }

    getOutputFileWithNoExtension(file){
        const fileName = path.basename(file, path.extname(file));
        const outFile = this._outputFolder + "/" + fileName;
        return outFile;
    }

    processEvent(file){
        return this._processFunction(file).then( (out) => {
            this._log("File processed: " + out);
            if (this._afterProcessPolicy == this.REMOVE_AFTER_PROCESS)
                fs.unlinkSync(file);
            if (this._afterProcessPolicy == this.MOVE_AFTER_PROCESS){
                const outFile = this.getOutputFile(file);
                fs.copyFileSync(file, outFile);
                fs.unlinkSync(file);
            }
        }).catch( (err) => {
            this._log("Error processing file [" + file + "] => " + err);
        });
    }

    stopWatching() {
        if (!this._watching) {
            return false;
        } else {
            this._watcher.close().then(() => {
                this._watching = false;
            });
            return true;
        }
    }

    getStatus(){
        return this._watching;
    }
}
