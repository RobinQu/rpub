(function(Store) {
  
  Store.getStorage = function(opt) {
    opt = opt || {type:"fs",dir: process.cwd()};
    return new (require("./storage/"+opt.type))(opt);
  };
  
}(exports));