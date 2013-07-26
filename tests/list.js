var pkgcloud = require("pkgcloud");

var client = pkgcloud.storage.createClient({
  provider: "rackspace",
  username: "robinqu",
  apiKey: "",
  region: "SYD"
});

client.getContainers({
    loadCDNAttributes: true
  }, function(e, containters) {
  console.log(e, containters);
});