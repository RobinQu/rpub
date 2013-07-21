var store = require("./store"),
    IssueParser = require("./issue_parser"),
    uuid = require("uuid");

(function() {
  
  var noop = function() {};
  
  var Publisher = module.exports = function(opt) {
    opt = opt || {};
    this.storage = store.getStorage(opt.store);
    this.issues = {};
  };
  
  Publisher.DuplicatedRecordError = "dupliacted issue record";
  Publisher.MissingRequiredParametersError = "lack of required parameters";
  Publisher.UnknownIssueError = "Unknown Issue";
  
  Publisher.prototype.reload = function(cb) {
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
  
  Publisher.prototype.info = function (issue, cb) {
    return IssueParser.info(this, issue, cb);
  };
  
  Publisher.prototype._completeDiff = function () {
    return {
      "new": this.issues,
      "updated": [],
      "revoked": []
    };
  };
  
  Publisher.prototype.diff = function (manifest, cb) {
    var existing, added, revoked, updated, diff, i, len, uuid, uuids;
    //quick diff
    if(!manifest) {
      diff = this._completeDiff();
    }
    existing = manifest.issues;
    if(!existing || !existing.length) {
      diff = this._completeDiff();
    }
    if(diff) {
      return cb(null, diff);
    }
    //diff comparing to given manifest
    diff = {};
    revoked = [];
    added = [];
    updated = [];
    for(i=0,len=existing.length; i<len; i++) {
      uuid = existing[i].uuid;
      if(this.issues[uuid]) {
        if(this.issues[uuid].meta.mtime > existing[i].meta.mtime) {//update
          updated.push(this.issues[uuid]);
        }
      } else {//revoked
        revoked.push(uuid);
      }
    }
    uuids = existing.map(function(item) {
      return item.uuid;
    });
    for(i=0,len=this.issues.length; i<len; i++) {
      uuid = this.issues[i];
      if(uuids.indexOf(uuid) === -1) {
        added.push(this.issues[i]);
      }
    }
    return {
      "new": added,
      "revoked": revoked,
      "updated": updated,
      "mtime": Date.now()
    };
  };
  
  Publisher.prototype.addIssue = function (data, file, cb) {
    cb = cb || noop;
    if(!data || !file) {
      return cb(new Error(Publisher.MissingRequiredParametersError));
    }
    var that = this, issue;
    
    issue = {};
    issue.uuid = data.uuid || uuid.v4();
    issue.meta = {
      name: data.name,
      sequence: data.sequence || -1,
      ctime: Date.now(),
      mtime: Date.now()
    };
    that.storage.exists(issue, function(exists) {
      if(exists) {
        return cb(new Error(Publisher.DuplicatedRecordError));
      }
      that.storage.save(issue, file, function(e, issue) {
        if(e) {
          return cb(e);
        }
        that.issues[issue.uuid] = issue;
        cb(null);
      });
    });
  };
  
  Publisher.prototype.revokeIssue = function (uuid, cb) {
    var issue, that;
    issue = this.issues[uuid];
    cb = cb || noop;
    if(!issue) {
      return cb(new Error(Publisher.UnknownIssueError));
    }
    that = this;
    this.storage.destroy(issue, function(e) {
      if(e) {
        return cb(e);
      }
      delete that.issues[uuid];
      cb(null);
    });
  };
  
  Publisher.prototype.updateIssue = function (issueOrUUID, file, cb) {
    var that, k, obj, uuid;
    if(typeof issueOrUUID === "string") {
      obj = this.issues[issueOrUUID];
      uuid = issueOrUUID;
    } else {
      uuid = issueOrUUID.uuid;
    }
    
    if(!obj && this.issues[uuid]) {//grab info from existing issue data
      obj = Object.create(this.issues[uuid]);
      if(issueOrUUID.meta) {
        for(k in issueOrUUID.meta) {
          if(issueOrUUID.meta.hasOwnProperty(k)) {
            obj.meta[k] = issueOrUUID.meta[k];
          }
        }
      }
    }
    
    if(!obj) {//none previous routes is entered
      return cb(new Error(Publisher.UnknownIssueError));
    }

    cb = cb || noop;
    that = this;

    this.storage.update(obj, file, function(e, issue) {
      if(e) {
        return cb(e);
      }
      that.issues[issue.uuid] = issue;
      cb(null, issue);
    });
    
  };
  
  
  
}());