(function(Store) {
  
  Store.getStorage = function(opt) {
    opt = opt || {};
    opt.type = opt.type || "fs";
    opt.dir = opt.dir || process.cwd();
    return new (require("./storage/"+opt.type))(opt);
  };
  
}(exports));