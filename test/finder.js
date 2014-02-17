describe('RcFinder', function () {
  var RcFinder = require('../');
  var path = require('path');
  var expect = require('expect.js');
  var fs = require('fs');

  var fixtures = {
    root: path.resolve(__dirname, 'fixtures/foo/foo/foo/foo/'),
    json: path.resolve(__dirname, 'fixtures/foo/foo/bar.json'),
    text: path.resolve(__dirname, 'fixtures/foo/foo/.baz'),
    checkCount: 4,
    config: {
      baz: 'bog'
    }
  };

  it('looks for config files', function () {
    var rcFinder = new RcFinder('bar.json');
    var config = rcFinder.find(path.resolve(__dirname, 'fixtures/foo/foo/foo/foo/'));
    expect(config).to.eql(fixtures.config);
  });

  it('can be run async by using a callback', function (done) {
    var rcFinder = new RcFinder('bar.json');
    var count = 0;
    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(1); // prove async
      expect(config).to.eql(fixtures.config);
      done();
    });
    count ++;
  });

  it('caches config objects', function () {
    var count = 0;
    var rcFinder = new RcFinder('bar.json', {
      loader: function (path) {
        count ++;
        return JSON.parse(fs.readFileSync(path));
      }
    });

    var config = rcFinder.find(fixtures.root);
    expect(count).to.eql(1);
    expect(config).to.eql(fixtures.config);

    // it should only be loaded once
    config = rcFinder.find(fixtures.root);
    expect(count).to.eql(1);
    expect(config).to.eql(fixtures.config);
  });

  it('caches config objects from async calls', function (done) {
    var count = 0;
    var rcFinder = new RcFinder('bar.json', {
      loader: function (path) {
        count ++;
        return JSON.parse(fs.readFileSync(path));
      }
    });

    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(1);
      expect(config).to.eql(fixtures.config);

      rcFinder.find(fixtures.root, function (err, config) {
        expect(count).to.eql(1);
        expect(config).to.eql(fixtures.config);
        done();
      });
    });
  });

  it('properly caches lookups when a config file is not found', function () {
    var count = 0;
    var expectedCount = fixtures.checkCount;
    var rcFinder = new RcFinder('bar.json', {
      _syncCheck: function (path) {
        count++;
        return fs.existsSync(path);
      }
    });

    expect(count).to.eql(0);
    rcFinder.find(fixtures.root);
    expect(count).to.eql(expectedCount);
    rcFinder.find(fixtures.root);
    // it should still equal previous count
    expect(count).to.eql(expectedCount);
  });

  it('properly caches lookups when a config file is not found', function () {
    var count = 0;
    var expectedCount = fixtures.checkCount;
    var rcFinder = new RcFinder('bar.json', {
      _asyncCheck: function (path, cb) {
        count++;
        fs.stat(path, function (err, exists) {
          if (err && err.code !== 'ENOENT') return cb(err);
          cb(void 0, !err);
        });
      }
    });

    expect(count).to.eql(0);
    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(expectedCount);
      rcFinder.find(fixtures.root, function (err, config) {
        // it should still equal previous count
        expect(count).to.eql(expectedCount);
      });
    });
  });
});