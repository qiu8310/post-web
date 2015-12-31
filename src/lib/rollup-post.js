var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var ngAnnotate = require('ng-annotate');

var uglify = require.resolve('uglify-js/' + require('uglify-js/package.json').bin.uglifyjs);

module.exports = function (code, initOpts, bundleOpts, done) {
  var task = this;

  if (task.options.angular) {
    code = ngAnnotate(code, {add: true, 'single_quotes': true}).src;
  }

  var production = task.production;
  var injectVariables = _.assign({
    __PROD__: production,
    __DEV__: !production
  }, initOpts.injectVariables);

  var uglifyOpts = {};

  uglifyOpts.define = injectVariables;
  if (!task.production) {
    uglifyOpts.compress = {
      warnings: false,
      hoist_funs: false,
      sequences: false
    };
    uglifyOpts.beautify = true;
    uglifyOpts.mangle = false;
  }

  if (task.minify) {
    uglifyOpts.compress = {
      dead_code: true,
      unused: true,
      warnings: false,
      drop_console: true,
      drop_debugger: true
    };
    uglifyOpts.beautify = false;
    uglifyOpts.mangle = true;
  }

  uglifyOpts.output = bundleOpts.dest;
  fs.ensureDirSync(path.dirname(bundleOpts.dest));

  var args = ['node', uglify].concat(optionsToArgs(uglifyOpts)).concat('-');

  var child = this.spawn(args, {}, done);
  child.stdin.write(code);
  child.stdin.end();
};

function snakeCase(key) {
  return key.replace(/[A-Z]/g, function (w) { return '_' + w.toLowerCase(); });
}

function kebabCase(key) {
  return key.replace(/[A-Z]/g, function (w) { return '-' + w.toLowerCase(); });
}

function innerOptionsMap(obj, parentKey) {
  return function (key) {
    var val = obj[key];
    return (parentKey === 'define' || parentKey === 'd' ? key : snakeCase(key)) + '=' + val;
  };
}

function optionsToArgs(opts) {
  var args = [];
  Object.keys(opts).forEach(function (key) {
    var value = opts[key];
    var argKey = kebabCase(key);
    argKey = (argKey.length === 1 ? '-' : '--') + argKey;
    if (typeof value === 'boolean' || value == null) {
      if (value) args.push(argKey);
    } else if (typeof value === 'object') {
      args.push(argKey, Object.keys(value).map(innerOptionsMap(value, key)).join(','))
    } else {
      args.push(argKey, value);
    }
  });
  return args;
}
