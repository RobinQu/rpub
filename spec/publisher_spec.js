var rpub = require("../index");

describe("Publisher", function() {
  
  var Publisher = rpub.Publisher;
  
  it("should create with default fs storage", function() {
    var p = new Publisher();
    expect(p.storage).toBeTruthy();
    expect(p.storage.name).toEqual("fs");
    expect(p.storage.dir).toEqual(process.cwd());
  });
  
});