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
    return JSON.parse(fs.readFileSync(path));
  };

  // configurable to make testing simpler
  var syncCheck = opts._syncCheck || function (path) {
    return fs.existsSync(path);
  };
  var asyncCheck = opts._syncCheck || function (path, cb) {
    fs.stat(path, function (err, exists) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb(void 0, !err);
    });
  };

  this.find = function (from, cb) {
    from = from || process.cwd();

    var rcPath;
    var rcConfig;
    var checkPath;
    var searched = [];
    var dir = from;
    var sync = (typeof cb !== 'function');

    function respond(err, rcPath) {
      if (rcPath) {
        if (configMap[rcPath] === void 0) {
          configMap[rcPath] = loader(rcPath);
        }
        rcConfig = configMap[rcPath];
      } else {
        rcConfig = rcPath = false;
      }

      searched.forEach(function (dir) {
        pathMap[dir] = rcPath;
      });

      return sync ? rcConfig : cb(void 0, rcConfig);
    }

    if (sync) {
      for (; !~searched.indexOf(dir); dir = path.resolve(dir, '..')) {
        if (pathMap[dir] !== void 0) {
          rcPath = pathMap[dir];
          break;
        }

        searched.push(dir);
        checkPath = path.join(dir, rcName);
        if (syncCheck(checkPath)) {
          rcPath = checkPath;
          break;
        }
      }

      return respond(void 0, rcPath);
    }

    // async find
    process.nextTick(function next() {
      if (~searched.indexOf(dir))
        return respond();

      if (pathMap[dir] !== void 0)
        return respond(void 0, pathMap[dir]);

      searched.push(dir);
      checkPath = path.join(dir, rcName);
      asyncCheck(checkPath, function (err, exists) {
        if (err) return respond(err);
        if (exists) return respond(void 0, checkPath);
        // else keep looking
        dir = path.resolve(dir, '..');
        process.nextTick(next);
      });
    });
  };
}