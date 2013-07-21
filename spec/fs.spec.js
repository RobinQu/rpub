/*global __dirname, __filename */

describe("FSStorage", function() {
  
  var rpub = require("../index"),
      path = require("path"),
      fs = require("fs"),
      uuid = require("uuid");
  
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
      expect(e).toBeFalsy();
      issue = p.issues[data.uuid];
      expect(issue).toBeTruthy();
      expect(issue.meta.name).toEqual(data.name);
      expect(issue.uuid).toEqual(data.uuid);
      expect(issue.meta.seqence).toEqual(data.sequence);
      expect(issue.meta.ctime).toBeTruthy();
      expect(issue.meta.mtime).toBeTruthy();
      
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
      expect(e).toBeFalsy();
      expect(issue).toBeTruthy();
      expect(issue.meta).toBeTruthy();
      expect(issue.source).toBeTruthy();
      done();
    });
  });
  

  
});