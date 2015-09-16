var request = require('request');
var util = require('util');
var _ = require('lodash');
var parseTorrent = require('parse-torrent');
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var moment = require('moment');
var Torrent = require('./torrent');
var uEvents = require('./uevents');

/**
 * Expose uTorrent.
 */
module.exports = uTorrent;

function uTorrent(options, redis) {
    options = options || {};
    this.host = options.host;
    this.guiUrl = 'http://' + options.host + ':' + options.port + '/gui';
    this.username = options.username;
    this.password = options.password;
    this.download_dir = options.download_dir;
    this.token = null;
    this.cookies = request.jar();
    this.redis = redis;
    this.attempts = {};
    
    /**
   * Disabled cid, sometimes does not update and uses old cached data, even when using new cid.
   */
    //this.cid = 0;
};

/**
 * Inherit from 'EventEmitter.prototype'.
 */

util.inherits(uTorrent, EventEmitter);

/**
 * Get the token
 */
uTorrent.prototype.getToken = function(callback) {

  var self = this;

  var options = {
    path: '/token.html'
  }

  this.call(options, function(err, body) {
    if (err) return callback(err);
    var regex = new RegExp('<div id=(?:\'|")token(?:\'|")[^>]+>(.*)</div>');
    var matches = regex.exec(body);
    if(matches != null && matches.length > 1) {
      self.token = matches[1];
      callback(null)
    } else {
      callback('Token not found in response body');
    }
  
  });

};

/**
 * Get the total count of downloads for this instance
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
uTorrent.prototype.getCount = function(callback) {

  var options = {
    qs: {
      list: 1
    }
  }

  this.call(options, function(err, response) {

    if (err) return callback(err);
    if (_.isUndefined(response.torrents)) { 
      return callback(null, 0);
    }

    callback(null, response.torrents.length);
  });

};

/**
 * Remove torrent
 * @param  {[type]}   hash     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
uTorrent.prototype.remove = function(hash, callback) {
  var options = {
    qs: {
      action: 'removetorrent',
      hash: hash
    }
  }
  this.call(options, callback);
};

/**
 * Remove torrent
 * @param  {[type]}   hash     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
uTorrent.prototype.removeData = function(hash, callback) {
  var options = {
    qs: {
      action: 'removedatatorrent',
      hash: hash
    }
  }
  this.call(options, callback);
};

/**
 * ERROR: forcestart does not seem to honor the path value, therefore re-starts at the root transfer directory.
 * @param  {[type]}   hash     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
/*
uTorrent.prototype.forcestart = function(hash, callback) {
  var options = {
    qs: {
      action: 'forcestart',
      hash: hash,
      download_dir: self.download_dir,
      path: hash
    }
  }
  this.call(options, callback);
};
*/


/**
 * Resume an already existing transfer
 *
 *
 */
uTorrent.prototype.resume = function(hash, callback) {
  
  var self = this;
  var thisEvent = new uEvents(hash, self.redis);

  self.get(thisEvent.hash, function(err, torrent) {
  callback(err, thisEvent, torrent);
  self.poll(thisEvent);
  });

};


/**
 * Get the total count of downloads for this instance
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
uTorrent.prototype.add = function(torrent_url, hash, callback) {

  var self = this;
 
    var options = {
      qs: {
        action: 'add-url',
        s: torrent_url,
        download_dir: self.download_dir,
        path: hash
      },
      method: 'GET'
    }
   
    self.call(options, function(err, body) {

      if (err) {
        return callback(err);
      }

      var thisEvent = new uEvents(hash, self.redis);
    
      self.get(thisEvent.hash, function(err, torrent) {
        callback(null, thisEvent, torrent);
        self.poll(thisEvent);
      });

    });

};

/**
 * Poll for a specific hash and emit events
 * @param  {[type]} thisEvent [description]
 * @return {[type]}           [description]
 */
uTorrent.prototype.poll = function(thisEvent) {

  this.pollDate = moment().unix() * 1000;
  this.timer = true;
  
  var self = this;

  //Listen for cancel event to stop our polling and remove from utorrent 
  thisEvent.on('cancel', function() {
     clearTimeout(self.timer);
   self.timer = false;
   self.remove(thisEvent.hash, function(err, res) {
       //Don't care about callback, but we'll remove it clean up utorrent if it's been cancelled
   });   
  });

  var pollInterval = function() {

  thisEvent.emit('sendPoll', thisEvent.hash);
    
    self.get(thisEvent.hash, function(err, torrent) {

      if (err) {
        return thisEvent.emit('sendError', err);
      }

      if (torrent) {
        
      self.pollDate = moment().unix() * 1000;  
        
        if (torrent.isStatusCompleted()) {
            return thisEvent.emit('sendComplete', torrent);
        } else if (torrent.isStatusError()) {
          return thisEvent.emit('sendError', torrent);
        } else if (!torrent.hasSeeds()) {
            return thisEvent.emit('sendNoSeeds', torrent);
        } else {
            thisEvent.emit('sendDownload', torrent);
        }
      } else {
        //If a magnet link is invalid or for whatever other reason we don't get our torrent
        //and it's been 90 seconds
        var delay = moment().diff(moment(self.pollDate), 'seconds')
        if (delay > 90) {
          return thisEvent.emit('sendTimeout', {'host': self.host, 'hash': thisEvent.hash}); 
        }
      }
      
    if (self.timer || typeof self.timer === 'number') {
    self.timer = setTimeout(pollInterval, 2000)
    }

    });
   
  }
  
  setImmediate(pollInterval);

}

