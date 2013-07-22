(function() {
  
  var OssClient = require('oss-client').OssClient;
  
  var OSSStorage = module.exports = function(opt) {
    this.oss = new OssClient(opt.credential);
    this.bucket = opt.bucket;
  };
  
  OSSStorage.prototype.name = "oss";
  
  OSSStorage.prototype.info = function (uuid, cb) {
    this.oss.headObject(this.bucket, uuid, function(e, headers) {
      if(e) {
        return cb(e);
      }
      
    });
  };
  
  OSSStorage.prototype.save = function () {
    
  };
  
  OSSStorage.prototype.destroy = function () {
    
  };
  
  OSSStorage.prototype.update = function () {
    
  };
  
  OSSStorage.prototype.compact = function () {
    
  };
  
}());