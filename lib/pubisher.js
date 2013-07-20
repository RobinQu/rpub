var store = require("./store");

(function() {
  
  var noop = function() {};
  
  var Publisher = module.exports = function(opt) {
    this.storage = store.getStorage(opt.store);
    this.issues = {};
  };
  
  Publisher.DuplicatedRecordError = "dupliacted issue record";
  Publisher.MissingRequiredParametersError = "lack of required parameters";
  Publisher.UnknownIssueError = "Unknown Issue";
  
  Publisher.reload = function(cb) {
    var that = this;
    cb = cb || noop;
    that.storage.compact(function(e, list) {
      if(e) {
        return cb(e);
      }
      that.issues = list;
      cb(null);
    });
  };
  
  Publisher.prototype.diff = function (manifest, cb) {
    
  };
  
  Publisher.prototype.addIssue = function (issue, file, cb) {
    cb = cb || noop;
    if(!name || !file) {
      return cb(new Error(Publisher.MissingRequiredParametersError));
    }
    var that = this;
    
    issue.meta = {
      sequence: issue.seqence || -1,
      ctime: Date.now(),
      mtime: Date.now()
    };
    delete issue.seqence;
    that.storage.exists(issue, function(exists) {
      if(exists) {
        return cb(new Error(Publisher.DuplicatedRecordError));
      }
      that.storage.save(issue, file, function(e, issue) {
        if(e) {
          return cb(e);
        }
        that.issues[name] = issue;
        cb(null);
      });
    });
  };
  
  Publisher.prototype.removeIssue = function (name, cb) {
    var issue, that;
    issue = this.issues[name];
    cb = cb || noop;
    if(!issue) {
      return cb(new Error(Publisher.UnknownIssueError));
    }
    that = this;
    this.storage.destroy(issue, function(e) {
      if(e) {
        return cb(e);
      }
      delete that.issues[name];
      cb(null);
    });
  };
  
  Publisher.prototype.updateIssue = function (name, file, cb) {
    var issue, that;
    issue = this.issues[name];
    cb = cb || noop;
    that = this;
    if(!issue) {
      return cb(new Error(Publisher.UnknownIssueError));
    }
    this.storage.update(issue, function(e, data) {
      if(e) {
        return cb(e);
      }
      that.issues[name] = data;
      cb(null);
    });
    
  };
  
  
  
}());