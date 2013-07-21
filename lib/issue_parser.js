(function() {
  
  var IssueParser = module.exports = function() {};
  
  IssueParser.info = function(publisher, issue, cb) {
    return publisher.storage.info(issue, cb);
    
  };
  
}());