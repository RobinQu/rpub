(function() {
  
  var fs = require("fs"),
      path = require("path"),
      uuid = require("uuid");
  
  var FSStorage = module.exports = function(opt) {
    this.dir = opt.path;
    this.metaDir = path.join(this.dir, ".meta");
    if(!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    if(!fs.existsSync(this.metaDir) {
      fs.mkdirSync(this.metaDir);
    }
  };
  
  FSStorage.prototype.exists = function (issue, cb) {
    var fp;
    fp = path.join(this.dir, issue.name);
    return fs.exists(fp, cb);
  };
  
  FSStorage.prototype._meta = function (issue) {
    fs.writeFileSync(path.join(this.metaDir, issue.name), JSON.stringify(issue.meta));
  };
  
  FSStorage.prototype.save = function (issue, file, cb) {
    var input, fp, output, ver, that;
    ver = uuid.v4();
    that = this;
    fp = path.join(this.dir, issue.name, ver);
    if(typeof file === "string") {
      input = fs.createReadStream(file);
    } else {//treat as a stream
      input = file;
    }
    output = fs.createWriteStream(fp);
    input.pipe(output);
    output.on("error", function(e) {
      cb(e);
    });
    output.on("finish", function() {
      issue.version = ver;
      that._meta(issue);
      cb(null, issue);
    });
  };
  
  FSStorage.prototype.destroy = function (issue, cb) {
    var that;
    that = this;
    fs.unlink(path.join(this.dir, issue.name), function(e) {
      if(e) {
        return cb(e);
      }
      fs.unlinkSync(path.join(that.metaDir, issue.name));
    });
    
  };
  
  FSStorage.prototype.update = function (issue, fresh, cb) {
    var originalVersion = issue.version;
    issue.version = uuid.v4();
    this.save(issue, fresh, function(e) {
      var originalPath = path.join(this.dir, originalVersion);
      if(e) {
        return cb(e);
      }
      if(path.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
      issue.utime = Date.now();
      that._meta(issue);
      cb(null, issue);
    });
  };
  
  FSStorage.prototype.compact = function (manifest, cb) {
    var list, i, len, compacted, name, version, meta, files, issue, k;
    if(typeof manifest === "function") {
      cb = manifest;
      manifest = {};
    }
    //names of issues
    list = fs.readdirSync(this.dir);
    compacted = {};
    for(i=0, len=list.length; i<len; i++) {
      name = list[i];
      if(!fs.existsSync(path.join(this.dir, name))) {//main file missing; skip this entry
        continue;
      }
      files = fs.readdirSync(path.join(this.dir, name));
      if(!(files && files.length)) {//empty folder
        continue;
      }
      try {
        if(fs.existsSync(paht.join(this.metaDir, name))) {
          meta = JSON.parse(fs.readFileSync(paht.join(this.metaDir, name)));
        }
      } catch (e) {
        // parsing error or file misssing
        // we don't care about error
      } finally {
        if(!meta) {
          meta = {
            ctime: Date.now(),
            mtime: Date.now(),
            sequence: 0//sequence for recovered record
          };
        }
      } 
      version = files[0];
      if(manfiest[name]) {//inherit other properties in given manifest
        issue = manifest[name];
        issue.version = version;
      } else {//create new one
        issue = {
          name: name,
          version: version
        };
      }
      // for(k in meta) {//copy meta to issues
      //   if(meta.hasOwnProperty(k)) {
      //     issue[k] = meta[k];
      //   }
      // }
      issue.meta = meta;
      this._meta(issue);
      compacted[name] = issue;
    }
    cb(null, compacted);
  };
  
}());