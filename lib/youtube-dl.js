var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var async = require('async');
var split = require('event-stream').split;
var common = require('./common');

/**
 * Expose YouTubeDl.
 */
module.exports = YouTubeDl;

function YouTubeDl(args) {

  this.on('error', function(error) {
    console.log(error);
  });

  return this;
};

/**
 * Inherit from 'EventEmitter.prototype'.
 */

util.inherits(YouTubeDl, EventEmitter);


YouTubeDl.prototype.getInfo = function(cmd, callback) { 

    exec(cmd, function (error, stdout, stderr) {  
 
      if (error) {
        return callback(error);
      }
      
      try {
        var output = JSON.parse(stdout);
        callback(null, output);
      } catch (e) {
        callback(e);
      }

    });

};


YouTubeDl.prototype.download = function(args) {

    var self = this;

    var speed = []
      , start = Date.now()
      , filename
      , size
      , state
      , result
      , pos
      , line = new split(/\r?\n|\r/)
      , progressRegex = /(\d+(?:\.\d)?)% of (\d+\.\d+\w+) at\s+([^\s]+) ETA ((\d|-)+:(\d|-)+)/;

    var cmd = spawn('youtube-dl', args);
    cmd.stdout.setEncoding('utf8');
    cmd.stderr.setEncoding('utf8');
    cmd.stdout.pipe(line);

    line.on('data', function(data) {

      if (result = progressRegex.exec(data)) {
        var speed = result[3].replace('/s','')
          , speedValue = speed.slice(0, -3)
          , speedSize = speed.slice(speed.length -3);

        var progress = {
            percent : result[1] / 100
          , speed   : common.toBytes(speedValue, speedSize)
          , eta     : result[4]
        };
        
        self.emit('progress', progress);
      }

    });

    cmd.on('exit', function(data) {
        self.emit('complete', 'done');
    });

    cmd.stderr.on('data', function(error) {
      self.emit('error', error);
    });

};
