exports.toBytes = function(dec, size) {
  
  if(size){

    function squared(i){
      return i*i;
    }

    function cubed(i){
      return i*squared(i);
    }

    var kB = 1024
      , mB = squared(1024)
      , gB = cubed(1024);

    if (size == 'GiB' || size == 'GB') {
      return dec * gB;
    } if (size == 'KiB' || size == 'KB') {
      return dec * kB;
    } else {
      return dec * mB;
    }

  }
  return 0;

};
