// # Publisher, taking charges of a collection of issues
//
// Issue definition:
// `issue.uuid`, a string that complies to UUID v4
// `issue.meta`, an object that stores meta info of this issue
// `issue.meta.ctime`, creation time, in unix timestamp
// `issue.meta.mtime`, modification time, in unix timestamp
// `isssue.meta.sequence`, issue sequence in this publisher's collection
// `issue.meta.name`, a human readable string that identifies this issue


(function() {
  
  var noop = function() {};
  
  var IssueParser = require("./issue_parser"),
      uuid = require("uuid"),
      EventEmitter = require("events").EventEmitter,
      util = require("util"),
      domain = require("domain");
  
  
  // `Publisher`, the public class that handles issues' data.
  //
  // `opt` is passed to constructor to do various configuration.
  // `opt.type`, identifier of backing store of issue data. Possbile values are `fs` and `oss`. (`s3` the in near future)
  // 
  // `fs` backing store is primary for test purpose. It stores all issue data on local filesystem. Meta data is perisitent in the same directory, recorded in JSON format. Due to the nature of file system, corruption of meta data is presumebly possible. However, `fs` storage policy will try hard to guess meta data for the existing issue data file.
  // `fs` storage accepts the only paramter `opt.dir` to assign its default location.
  //
  // `oss` backing store is object storage service provided by Aliyun. Issue files and their meta data will be transported to remote storage via HTTP requests.
  // As we all known, services like `oss` requires authentication data. In our senario, you should pass those access key(`opt.credential.accessKeySecret`) and access id(`opt.credential.accessKeyId`).
  
  var Publisher = module.exports = function(opt) {
    var that = this, d;
    EventEmitter.call(this);
    opt = opt || {};
    d = domain.create();
    d.run(function() {
      var S;
      opt.store = opt.store || {};
      opt.store.type = opt.store.type || "fs";
      opt.store.dir = opt.store.dir || process.cwd();
      opt.store.domain = d;
      S = require("./storage/"+opt.store.type);
      that.storage = new S(opt.store, function() {
        d.dispose();
        that.emit("ready");
        // console.log("should be over");
      });
    });
    
    this.issues = {};
    d.on("error", function(e) {
      console.error(e);
      throw e;
    });
  };
  util.inherits(Publisher, EventEmitter);
  
  Publisher.DuplicatedRecordError = "dupliacted issue record";
  Publisher.MissingRequiredParametersError = "lack of required parameters";
  Publisher.UnknownIssueError = "Unknown Issue";
  
  
  // `reload`, sync remote issues data to local
  Publisher.prototype.reload = function(cb) {
    var that = this;
    cb = cb || noop;
    that.storage.compact(this.issues, function(e, list) {
      if(e) {
        return cb(e);
      }
      that.issues = list;
      cb(null, list);
    });
  };
  
  // `info`, get only meta info of this issue
  Publisher.prototype.info = function (issue, cb) {
    if(typeof issue === "string") {
      issue = {
        uuid: issue
      };
    }
    return IssueParser.info(this, issue, cb);
  };
  
  Publisher.prototype._completeDiff = function () {
    return {
      "new": this.issues,
      "updated": [],
      "revoked": []
    };
  };
  
  // `diff`, generate diff data by given manifest. Used by clients for atomic udpates. A `reload` action should be performed before `diff` to ensure most up-to-date diff.
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
  
  // `addIssue`, upload issue to publisher's backing store
  //
  // `data` is an issue descriptor which should have following properties
  //
  // * `data.name`, human readable identifier for this issue
  // * `data.meta.sequence`, a sequence number of this issue within this publisher
  //
  // `data.uuid` is optional. We will generate a uuid(v4) for you.
  //
  // `file` can be a readable stream that piped from the issue file, or it can be the file path to the issue file on file system.
  //
  // Callback function `cb` is always optional.
  Publisher.prototype.addIssue = function (data, file, cb) {
    cb = cb || noop;
    if(!data || !file || !data.name) {
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
      // console.log("save");
      that.storage.save(issue, file, function(e, issue) {
        if(e) {
          return cb(e);
        }
        that.issues[issue.uuid] = issue;
        cb(null);
      });
    });
  };
  
  // `revokeIssue`, for the sake of readers, a released issue can never be deleted. However, you can mark a issue to be revoked in order to notify clients to pull it down from the store shelf. Of course, it's always up to you to decide if we should delete the data file in the same time.
  //
  // `uuid` is required, and you can also give a optional callback function `cb`.
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
  
  // `updateIssue` is designed to update resource file of given issue.
  // You can pass a uuid to reference the issue to be updated.
  // Or you can pass a plain objects that suppliment the issue descriptor. A correct uuid should be a member of this object. `meta` attribtes will be copied.
  // Like `save` method, second parameter `file` can be a readable stream or a file path.
  // Callback function `cb` is optional, as always.
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