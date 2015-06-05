/*
  ASSERT:
    ok(value, [message]) - Tests if value is a true value.
    equal(actual, expected, [message]) - Tests shallow, coercive equality with the equal comparison operator ( == ).
    notEqual(actual, expected, [message]) - Tests shallow, coercive non-equality with the not equal comparison operator ( != ).
    deepEqual(actual, expected, [message]) - Tests for deep equality.
    notDeepEqual(actual, expected, [message]) - Tests for any deep inequality.
    strictEqual(actual, expected, [message]) - Tests strict equality, as determined by the strict equality operator ( === )
    notStrictEqual(actual, expected, [message]) - Tests strict non-equality, as determined by the strict not equal operator ( !== )
    throws(block, [error], [message]) - Expects block to throw an error.
    doesNotThrow(block, [error], [message]) - Expects block not to throw an error.
    ifError(value) - Tests if value is not a false value, throws if it is a true value. Useful when testing the first argument, error in callbacks.

  SHOULD.JS:
    http://shouldjs.github.io/

  Some test frameworks:
    sinon:  function spy
    nock: mock http request
    supertest: test http server
    rewire: modify the behaviour of a module such that you can easily inject mocks and manipulate private variables

  More on http://www.clock.co.uk/blog/tools-for-unit-testing-and-quality-assurance-in-node-js
*/

var postWeb = require('../');
var assert = require('should');
var path = require('path');
var glob = require('glob');
var fs = require('fs-extra');
var h = require('../src/helper');
var _ = require('lodash');
var root = path.join(path.dirname(__dirname), 'examples');


function testFile(files, rootDir) {
  rootDir = rootDir || root;
  _.each(files, function(file) {
    if (_.includes(file, '<')) {
      var parts = file.split('<');
      var dir = parts[0].trim(), num = parseInt(parts[1].trim());
      dir = path.join(rootDir, dir);
      glob.sync(dir + '/*.*').length.should.eql(num, 'Directory ' + dir + ' should have ' + num + ' files');
    } else if (file[0] === '!') {
      file = path.join(rootDir, file.substr(1));
      assert.ok(!h.isFile(file), 'File ' + file + ' should not exists');
    } else {
      var cs = file.split(/\s*\|\s*/);
      file = cs.shift();
      file = path.join(rootDir, file);
      assert.ok(h.isFile(file), 'File ' + file + ' should exists');
      if (cs.length) {
        var content = h.readFile(file);
        cs.forEach(function(c) {
          assert.ok(_.includes(content, c), 'File ' + file + ' should contains string ' + c);
        });
      }
    }
  });

  fs.removeSync(rootDir + '/dist');
}

describe('postSass', function () {
  it('compile styles images and font', function (done) {
    postWeb(root, {assetDir: 'sass', compileEnd: function() {
      testFile([
        'dist/images/cro.jpg',
        'dist/images/grid.png',
        'dist/images/grid@2x.png',
        'dist/images/gen < 3',
        'dist/styles/test.css',
        'dist/font.ttf'
      ]);
      done();
    }});
  });

  it('production compile styles images and font', function(done) {
    postWeb(root, ['compile'], {assetDir: 'sass', environment: 'production', compileEnd: function() {
      testFile([
        'dist/images/cro.jpg',
        'dist/images/grid.png',
        'dist/images/grid@2x.png',
        'dist/images/gen < 3',
        'dist/styles/test.css',
        'dist/font.ttf',
        'dist/font.eot',
        'dist/font.svg',
        'dist/font.woff',
        'dist/bb.txt'
      ]);
      done();
    }});
  });

  it('compile all type files', function(done) {
    postWeb(root, {assetDir: 'all', environment: 'development', compileEnd: function() {
      testFile([
        'dist/haml.html',
        'dist/html.html',
        'dist/jade.html',
        'dist/md.html',
        'dist/slim.html',
        'dist/sub-tpls/haml.html',
        'dist/sub-tpls/html.html',
        'dist/sub-tpls/jade.html',
        'dist/sub-tpls/md.html',
        'dist/sub-tpls/slim.html',
        'dist/styles/course.css',
        'dist/styles/css.css',
        'dist/styles/sass.css',
        'dist/styles/styl-1.css',
        'dist/styles/styl-2.css',
        'dist/styles/sub < 2',
        'dist/scripts/babel.js',
        'dist/scripts/coffee.js',
        'dist/scripts/iced.js',
        'dist/scripts/js.js',
        'dist/scripts/ts.js',
        'dist/images/grid.png',
        'dist/images/course < 2',
        'dist/images/gen/course < 1'
      ]);
      done();
    }});
  });

  it('production compile all type files', function(done) {
    postWeb(root, {assetDir: 'all', environment: 'production', compileEnd: function() {
      testFile([
        'dist/haml.html',
        'dist/html.html',
        'dist/jade.html',
        'dist/md.html',
        'dist/slim.html',
        'dist/robots.txt',
        'dist/sub-tpls < 5',
        'dist/styles < 6',
        'dist/scripts/all.js',
        'dist/scripts/coffee.js',
        'dist/scripts/iced.js',
        'dist/images/grid.png',
        'dist/images/course < 2',
        'dist/images/gen/course < 1'
      ]);
      done();
    }});
  });

  it('compile bower project', function(done) {
    var dir = path.join(root, 'bower');
    postWeb(dir, { environment: 'development', mobile: true, assetDir: '.', compileEnd: function() {
      testFile([
        'dist/index.html | style/a.css | vendors/bootstrap/dist/css/bootstrap.css | vendors/bootstrap/dist/js/bootstrap.js | app.js',
        'dist/app.js',
        'dist/style/a.css'
      ], dir);
      done();
    }});
  });

  it('production compile bower project', function(done) {
    var dir = path.join(root, 'bower');
    postWeb(dir, { environment: 'production', assetDir: '.', compileEnd: function() {
      testFile([
        'dist/index.html | style/app.css',
        'dist/app.js',
        'dist/style/app.css',
        'dist/fonts < 4'
      ], dir);
      done();
    }});
  });
});
