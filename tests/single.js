/*global __filename */

var rpub = require("../index"),
    uuid = require("uuid");


var data = {
  uuid: uuid.v4(),
  name: uuid.v4()
};


var p = new rpub.Publisher({
  store: {
    type: "cloudfiles",
    apiKey: "",
    // region: "SYD",
    username: "robinqu",
    ssl: false,
    container: "catworks-test"
  }
});

p.on("init", function() {
  p.addIssue(data, __filename, function(e) {
    console.log(arguments);
  });
});