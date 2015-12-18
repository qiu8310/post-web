/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var fs = require('fs-extra'),
  path = require('path'),
  _ = require('lodash'),
  glob = require('glob');

//var CpsBoot = require('./../lib/compass-bootstrap');
var ylog = require('ylog')('post:styles');

var postcss = require('postcss'),
  CleanCss = require('clean-css'),
  cssgrace = require('cssgrace'),
  cssnext = require('cssnext'),
  colormin = require('postcss-colormin');

var isWin = require('os').platform() === 'win32';
function slash(str) {
  if (typeof str !== 'string') return str;
  return isWin ? str.replace(/\//g, '\\') : str;
}

module.exports = require('./task-base').extend({


  initCompass: function() {
    var options = this.options,
      taskOpts = this.taskOpts,
      cpsOpts;

    taskOpts.compass = _.extend(
      {
        quiet: false,
        relativeAssets: true,
        noLineComments: true
      },
      taskOpts.compass,
      {
        appDir: '.',
        javascriptDir: slash(options.src.scripts),
        sassDir: slash(options.src.styles),
        cssDir: slash(options.tmp.styles),
        imagesDir: slash(options.src.images),
        fontsDir: slash(options.src.fonts),
        generatedImagesPath: slash(options.src.images ? path.join(options.src.images, 'gen') : false)
      }
    );

    // 其它 compass 相关的配置
    cpsOpts = taskOpts.compass;

    cpsOpts.require = [].concat(cpsOpts.require || []).map(slash);
    cpsOpts.importPath = [].concat(cpsOpts.importPath || []).map(slash);


    // 加载 plugins 中的插件
    var pluginDir = path.resolve(__dirname, '../../plugins');
    var mySassExtensions = glob.sync(path.join(pluginDir, 'extensions/**/*.rb'));
    ['compass/import-once/activate', 'ceaser-easing'].concat(mySassExtensions).forEach(function(req) {
      cpsOpts.require.push(slash(req));
    });


    // 加载 import path
    cpsOpts.importPath.push(path.join(pluginDir, 'sass'));
    if (options.bowerDirectory) {
      cpsOpts.importPath.push(options.bowerDirectory);
    }
  },

  initStylus: function(stylusOpts) {
    this.arrayOptionAddItem(stylusOpts, 'include', this.options.bowerDirectory);
  },

  initLess: function(lessOpts) {
    this.arrayOptionAddItem(lessOpts, 'includePath', this.options.bowerDirectory);
  },

  initCss: function() {
    var options = this.options,
      taskOpts = this.taskOpts;

    // CSS 的配置
    var browsers = [],// autoprefixer => https://github.com/ai/browserslist
      compat = {}; // cleanCss 的兼容属性
    if (options.mobile) {
      browsers = ['last 2 versions', 'Android >= 2.3', 'Chrome >= 34', 'Firefox >= 28'];
    } else {
      browsers = ['last 10 versions', 'Chrome >= 24', 'Firefox >= 20'];
      compat.compatibility = [
        'ie8',
        '+properties.backgroundSizeMerging',
        '+properties.iePrefixHack',
        '+properties.ieSuffixHack'].join(',');
    }

    taskOpts.cssnext = _.extend({ browsers: browsers }, taskOpts.cssnext);
    taskOpts.cleancss = _.extend({
      // advanced: false,
      // relativeTo: path.dirname(cssFile)
    }, compat, taskOpts.cleancss);

    ylog.info('cssnext options', taskOpts.cssnext);

    if (this.minify) {
      ylog.info('cleancss options', taskOpts.cleancss);
    }
  },

  compileCompass: function(done) {
    var cpsOpts = this.taskOpts.compass;

    // 设置 bootstrap
    // var boot = new CpsBoot(path.resolve(this.options.projectDir, this.options.src.styles), cpsOpts);

    // 执行 compass 命令
    ylog.info('@compass@ start compile');
    this.run(
      ['compass', 'compile'],
      { argsOpts: cpsOpts },
      function(err, data) {

        // 删除 .sass-cache 文件
        // fs.removeSync('.sass-cache');  // 人工删除此文件会导致 compass 编译报错

        // 恢复 bootstrap
        // boot.recover();

        if (!err) { ylog.debug('@compass@ compile output: ').ln.log(data); }

        done(err);
      }
    );
  },

  compileStylus: function(done) {
    var stylusOpts = this.taskOpts.stylus;
    delete stylusOpts.out; // 不允许配置这个，这是程序自动配置的

    var runOpts = {
      argsOpts: stylusOpts,
      dargs: {noEqual: true}
    };

    var dirFiles = this.groupFilesToDirectory(this.typedFiles.stylus),
      tasks = [];

    _.each(dirFiles, function(_, dir) {
      var outDir = this.getTmpDir(dir);
      tasks.push(function(done) {
        ylog.info('@stylus@ start compile ^%s^ directory to ^%s^', dir, outDir);
        this.run(['stylus', dir, '--out', outDir], runOpts, done);
      }.bind(this));
    }, this);

    this.async.series(tasks, done);
  },

  compileLess: function(done) {
    var runOpts = {
      argsOpts: this.taskOpts.less
    };

    var tasks = [];

    _.each(this.typedFiles.less, function(file) {
      var out = this.getTmpFile(file, 'css');
      tasks.push(function(done) {
        ylog.info('@lessc@ start compile ^%s^ file to ^%s^', file, out);
        this.run(['lessc', file, out], runOpts, done);
      }.bind(this));
    }, this);

    this.async.series(tasks, done);
  },


  _processCssFile: function(cssFile) {
    var options = this.options, distFile;
    var content = fs.readFileSync(cssFile).toString();

    // postcss 的 plugins
    var plugins = [
      colormin,
      cssnext(this.taskOpts.cssnext)
    ].concat(this.taskOpts.postcss.plugins);

    if (!options.mobile) {
      plugins.push(function(css) { return cssgrace.postcss(css, {from: cssFile}); });
    }

    ylog.info('postcss ^%s^', cssFile);
    content = postcss(plugins).process(content).css;

    if (this.minify) {
      ylog.info('cleancss ^%s^', cssFile);
      var cleancssOpts = this.taskOpts.cleancss;
      cleancssOpts.relativeTo = path.dirname(cssFile);
      content = new CleanCss(cleancssOpts).minify(content).styles;
    }

    distFile = this.getDistFile(cssFile);
    fs.writeFileSync(distFile, content);
    ylog.info('&write& ^%s^', distFile);
  },


  concatCss: function() {
    var cssFiles = (this.typedFiles.css || []).concat(glob.sync(path.join(this.tmp, '/**/*.css')));
    if (this.production) {
      var diff = [], add = [];
      _.each(this.concat(this.tmp), function(files, target) {
        add.push(target);
        diff.push.apply(diff, files);
      });
      cssFiles = _.difference(cssFiles, diff).concat(add);
    }
    return cssFiles;
  },

  compileCss: function(done) {
    _.each(this.concatCss(), function(f) {
      this._processCssFile(f);
    }, this);

    process.nextTick(done);
  },


  compile: function(done) {

    // 有 styles 就一定要编译 css
    this.enables.css = true;

    fs.ensureDirSync(this.tmp);
    this.runSeriesParallel('compile', [['compass', 'stylus', 'less'], 'css'], function(err) {
      fs.removeSync(this.tmp);
      ylog.info('remove directory ^%s^', this.tmp);
      done(err);
    });
  }
});
