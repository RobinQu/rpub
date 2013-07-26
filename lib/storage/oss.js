// OSS has defects regarding meta data handling, making it impossible to build rpub with, at least for now


// (function() {
//   
//   var OssClient = require('oss-client').OssClient,
//       zlib = require("zlib"),
//       Buffer = require("buffer").Buffer,
//       domain = require("domain");
//   
//   var MetaDataHeaderName = "x-oss-meta-data";
//   
//   var OSSStorage = module.exports = function(opt) {
//     this.oss = new OssClient(opt.credential);
//     this.bucket = opt.bucket;
//     this.oss.createBucket(this.bucket, this.oss.acl, function(e) {
//       if(e) {
//         console.error("failed to create oss bucket", e);
//       }
//     });
//   };
//   
//   OSSStorage.MetaUnavailableError = "meta missing";
//   OSSStorage.MissingContentLengthForStream = "content-length is required to use strema as input file";
//   
//   OSSStorage.prototype.name = "oss";
//   
//   OSSStorage.prototype._metaname = function (uuid) {
//     return uuid + ".meta";
//   };
//   
//   OSSStorage.prototype._compressmeta = function (issue, cb) {
//     zlib.deflate(JSON.stringify(issue.meta),function(e, compressed) {
//       if(e) {
//         return cb(e);
//       }
//       var datastr;
//       datastr = compressed.toString("base64");
//       cb(null, datastr);
//     });
//   };
//   
//   OSSStorage.prototype.info = function (issue, cb) {
//     var d;
//     if(typeof issue === "string") {
//       issue = {
//         uuid: issue
//       };
//     }
//     d = domain.create();
//     this.oss.headObject(this.bucket, this._metaname(issue.uuid), d.intercept(function( headers) {
//       var data, compressed;
//       //zlib compressed data
//       data = headers[MetaDataHeaderName];
//       if(data && data.length) {
//         compressed = new Buffer(data, "base64");
//         zlib.inflate(compressed, d.intercept(function(decompressed) {
//           issue.meta = JSON.parse(decompressed);
//         }));
//       } else {
//         cb(new Error(OSSStorage.MetaUnavailableError));
//       }
//     }));
//     
//     d.on("error", function(e) {
//       cb(e);
//     });
//   };
//   
//   OSSStorage.prototype.save = function (issue, file, cb) {
//     var d, that;
//     
//     d = domain.create();
//     if(file instanceof require("stream") && !file.contentLength) {
//       return cb(new Error(OSSStorage.MissingContentLengthForStream));
//     }
//     that = this;
//     //create meta first
//     issue.meta = issue.meta || {};
//     issue.meta.ctime = issue.meta.ctime || Date.now();
//     issue.meta.mtime = Date.now();
//     
//     d.run(function() {
//       that._compressmeta(issue, d.intercept(function(datastr) {
//         var meta;
//         meta = {};
//         meta[MetaDataHeaderName] = datastr;
//         that.oss.pubObject({
//           bucket: that.bucket,
//           object: that._metaname(issue.uuid),
//           srcFile: new Buffer("0"),
//           userMetas: meta
//         }, d.intercept(function() {
//           //upload main file
//           that.oss.putObject({
//             bucket: that.bucket,
//             object: issue.uuid,
//             srcFile: file,
//             contentLength: file.contentLength
//           }, d.intercept(function() {
//             cb(null, issue);
//           }));
//         }));
//         
//       }));
//     });
//     
//     d.on("error", function(e) {
//       cb(e);
//     });
//     
//   };
//   
//   OSSStorage.prototype.destroy = function (issueOrUUID, cb) {
//     var that, uuid;
//     that = this;
//     uuid = (typeof issueOrUUID === "string") ? issueOrUUID : issueOrUUID.uuid;
//     
//     that.oss.deleteObject(that.bucket, uuid, function(e) {//delete main file first
//       if(e) {
//         return cb(e);
//       }
//       that.oss.deleteObject(that.bucket, that._metaname(uuid), function(e) {
//         if(e) {
//           return cb(e);
//         }
//         cb(null);
//       });
//     });
//   };
//   
//   OSSStorage.prototype.update = function (issue, fresh, cb) {
//     if(typeof fresh === "function") {//only issue info is passed in
//       cb = fresh;
//       fresh = null;
//     }
//     var that, d;
//     that = this;
//     d = domain.create();
//     
//     d.run(function() {
//       that._compressmeta(d.intercept(function(datastr) {
//         var meta;
//         meta = {};
//         meta[MetaDataHeaderName] = datastr;
//         that.oss.pubObject({//update meta first
//           bucket: that.bucket,
//           object: that._metaname(issue.uuid),
//           userMetas: meta,
//           srcFile: new Buffer("0", "utf8")
//         }, d.intercept(function() {
//           if(!fresh) {//if we don't have new file to be uploaded
//             cb();
//           }
//           var options;
//           options = {
//             bucket: that.bucket,
//             object: issue.uuid
//           };
//           if(fresh instanceof require("stream")) {
//             options.contentLength = fresh.contentLength;
//           }
//           that.oss.pubObject(options, fresh, d.intercept(cb));
//         }));
//       }));
//     });
//     
//     d.on("error", function(e) {
//       cb(e);
//     });
//   };
//   
//   OSSStorage.prototype.compact = function (manifest, cb) {
//     var compacted, that, d;
//     if(typeof manifest === "function") {
//       cb = manifest;
//       manifest = {};
//     }
//     that = this;
//     compacted = {};
//     d = domain.create();
//     that.oss.listObject(that.bucket, d.intercept(function(result) {
//       var list, i, len, items, metas, item;
//       list = result.ListBucketResult;
//       items = {};
//       metas = {};
//       for(i=0,len=list.length;i<len;i+=2) {
//         item = list[i];
//         items[item.Name] = 
//       }
//     }));
//     
//   };
//   
// }());