/**
 * List all torrents
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
uTorrent.prototype.list = function(callback) {

  var options = {
    qs: {
      list: 1
    }
  }

  this.call(options, function(err, response) {

    if (err) return callback(err);

    if (_.isUndefined(response.torrents)) { 
      return callback(null, null);
    }
    
    var torrents = [];

    response.torrents.forEach(function(array) {

      torrents.push(new Torrent(
            array[0],
            array[1],
            array[2],
            array[3],
            array[4],
            array[5],
            array[6],
            array[7],
            array[8],
            array[9],
            array[10],
            array[11],
            array[12],
            array[13],
            array[14],
            array[15],
            array[16],
            array[17],
            array[18],
            array[19],
            array[20],
            array[21],
            array[22],
            array[23],
            array[24],
            array[25],
            array[26],
            self.host
            ));

    });

    callback(null, torrents);
    
  });

};


/**
 * Get a single torrent by hash
 */
uTorrent.prototype.get = function(hash, callback) {

  var self = this;

  var options = {
    qs: {
      list: 1
    }
  }

  this.call(options, function(err, response) {

    if (err) return callback(err);

    var torrent = {};

    if (_.isUndefined(response.torrents)) { 
      return callback(null, null);
    }

    torrent = response.torrents.filter(function(t, index) {
      if (t[0] === hash.toUpperCase()) {
        return t;
      } 
    })

    if (_.isEmpty(torrent)) { 
      return callback(null, null);
    }

    array = torrent[0];

    var t = new Torrent(
          array[0],
          array[1],
          array[2],
          array[3],
          array[4],
          array[5],
          array[6],
          array[7],
          array[8],
          array[9],
          array[10],
          array[11],
          array[12],
          array[13],
          array[14],
          array[15],
          array[16],
          array[17],
          array[18],
          array[19],
          array[20],
          array[21],
          array[22],
          array[23],
          array[24],
          array[25],
          array[26],
          self.host
          );

    callback(null, t);

  });

};

/**
 * Make our requests to the uTorrent server
 */
uTorrent.prototype.call = function(options, callback) {

  var self = this;
  
  var requestOptions = {
    'method': options.method || 'GET',
    'uri': (options.path) ? this.guiUrl + options.path : this.guiUrl + '/',
    'auth': {
      'user': this.username,
      'pass': this.password,
      'sendImmediately': false
    },
    'jar': this.cookies,
    'timeout': 10000
  }

  if (!this.token && options.path !== '/token.html') {
    this.getToken(function(err) {
      if (err) {
        callback(err);
      } else {
        self.call(options, callback)
      }
    });
    return;
  }

  requestOptions.qs = options.qs || {};

  if (options.path !== '/token.html') {
    requestOptions.qs.token = this.token;
  }

  if (_.has(options, 'form')) {
    requestOptions.headers = {
      'content-type': 'multipart/form-data'
    }
    requestOptions.method = 'POST'
  }

  request(requestOptions, function(err, res, body) {

    var callString = new Buffer(JSON.stringify(options)).toString("base64");
    self.attempts[callString] = _.isUndefined(self.attempts[callString]) ? 1 : self.attempts[callString];

    if (err) {
      
    //If server is unavailable for removal, we stop our polling to free memory and end any listening jobs
    if (requestOptions.action == 'removetorrent') {
    return callback(404);
    }     

      //Only increment our attempts on errors
      self.attempts[callString] = self.attempts[callString] + 1;

      if (self.attempts[callString] > 60) {
        self.attempts[callString] = 0;
        return callback('Max attempts reached.');
      }

      /**
       *  ECONNREFUSED or ECONNRESET is returned if the utorrent server is unavailable or unable to be connected to
       *  ETIMEDOUT happens randomly, there doesn't seem to be anything specific that triggers this.
       * 
       *  In both instances, we'll continue to retry our requests for 60 attempts
       * 
       **/
      
      if (err.code === 'ECONNREFUSED' || err.code == 'ETIMEDOUT' || err.code == 'ECONNRESET') {
        setTimeout(function() {
          self.call(options, callback);
        }, 1000);
        return;
      } else {
        return callback(err);
      }
    }

    if (res.statusCode === 400) {
      self.getToken(function(err) {
        if (err) {
          callback(err);
        } else {
          setTimeout(function() {
            self.call(options, callback)
          }, 1000);
        }
      });
    } else if (res.statusCode === 401) {
      callback(new Error('Username or password is invalid.'));
    } else {

      try {
        if (options.path !== '/token.html') {
          body = JSON.parse(body);
        }
        //Reset our max attempts if we've had successful attempts
        self.attempts[callString] = 0;
        callback(null, body);
      } catch (e) {
        callback(e.message);
      }
      
    }

  });

};