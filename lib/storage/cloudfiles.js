(function() {
  
  var pkgcloud = require("pkgcloud"),
      domain = require("domain"),
      fs = require("fs");
  
  var CFStorage = module.exports = function(opt) {
    var that;
    
    that = this;
    this.container = opt.container;
    this.client = pkgcloud.storage.createClient({
      provider: "rackspace",
      username: opt.username,
      apiKey: opt.apiKey,
      region: opt.region
    });
    this.containerURLs = {};
    that.client.setAuth(function() {
      // A single call to `createContainer` should be enough, however, `pkgcloud`'s lacking support for CDN-enabled container in that method; 
      // so we do `refreshCdnDetails` on container 
      that.client.createContainer(that.container, opt.domain.intercept(function( containerObj) {
        containerObj.refreshCdnDetails(opt.domain.intercept(function() {
          that.containerURLs = {
            http: containerObj.cdnUri,
            https: containerObj.cdnSslUri
          };
        }));
      }));
    });
  };
  
  CFStorage.prototype.name = "cloudfiles";
  
  CFStorage.prototype._meta = function (issue) {
    var that;
    that = this;
    Object.defineProperty(issue, "source", {
      get: function() {
        return that.containerURLS.http + "/" + issue.uuid;
      },
      enumerable: false,
      configurable: true
    });
  };
  
  CFStorage.prototype.save = function (issue, file, cb) {
    var options;
    issue.meta = issue.meta || {};
    issue.meta.ctime = issue.meta.ctime || Date.now();
    issue.meta.mtime = Date.now();
    options = {
      container: this.container,
      remote: issue.uuid,
      metadata: issue.meta
    };
    if(typeof file === "string") {
      options.local = file;
    } else {//assuming it's a stream
      options.stream = file;
    }
    this.client.upload(options, cb);
  };
  
  CFStorage.prototype.info = function (issue, cb) {
    var that;
    that = this;
    this.client.getFile(this.container, issue.uuid, function(e, file) {
      if(e) {
        return cb(e);
      }
      issue.meta = file.metadata;
      return cb(null, that._meta(issue));
    });
  };
  
  CFStorage.prototype.update = function (issue, fresh, cb) {
    if(typeof fresh === "function") {//only issue info is passed in
      cb = fresh;
      fresh = null;
    }
    var that, d;
    that = this;
    d = domain.create();
    //first get latest file
    that.client.getFile(this.container, issue.uuid, d.intercept(function(file) {
      var upload, readable, k;
      //merge given issue's meta into fetched meta
      for(k in issue.meta) {
        if(issue.meta.hasOwnProperty(k)) {
          file.metadata[k] = issue.meta[k];
        }
      }
      if(fresh) {//upload file together with metadata
        upload = that.client.upload({
          container: that.container,
          remote: issue.uuid,
          metadata: file.metadata
        }, d.intercept(function() {
          //TODO update internal issue object
          cb();
        }));
        readable = typeof fresh === "string" ? fs.createReadStream(fresh): fresh;
        readable.pipe(upload);
      }
      
      that.client.updatefileMetadata(file.container, file, d.intercept(function() {
        //TODO update internal issue object
        cb();
      }));
    }));
    
    d.on("error", function(e) {
      cb(e);
    });
    
  };
  
  CFStorage.prototype.destroy = function (issue, cb) {
    if(typeof issue === "string") {
      issue = {
        uuid: issue
      };
    }
    this.client.removeFile(this.container, {//mock a file model
      name: issue.uuid,
      container: this.container
    }, cb);
  };
  
  CFStorage.prototype.compact = function (manifest, cb) {
    if(typeof manifest === "function") {
      cb = manifest;
      manifest = {};
    }
    var compacted;
    compacted = {};
    this.client.getFiles(this.container, function(e, files) {
      if(e) {
        return cb(e);
      }
      var i, len, file, uuid;
      for(i=0, len=files.length; i<len; i++) {
        file = files[i];
        uuid = file.name;
        if(manifest[uuid]) {
          compacted[uuid] = {
            uuid: uuid,
            meta: file.metadata
          };
        }
      }
      cb(null, compacted);
    });
    
  };
  
}());