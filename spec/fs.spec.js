/*global __dirname, __filename */

var expect = require('chai').expect;

describe("FSStorage", function() {
  
  var rpub = require("../index"),
      path = require("path"),
      fs = require("fs"),
      uuid = require("uuid"),
      child_prcess = require("child_process");
  
  var tmpdir = path.resolve(__dirname, "../tmp");
  if(!fs.existsSync(tmpdir)) {
    fs.mkdirSync(tmpdir);
  }
  var p = new rpub.Publisher({
    store: {dir:tmpdir}
  });
  
  var data = {
    uuid: uuid.v4(),
    name: uuid.v4()
  };
  
  //any file is okay; publisher don't care about the format and content of issue file
  it("should add issue", function(done) {
    p.addIssue(data, __filename, function(e) {
      done();
      var issue;
      expect(e).to.be.null;
      issue = p.issues[data.uuid];
      expect(issue).to.be.ok;
      expect(issue.meta.name).to.eql(data.name);
      expect(issue.uuid).to.eql(data.uuid);
      expect(issue.meta.seqence).to.eql(data.sequence);
      expect(issue.meta.ctime).to.be.ok;
      expect(issue.meta.mtime).to.be.ok;
      
    });
    
  });
  
  // it("should find out existing issue", function() {
  //   var flag = false;
  //   
  //   runs(function() {
  //     p.exists(uuid, function(exists) {
  //       flag = true;
  //       expect(exists).toBeTruthy();
  //     });
  //   });
  //   
  //   waitsFor(function() {
  //     return flag;
  //   }, "Issue should exist", 1000);
  //   
  // });
 //  
  it("should fetch info for existing issue", function(done) {
    p.info(data.uuid, function(e, issue) {
      expect(e).to.be.null;
      expect(issue).to.be.ok;
      expect(issue.meta).to.be.ok;
      expect(issue.source).to.be.ok;
      done();
    });
  });
  
  it("should update an issue", function(done) {
    var newdata = {meta:{sequence:5,name:uuid.v4()}, uuid: data.uuid};
    p.updateIssue(newdata, require.main.filename, function(e, issue) {
      expect(e).to.be.null;
      expect(issue.meta.name).to.eql(newdata.meta.name);
      expect(issue.meta.sequence).to.eql(newdata.meta.sequence);
      done();
    });
  });
  
  it("should destroy an issue", function(done) {
    p.revokeIssue(data.uuid, function(e) {
      expect(e).to.be.null;
      expect(p[data.uuid]).to.be.undefined;
      p.info(data.uuid, function(e) {
        expect(e).to.be.ok;
        done();
      });
    });
  });
  
  
  it("should reload what lives on the fs", function(done) {
    var len = 5, uuids, u;
    
    uuids = [];
    while(len--) {
      u = uuid.v4();
      uuids.push(u);
      p.addIssue({
        uuid: u,
        name: u
      }, __filename);
    }
    
    setTimeout(function() {
      var p2 = new rpub.Publisher({
        store: {dir:tmpdir}
      });
    
      p2.reload(function(e, list) {
        expect(e).to.be.null;
        expect(Object.keys(list).length).to.eql(uuids.length);
        Object.keys(p2.issues).forEach(function(u) {
          expect(uuids.indexOf(u) > -1).to.be.true;
        });
        
        child_prcess.exec("rm -rf " + tmpdir, done);
      });
    }, 200);
    
  });
  
  
  
});