/*global __filename */

var expect = require('chai').expect;

describe("CloudFiles Storage", function() {
  
  var rpub = require("../index"),
      uuid = require("uuid");
      
  var p;
  

  var data = {
    uuid: uuid.v4(),
    name: uuid.v4()
  };
  
  var options = {
    store:    {
      type: "cloudfiles",
      apiKey: "",
      // region: "SYD",
      username: "robinqu",
      ssl: false,
      container: "catworks-test"
    }
  };
  
  //relax timeout
  this.timeout(10000);
  
  it("shoud create with a publisher", function(done) {
    p = new rpub.Publisher(options);
    p.on("ready", done);
  });

  //any file is okay; publisher don't care about the format and content of issue file
  it("should add issue", function(done) {
    p.addIssue(data, __filename, function(e) {
      var issue;
      expect(e).to.be.null;
      issue = p.issues[data.uuid];
      expect(issue.meta.name).to.eql(data.name);
      expect(issue.uuid).to.eql(data.uuid);
      expect(issue.meta.seqence).to.eql(data.sequence);
      expect(issue.meta.ctime).to.be.ok;
      expect(issue.meta.mtime).to.be.ok;
      done();
    });
  });
  
  it("should reload content", function(done) {
    var p2 = new rpub.Publisher(options);
    p2.on("ready", function() {
      p2.reload(function(e, files) {
        expect(files[data.uuid]).to.be.ok;
        expect(files[data.uuid].meta).to.be.ok;
        expect(files[data.uuid].meta.ctime).to.be.ok;
        done();
      });
    });
  });
  
  it("should update file with metadata", function(done) {
    var _issue = p.issues[data.uuid];
    _issue.meta.mtime = Date.now();
    p.updateIssue(_issue, require.main.filename, function(e, issue) {
      expect(e).to.be.null;
      expect(issue.meta.mtime).to.eql(_issue.meta.mtime);
      done();
    });
  });
  
  it("should destroy issue", function(done) {
    p.revokeIssue(data.uuid, function(e) {
      expect(e).to.be.null;
      p.info(data.uuid, function(e) {
        expect(e).to.be.ok;
        done();
      });
    });
  });
  
  
});