var uCluster = require('../');

var servers = [{
  host: 'localhost',
  port: 9000,
  username: 'admin',
  password: 'pass'
}]

var uc = new uCluster(servers);

uc.add('magnet:?xt=urn:btih:1FA6D2D6A5FE21D00E0B822CCDA7699547163F65&dn=Ed+Sheeran+-+x+%28Deluxe+Edition%29+%7B2014-Album%7D&tr=udp%3A%2F%2Ftracker.istole.it%3A80%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.com%3A2710%2Fannounce&tr=udp%3A%2F%2F11.rarbg.me%3A80%2Fannounce&tr=udp%3A%2F%2F10.rarbg.me%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.token.ro%3A80%2Fannounce&tr=udp%3A%2F%2F12.rarbg.me%3A80%2Fannounce', function(err, events) {

  if (err) {
    console.log(err);
    return;
  }

  events.on('download', function(torrent) {
    console.log('download', torrent);
  });

  events.on('error', function(error) {
    console.log('error', error);
  });

  events.on('complete', function(torrent) {

    uc.remove(torrent.hash, function(err, res) {

    });
    
  });

  events.on('noSeeds', function(torrent) {
    console.log('noseeds', torrent);
  });

  events.on('timeout', function(message) {
    console.log('timeout', message);
  });

});
