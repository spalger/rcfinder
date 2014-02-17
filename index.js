/**
 * [exports description]
 * @type {[type]}
 */
module.exports = RcFinder;

var path = require('path');
var fs = require('fs');

function RcFinder(rcName, opts) {
  if (!(this instanceof RcFinder))
    return new RcFinder(rcName, opts);

  opts = opts || {};
  var pathMap = {};
  var configMap = {};

  var loader = opts.loader || function (path) {
    return require(path);
  };

  this.find = function (from, cb) {
    from = from || process.cwd();

    var rcPath;
    var rcConfig;
    var checkPath;
    var searched = [];
    var dir = from;
    var sync = (typeof cb !== 'function');

    if (sync) {
      for (; !~searched.indexOf(dir); dir = path.resolve(dir, '..')) {
        if (pathMap[dir] !== void 0) {
          rcPath = pathMap[dir];
          break;
        }

        searched.push(dir);
        checkPath = path.join(dir, rcName);
        if (fs.existsSync(checkPath)) {
          rcPath = checkPath;
          break;
        }
      }

      if (rcPath) {
        rcConfig = configMap[rcPath] = (configMap[rcPath] || loader(rcPath));
        searched.forEach(function (dir) {
          pathMap[dir] = rcPath;
        });
        return rcConfig;
      }
    }

    // async find
    function next(done) {
      if (~searched.indexOf(dir))
        return done();

      if (pathMap[dir] !== void 0)
        return done(void 0, pathMap[dir]);

      searched.push(dir);
      checkPath = path.join(dir, rcName);
      fs.stat(checkPath, function (err, exists) {
        if (err && err.code !== 'ENOENT')
          return done(err);

        if (!err) return done(void 0, checkPath);

        dir = path.resolve(dir, '..');
        next(done);
      });
    }
    process.nextTick(function () {
      next(function (err, rcPath) {
        if (err) return cb(err);

        rcConfig = configMap[rcPath] = (configMap[rcPath] || loader(rcPath));
        searched.forEach(function (dir) {
          configMap[dir] = rcPath;
        });

        return cb(void 0, rcConfig);
      });
    });
  };
}