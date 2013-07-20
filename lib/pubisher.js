var store = require("./store");

(function() {
  
  var Publisher = module.exports = function(opt) {
    this.storage = store.getStorage(opt.store);
  };
  
  Publisher.prototype.publish = function () {
    
  };
  
  Publisher.prototype.addIssue = function () {
    
  };
  
  Publisher.prototype.removeIssue = function () {
    
  };
  
  Publisher.prototype.updateIssue = function () {
    
  };
  
  Publisher.prototype.allIssues = function () {
    
  };
  
  
}());