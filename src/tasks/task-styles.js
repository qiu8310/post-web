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

var CpsBoot = require('./../lib/compass-bootstrap');
var ylog = require('ylog')('post:styles');


var postcss = require('postcss'),
  CleanCss = require('clean-css'),
  cssgrace = require('cssgrace'),
  cssnext = require('cssnext'),
  colormin = require('postcss-colormin');


module.exports = require('./task-base').extend({

  init: function() {

    this.name = 'styles';

    var types = ['sass', 'less', 'stylus', 'css'];

    // 查看有没有 sass, less, stylus, css，此函数同时会设置 this.enables 属性
    this.typedFiles = this.getTypedFiles(types, true);


    // 有 styles 就一定要编译 css
    this.enables.css = true;

    // 所有的 sass 都用 compass 来编译
    this.enables.compass = this.enables.sass;
    delete this.enables.sass;
  },

  initCompass: function() {
    var options = this.options,
      taskOpts = this.taskOpts,
      cpsOpts;

    taskOpts.compass = _.extend(
      {
        quiet: true,
        relativeAssets: true,
        noLineComments: true
      },
      taskOpts.compass,
      {
        appDir: '.',
        javascriptDir: options.src.scripts,
        sassDir: options.src.styles,
        cssDir: options.tmp.styles,
        imagesDir: options.src.images,
        fontsDir: options.src.fonts,
        generatedImagesPath: options.src.images ? path.join(options.src.images, 'gen') : false
      }
    );

    // 其它 compass 相关的配置
    cpsOpts = taskOpts.compass;

    cpsOpts.require = [].concat(cpsOpts.require || []);
    cpsOpts.importPath = [].concat(cpsOpts.importPath || []);


    // 加载 plugins 中的插件
    var pluginDir = path.resolve(__dirname, '../../plugins');
    var mySassExtensions = glob.sync(path.join(pluginDir, 'extensions/**/*.rb'));
    ['compass/import-once/activate', 'ceaser-easing'].concat(mySassExtensions).forEach(function(req) {
      cpsOpts.require.push(req);
    });


    // 加载 import path
    cpsOpts.importPath.push(path.join(pluginDir, 'sass'));
    if (options.bowerDirectory) {
      cpsOpts.importPath.push(options.bowerDirectory);
    }

    ylog.debug('compass options', cpsOpts);
  },

  initStylus: function(stylusOpts) {
    this.arrayOptionAddItem(stylusOpts, 'include', this.options.bowerDirectory);
    ylog.debug('stylus options', stylusOpts);
  },

  initLess: function(lessOpts) {
    this.arrayOptionAddItem(lessOpts, 'includePath', this.options.bowerDirectory);
    ylog.debug('less options', lessOpts);
  },

  initCss: function() {
    var options = this.options,
      taskOpts = this.taskOpts;

    // CSS 的配置
    var browsers = [],// autoprefixer => https://github.com/ai/browserslist
      compat = {}; // cleanCss 的兼容属性
    if (options.mobile) {
      browsers = ['last 2 versions', 'Android >= 20', 'Chrome >= 20'];
    } else {
      browsers = ['last 10 versions', 'Chrome >= 20', 'Android >= 20', 'Firefox >= 20'];
      compat.compatibility = [
        'ie8',
        '+properties.backgroundSizeMerging',
        '+properties.iePrefixHack',
        '+properties.ieSuffixHack'].join(',')
    }

    taskOpts.cssnext = _.extend({ browsers: browsers }, taskOpts.cssnext);
    taskOpts.cleancss = _.extend({
      // advanced: false,
      // relativeTo: path.dirname(cssFile)
    }, compat, taskOpts.cleancss);

    ylog.debug('cssnext options', taskOpts.cssnext);
    ylog.debug('cleancss options', taskOpts.cleancss);
  },

  compileCompass: function(done) {
    var cpsOpts = this.taskOpts.compass,
      options = this.options;

    // 设置 bootstrap
    var boot = new CpsBoot(path.resolve(options.projectDir, options.src.styles), cpsOpts);

    // 执行 compass 命令
    this.run(
      ['compass', 'compile'],
      {
        argsOpts: cpsOpts
      },
      function(err) {

        // 删除 .sass-cache 文件
        fs.removeSync('.sass-cache');

        // 恢复 bootstrap
        boot.recover();

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
      var out = path.join(this.tmp, path.relative(this.src, dir));
      fs.ensureDirSync(out); // 确保文件存在
      tasks.push(function(done) {
        this.run(['stylus', dir, '--out', out], runOpts, done);
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
      var out = path.join(this.tmp, path.relative(this.src, file));
      out = out.replace(/\.\w+$/, '.css');
      fs.ensureDirSync(path.dirname(out));
      tasks.push(function(done) {
        this.run(['lessc', file, out], runOpts, done);
      }.bind(this));
    }, this);

    this.async.series(tasks, done);
  },


  _processCssFile: function(cssFile) {
    var options = this.options;
    var content = fs.readFileSync(cssFile).toString();

    // postcss 的 plugins
    var plugins = [
      colormin,
      cssnext(this.taskOpts.cssnext)
    ].concat(this.taskOpts.postcss.plugins);

    if (!options.mobile) {
      plugins.push(function(css) { return cssgrace.postcss(css, {from: cssFile}); });
    }

    ylog.silly('postcss ^%s^', cssFile);
    content = postcss(plugins).process(content).css;

    if (this.minify) {
      ylog.silly('cleancss ^%s^', cssFile);
      var cleancssOpts = this.taskOpts.cleancss;
      cleancssOpts.relativeTo = path.dirname(cssFile);
      content = new CleanCss(cleancssOpts).minify(content).styles;
    }


    cssFile = path.join(this.dist, path.relative(this.src, cssFile.replace(this.tmp, this.src)));

    fs.ensureDirSync(path.dirname(cssFile));
    fs.writeFileSync(cssFile, content);
    ylog.debug.writeOk('write to ^%s^', cssFile);
  },


  compileCss: function(done) {

    var cssFiles = this.typedFiles.css || [];
    _.each(cssFiles.concat(glob.sync(path.join(this.tmp, '/**/*.css'))), function(f) {
      this._processCssFile(f);
    }, this);

    process.nextTick(done);
  },


  compile: function(done) {
    ylog.info.title('compiling task %s', this.name);

    fs.ensureDirSync(this.tmp);
    this.runSeriesParallel('compile', [['compass', 'stylus', 'less'], 'css'], function(err) {
      fs.removeSync(this.tmp);
      if (!err) {
        ylog.ok('compiled task @%s@', this.name);
      }
      done(err);
    });
  }
});
