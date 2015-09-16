var moment = require('moment');
/**
 * Torrent model
 */
function Torrent(hash,
  status,
  name,
  size,
  percent,
  downloaded,
  uploaded,
  ratio,
  uploadSpeed,
  downloadSpeed,
  eta,
  label,
  peersConnected,
  peersInSwarm,
  seedsConnected,
  seedsInSwarm,
  availability,
  torrentQueueOrder,
  remaining,
  downloadUrl,
  rssFeedUrl,
  statusMessage,
  streamId,
  dateAdded,
  dateCompleted,
  appUpdateUrl,
  savePath,
  host) {

  this.hash = hash.toLowerCase();
  this.status = status;
  this.name = name;
  this.size = size;
  this.percent = percent;
  this.percentDone = percent / 1000;
  this.downloaded = downloaded;
  this.uploaded = uploaded;
  this.ratio = ratio;
  this.uploadSpeed = uploadSpeed;
  this.downloadSpeed = downloadSpeed;
  this.eta = eta;
  this.label = label;
  this.peersConnected = peersConnected;
  this.peersInSwarm = peersInSwarm;
  this.seedsConnected = seedsConnected;
  this.seedsInSwarm = seedsInSwarm;
  this.availability = (availability / 65536).toFixed(1);
  this.torrentQueueOrder = torrentQueueOrder;
  this.remaining = remaining;
  this.downloadUrl = downloadUrl;
  this.rssFeedUrl = rssFeedUrl;
  this.statusMessage = statusMessage.toLowerCase();
  this.streamId = streamId;
  this.dateAdded = dateAdded * 1000;
  this.dateAddedFormatted = moment.unix(dateAdded).format()
  this.dateCompleted = dateCompleted * 1000;
  this.appUpdateUrl = appUpdateUrl;
  this.savePath = savePath;
  this.host = host;
  this.getStatuses();

};

/**
 * Expose Torrent.
 */
module.exports = Torrent;

var statusesMap = {
 1: 'started',
 2: 'checking',
 4: 'startaftercheck',
 8: 'checked',
 16: 'error',
 32: 'paused',
 64: 'queued',
 128: 'loaded'
};

var statusesFlags = [1,2,4,8,16,32,64,128].reverse();

Torrent.prototype.getStatusFlag = function (x) {
  return (this.status & x) === x;
};

Torrent.prototype.getStatuses = function () {

  var i = 0;

  if (this.statusesCached) {
    return this.statusesCached;
  }
  var res = [];

  for (i=0; i<statusesFlags.length; i++) {
    if (this.getStatusFlag(statusesFlags[i])) {
      res.push(statusesMap[statusesFlags[i]]);
    }
  }
  if (this.status > 255) {
    res.push('unknown');
  }

  if (this.percent === 1000) {
    res.push('completed');
  }

  this.statusesCached = res;
  return this.statusesCached;
};

Torrent.prototype.isStatusStarted = function () {
  return this.getStatusFlag(1);
};

Torrent.prototype.isStatusChecking = function () {
  return this.getStatusFlag(2);
};

Torrent.prototype.isStatusStartAfterCheck = function () {
  return this.getStatusFlag(4);
};

Torrent.prototype.isStatusChecked = function () {
  return this.getStatusFlag(8);
};

Torrent.prototype.isStatusError = function () {
  return this.getStatusFlag(16);
};

Torrent.prototype.isStatusPaused = function () {
  return this.getStatusFlag(32);
};

Torrent.prototype.isStatusQueued = function () {
  return this.getStatusFlag(64) && !this.isStatusDownloading();
};

Torrent.prototype.isStatusLoaded = function () {
  return this.getStatusFlag(128);
};

Torrent.prototype.hasSeeds = function () {
  if (this.isStatusDownloading() && this.seedsConnected == 0 && this.availability <= 1 && moment().diff(moment(this.dateAdded), 'minutes') > 5) {
    return false;
  }
  return true;
};

Torrent.prototype.isStatusCompleted = function () {
  return (this.percent === 1000) ;
};

Torrent.prototype.isStatusDownloading = function () {
  return this.isStatusStarted() && (!this.isStatusCompleted());
};

Torrent.prototype.isStatusSeeding = function () {
  return this.isStatusStarted() && (this.isStatusCompleted());
};

Torrent.prototype.getQueueStr = function () {
  if (this.torrentQueueOrder === -1) {
    return '*';
  }
  return this.torrentQueueOrder;
};

Torrent.prototype.getPercentStr = function () {
  return (this.percent/10).toFixed(0) + '%';
};
