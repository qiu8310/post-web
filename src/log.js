/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  os = require('os');

var chalk = require('chalk');

/*

 特点：

 - 支持 npmlog 的 level 级别
 - 支持 debug 的环境变量设置
 - 支持 debug 的分类输出（TODO）
 - 支持 进度条 输出
 - 支持 事件监听
 - 支持 grunt log 的丰富样式
 - 支持 prettyJson
 - 支持 error stack
 - 支持指定每行的输出宽度（使用 wrap，支持使用指定的整数宽度、百分比或小数，如 `ylog.wrap(0.8).info('...')`）
 - 支持简单的类 markdown 语法
     * `what are __you__ doing` 中的 `you` 会加上 `underline` 样式
     * `what are **you** doing` 中的 `you` 会加上 `bold` 样式
     * `what are *you* doing` 中的 `you` 会加上 `italic` 样式


 allFlags: (按 levels -> styles -> modifies 的顺序执行)


   levels:
     silly
     verbose
     info
     http
     warn
     ok
     error
     fatal

   styles:
     title
     subtitle
     write

   modifies: (在文本输出前的最后一刻执行)
     noln    - 不要换行
     noeol   - 和 noln 一样
     nocolor - 输出的内容不带任何的样式
     nomd    - 不要使用类 markdown 的语法
     silent  - 无任何输出

     stack - 输出 error.stack
     wrap  - 指定输出文本的最大宽度

     TODO
     prettyColor?
     human
     time
     profile
 */


var c, container = new EventEmitter();
c = container; // just for alias
c.util = util;

var levels = c.levels = {};
var styles = c.styles = {};
var modifies = c.modifiers = {};

function noop()    {}
function write()   { process.stdout.write(util.format.apply(util, arguments)); }
function writeln() { process.stdout.write(util.format.apply(util, arguments) + os.EOL); }

util.slice = function(arrLike, index) {
  // don't slice `arguments`, it prevents v8 optimizations
  var len = arrLike.length, res = [];
  index = index || 0;
  if (index < 0) {
    index = index + len;
    index = index < 0 ? 0 : index;
  }

  for(; index < len; index++) {
    res.push(arrLike[index]);
  }
  return res;
};


// 空函数，用于生成链式结构的母函数
function originalYlog() {}

/**
 * 注入 flag ， 使其可以链式调用
 * @param {String} flag
 */
function appendFlag(flag) {
  if (flag in container) {
    throw new Error('Flag <' + flag + '> already exists!');
  }

  var getProperty = function () {
    this.flags = this.flags || [];
    this.options = this.options || {};

    this.flags.push(flag);
    return chain.call(this, this.flags, this.options);
  };

  Object.defineProperty(originalYlog, flag, {get: getProperty});
  Object.defineProperty(container, flag, {get: getProperty});
}

/**
 * 每次链式调用都重新生成一个函数，并且函数又支持链式调用
 * @param {Array} flags
 * @param {Object} options
 * @returns {Function}
 */
function chain(flags, options) {
  var caller = function ylog() {
    return call.apply(caller, arguments);
  };
  caller.flags = flags;
  caller.options = options;
  // __proto__ is used because we must return a function, but there is
  // no way to create a function with a different prototype.
  caller.__proto__ = originalYlog;
  return caller;
}


/**
 * 函数形式的链式调用会执行此函数
 */
function call() {

  var FLAG = { levels: [], modifiers: [], styles: []};

  var flag, i, level;
  for (i = 0; i < this.flags.length; i++) {
    flag = this.flags[i];
    if (flag === 'no') {
      flag = 'no' + this.flags[++i] || '';
    }

    Object.keys(FLAG).forEach(function(key) {
      if (flag in c[key]) { FLAG[key].push(flag); }
    });
  }

  level = getCallLevel(FLAG.levels);

  if (level) {
    write(level.disp + ' ');
  }

  return chain(this.flags, this.options);
}


/**
 * 从 levelFlags 中选出一个 level 来使用
 * @param {Array} levelFlags
 */
