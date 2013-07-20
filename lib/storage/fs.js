(function() {
  
  var fs = require("fs"),
      path = require("path"),
      uuid = require("uuid");
  
  var FSStorage = module.exports = function(opt) {
    this.dir = opt.path;
    if(!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
  };
  
  FSStorage.prototype.save = function (issue, cb) {
    var input, fp, output, ver;
    ver = uuid.v4();
    fp = path.join(this.dir, issue.name, ver);
    if(typeof issue.file === "string") {
      input = fs.createReadStream(issue.file);
    } else {//treat as a stream
      input = issue.file;
    }
    output = fs.createWriteStream(fp);
    input.pipe(output);
    output.on("error", function(e) {
      if(cb) {cb(e);}
    });
    output.on("finish", function() {
      issue.version = ver;
      if(cb) {cb(null, issue);}
    });
  };
  
  FSStorage.prototype.destroy = function (issue, cb) {
    var fp;
    fp = fp = path.join(this.dir, issue.name, issue.version);
    fs.unlink(fp, cb);
  };
  
  FSStorage.prototype.update = function (issue, fresh, cb) {
    var original;
    original = issue.file;
    issue.file = fresh;
    this.save(issue, function(e) {
      if(e) {
        issue.file = original;
        if(cb) {cb(e);}
      } else {
        if(cb) {cb(null, issue);}
      }
    });
  };
  
  FSStorage.prototype.compact = function (manifest, cb) {
    var list, i, len, compacted, name;
    try {
      //names of issues
      list = fs.readdirSync(this.dir);
      compacted = [];
      for(i=0, len=list.length; i<len; i++) {
        name = list[i];
        if(fs.existsSync(path.join(this.dir, name)) && manfiest[name]) {
          manifest[name].version = fs.readdirSync(path.join(this.dir, name))[0];
          compacted.push(manifest[name]);
        }
      }
    } catch(e) {
      if(cb) {cb(e);}
      return;
    }
    if(cb) {
      cb(null, compacted);
    }
  };
  
}());