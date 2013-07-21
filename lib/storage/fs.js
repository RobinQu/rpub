(function() {
  
  var fs = require("fs"),
      path = require("path"),
      Buffer = require("buffer").Buffer,
      mkdirp = require("mkdirp");
  
  var FSStorage = module.exports = function(opt) {
    this.dir = opt.dir;
    this.metaDir = path.join(this.dir, ".meta");
    if(!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    if(!fs.existsSync(this.metaDir)) {
      fs.mkdirSync(this.metaDir);
    }
  };
  
  //base64 name tables
  FSStorage._encodedNames = {};
  
  FSStorage.prototype.name = "fs";
  
  FSStorage.prototype._metapath = function (uuid) {
    return path.join(this.metaDir, uuid);
  };
  
  FSStorage.prototype._dirpath = function (uuid) {
    return path.join(this.dir, uuid);
  };
  
  FSStorage.prototype._filepath = function (issue) {
    var encoded;
    encoded = FSStorage._encodedNames[issue.meta.name];
    if(!encoded) {
      encoded = FSStorage._encodedNames[issue.meta.name] = (new Buffer(issue.meta.name)).toString("base64");
    }
    return path.join(this.dir, issue.uuid, encoded);
  };
  
  FSStorage.prototype.exists = function (uuid, cb) {
    return fs.exists(this._dirpath(uuid.uuid || uuid), cb);
  };
  
  FSStorage.prototype._meta = function (issue) {
    var that;
    that = this;
    fs.writeFileSync(this._metapath(issue.uuid), JSON.stringify(issue.meta));
    Object.defineProperty(issue, "source", {
      get: function() {
        return that._filepath(issue);
      },
      enumerable: false,
      configurable: true
    });
  };
  
  FSStorage.MetaFileNotFoundError = "meta file is missing";
  
  FSStorage.prototype._emptymeta = function (uuid) {
    var meta, names;
    meta = {
      name: "unknown issue",
      ctime: Date.now(),
      mtime: Date.now(),
      sequence: 0//sequence for recovered record
    };

    if(uuid) {
      names = fs.readdirSync(this._dirpath(uuid));
      if(names && names.length) {
        meta.name = new Buffer(names[0], "base64").toString();
      }
    }
    return meta;
  };
  
  
  FSStorage.prototype.info = function (issue, cb) {
    if(typeof issue === "string") {
      issue = {
        uuid: issue
      };
    }
    //stop if meta file is absent
    if(!fs.existsSync(this._metapath(issue.uuid))) {
      return cb(new Error(FSStorage.MetaFileNotFoundError));
    }
    //try to pasre anything in that seat
    try {
      issue.meta = this._buildmeta(JSON.parse(fs.readFileSync(this._metapath(issue.uuid))));
    } catch(e) {//rebuild if corrupted
      issue.meta = this._emptymeta(issue.uuid);
    }
    this._meta(issue);
    cb(null, issue);
  };
    
  FSStorage.prototype.save = function (issue, file, cb) {
    var input, fp, output, that, isUpdate;
    that = this;
    fp = this._filepath(issue);
    if(fs.existsSync(fp)) {//update action
      fp += ".new";
      isUpdate = true;
    }

    mkdirp.sync(this._dirpath(issue.uuid));

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
    output.on("close", function() {
      if(isUpdate) {
        fs.unlinkSync(that._filepath(issue));
        fs.renameSync(fp, that._filepath(issue));
      }
      issue.meta = issue.meta || {};
      issue.meta.ctime = issue.meta.ctime || Date.now();
      issue.meta.mtime = Date.now();
      that._meta(issue);
      cb(null, issue);
    });
  };
  
  FSStorage.prototype.destroy = function (issueOrUUID, cb) {
    var that, uuid;
    that = this;
    uuid = (typeof issueOrUUID === "string") ? issueOrUUID : issueOrUUID.uuid;
    fs.unlink(that._dirpath(uuid), function(e) {
      if(e) {
        return cb(e);
      }
      fs.unlinkSync(that._metapath(uuid));
    });
    
  };
  
  FSStorage.prototype.update = function (issue, fresh, cb) {
    // var that, originalUUID;
    // 
    // that = this;
    // this.save(issue, fresh, function(e) {
    //   if(e) {
    //     return cb(e);
    //   }
    //   that.destroy(originalUUID, function(e) {
    //     if(e) {
    //       return cb(e);
    //     }
    //     cb(null, issue);
    //   });
    // });
    this.save(issue, fresh, cb);
  };
  
  FSStorage.prototype.compact = function (manifest, cb) {
    var list, i, len, compacted, uuid, meta, issue;
    if(typeof manifest === "function") {
      cb = manifest;
      manifest = {};
    }
    //names of issues
    list = fs.readdirSync(this.dir);
    compacted = {};
    for(i=0, len=list.length; i<len; i++) {
      uuid = list[i];
      try {
        if(fs.existsSync(this._metapath(uuid))) {
          meta = JSON.parse(fs.readFileSync(this._metapath(uuid)));
        }
      } catch (e) {
        // parsing error or file misssing
        // we don't care about error
        meta = this._emptymeta(uuid);
      }
      if(manifest[name]) {//inherit other properties in given manifest
        issue = manifest[name];
        issue.uuid = uuid;
      } else {//create new one
        issue = {
          name: name,
          uuid: uuid
        };
      }
      issue.meta = meta;
      this._meta(issue);
      compacted[name] = issue;
    }
    cb(null, compacted);
  };
  
}());