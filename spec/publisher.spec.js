var rpub = require("../index");

var expect = require('chai').expect;

describe("Publisher", function() {
  
  var Publisher = rpub.Publisher;
  
  it("should create with default fs storage", function() {
    var p = new Publisher();
    expect(p.storage).to.be.ok;
    expect(p.storage.name).to.eql("fs");
    expect(p.storage.dir).to.eql(process.cwd());
  });
  
});