function getCallLevel(levelFlags) {
  var userLevels = [].concat(c.level); // clone 一份，防止修改了原数据，同时将其转化成数组
  var level, sort = function(a, b) { return c.levels[a].weight - c.levels[b].weight; };

  if (!userLevels.length || !levelFlags.length) { return level; }

  if (c.levelMode === 'only') {
    // 从 userLevels 中选一个存在 levelFlags 中的权重最高的 level
    userLevels.forEach(function(flag) {
      if (levelFlags.indexOf(flag) >= 0) {
        if (!level || c.levels[flag].weight > level.weight) {
          level = c.levels[flag];
        }
      }
    });

  } else {
    // 从 userLevels 中选一个权重最低的，然后再在 levelFlags 中选一个比 userLevels 中权重最低的要高的一个最高的 level
    var min = userLevels.sort(sort).shift();
    var max = levelFlags.sort(sort).pop();
    if (min.weight <= max.weight) {
      level = max;
    }
  }

  return level;
}


/**
 * 添加一个新的日志级别
 *
 * @param {String} name - 级别名称
 * @param {Number} weight - 级别权重，越小优先级越高
 * @param {String} disp - 指定最左边显示的标识（如果没有，则使用级别的名称，即 name）
 */
c.addLevelFlag = function(name, weight, disp) {
  levels[name] = {
    weight: parseInt(weight, 10),
    disp: disp || name
  };
  appendFlag(name);
};


/**
 * 添加一个新的修改器 flag
 *
 * @param {String} name - 修改器名称
 * @param {Function} postFn - 函数，其唯一的参数是当前要输出的内容
 * @param {Function} [callFn] - 函数，在此 modify 被用函数形式调用时，可能会传一些参数进来，用此 callFn 来处理这些参数
 *                              callFn 绑定在 ylog.options[flag] 对象上
 */
c.addModifyFlag = function(name, postFn, callFn) {
  modifies[name] = {post: postFn, call: callFn};
  appendFlag(name);
};

/**
 * 添加一个新的样式 flag
 *
 * @param {String} name - 样式名称
 * @param {Function} [fn] - 样式处理程序，fn 绑定在了 chalk 之上，所以你可以在 fn 中使用 this.red.bgGreen 等 chalk 方法
 */
c.addStyleFlag = function(name, fn) {
  styles[name] = fn || noop;
  appendFlag(name);
};


//****************  添加自定义的库  **************//

//console.log(chalk.blue('ℹ'));
//console.log(chalk.red('✗ ✘ ☒'));
//console.log(chalk.green('✓ ✔ ☑'));
//console.log(chalk.green(':u7121:'));
//console.log(chalk.yellow.bold('! ︕ ﹗ ！⚠  '));

/**
 * 指定一个默认级别，也可以是一个数组
 * @param {String|Array} levelFlags
 */
c.setLevel = function(levelFlags) {
  [].concat(levelFlags).forEach(function(flag) {
    if (!(flag in c.levels)) {
      throw new Error('Level flag <' + flag + '> not exists.');
    }
  });
  c.level = levelFlags;
};

/**
 * 权重模式
 *
 * - 如果是 `'weight'`，即只会输出 weight 值 >= 当前 level 级别的日志
 * - 如果是 `'only'`，只输出 c.level 中指定级别的日志
 *
 * @param {String} mode
 */
c.setLevelMode = function(mode) {
  c.levelMode = mode === 'only' ? 'only' : 'weight';
};

c.addLevelFlag('silly',   -Infinity, chalk.bold.inverse('[S]'));
c.addLevelFlag('verbose', 1000, chalk.bold.blue('[V]'));
c.addLevelFlag('debug',   2000, chalk.bold.magenta('[D]'));
c.addLevelFlag('info',    3000, chalk.bold.cyan(' ℹ '));
c.addLevelFlag('http',    4000, chalk.bold.bgBlue.white('[H]'));
c.addLevelFlag('warn',    5000, chalk.bold.yellow(' ⚠ '));
c.addLevelFlag('ok',      6000, chalk.bold.green(' ✔ '));
c.addLevelFlag('error',   7000, chalk.bold.red(' ✗ '));
c.addLevelFlag('fatal',   8000, chalk.bold.red('✘✘✘'));

