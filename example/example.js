var YouTubeDl = require('../');


var youTubeDl = new YouTubeDl()
youTubeDl.getInfo('youtube-dl -j -f best https://www.youtube.com/watch?v=E91HzMpkYog', function(err, info) {
  console.log(err);
  console.log(info);
});


var args = ['https://www.youtube.com/watch?v=E91HzMpkYog', '-f', 'best', '-o', '/Users/dave/downloads/%(id)s.%(ext)s', '--no-playlist', '--max-downloads=1', '--retries=0']
//youTubeDl.download(args)


youTubeDl.on('progress', function(dl) {
  console.log(dl);
});

youTubeDl.on('complete', function(dl) {
  console.log(dl);
});

youTubeDl.on('error', function(error) {
  console.log(error);
});