c.setLevel('info');
c.setLevelMode('weight');


c.addStyleFlag('title', function() {

});

// no 是个很好的 flag，自动与它的下一个调用的 flag 组合，如果不存在则忽略此 no
appendFlag('no');

function rightTrimEOL (str) { return str.replace(/([\r]?\n)+$/, ''); }

c.addModifyFlag('ln', function(str) { return str + os.EOL; });
c.addModifyFlag('noln', rightTrimEOL);
c.addModifyFlag('noeol', rightTrimEOL);
c.addModifyFlag('nocolor', function(str) { return chalk.stripColor(str); });
c.addModifyFlag('nomd', function() {});
c.addModifyFlag('wrap',
  function(str) {},
  function(len) {}
);
c.addModifyFlag('stack', function() {});



//appendFlag('ln');
//appendFlag('wrap');
//appendFlag('info');
//appendFlag('verbose');

//console.log(c.ln.wrap(80).wrap(90).flags);



module.exports = container;

//[
//  'verbose',
//  'title', 'banner', 'header',
//  'subhead',
//  'ok', 'success',
//  'info',
//  'warn', 'warning',
//  'err', 'error',
//  'ln'
//].forEach(function(attr) {
//
//    Object.defineProperty(Logger.prototype, attr, {
//      get: function() {
//        return createLogger(this, attr);
//      }
//    });
//
//    //Logger.prototype[key] = (function(key) {
//    //  return function() {
//    //    console.log('set ' + key);
//    //  };
//    //})(key);
//
//  });
//
//var log = new Logger();
//
//console.log(log.title.err.ln);



// ✓ ✔ ☑
// ✗ ✘ ☒
// ! ︕ ﹗ ！
// ¡ ℹ

// title, banner, header
// subhead
// ok, success
// err, error
// warn, warning
// info
// verbose.ok|info

// 进度条？ gauge

// wrap, ln

// --stack
// --verbose
// --force
// --quiet


// npmlog debug grunt.log
// http://massalabs.com/blog/handling-errors-in-nodejs/

// EVENT

/*
 var defaultStream = process.stderr
 function isTTY() {
 return process.stderr.isTTY
 }
 function getWritableTTYColumns() {
 // One less than the actual as writing to the final column wraps the line
 return process.stderr.columns - 1
 }
 */


//console.log(chalk.blue('ℹ'));
//console.log(chalk.red('✗ ✘ ☒'));
//console.log(chalk.green('✓ ✔ ☑'));
//console.log(chalk.green(':u7121:'));
//console.log(chalk.yellow.bold('! ︕ ﹗ ！⚠  '));


//var G = require('gauge');
//var g = new G();
//g.show('a', 0.1);
//g.show('b', 0.2);
//g.show('c', 0.3);
//
//setTimeout(function() {
//  g.pulse('xx', 0.6);
//
//  setTimeout(function() {
//    g.hide();
//
//    setTimeout(function() {
//      g.show('c', 0.8);
//    }, 300);
//
//  }, 300);
//}, 300);


/*

 └── abc
     └── def
         |── a
         └── b
     |── dir
     └── work

 */







//grunt.log.subhead('xxxxx'); // 加粗
//grunt.log.ok();
//grunt.log.ok('bbb');
//grunt.log.oklns();
//grunt.log.oklns('yyy');
//
//grunt.log.error();
//grunt.log.error('zzz');
//
//grunt.log.oklns('abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc ');
//
//grunt.log.writeflags({a: '', b: 'bbb'}, 'xx');
//
//grunt.log.table([10, 10], ['abc abc abc abc abc abc abc abc abc abc abc abc ', 'def def def def def def def def def def def def def def '])
