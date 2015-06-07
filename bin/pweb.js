#!/usr/bin/env node

process.env.YLOG = (process.env.YLOG ? process.env.YLOG + ',' : 'post:*');

var path = require('path');
var program = require('commander');
var postWeb = require('./../src/post-web');
var h = require('./../src/helper');

var requires = [],
  importPaths = [],
  disabledTasks = [],
  excludeDirs = [],
  collect = function(val, container) {
    container.push(val);
    return container;
  };


program
  .version(require(require('path').resolve(__dirname, '../package.json')).version)
  .usage('[options] <directory>')
  .description('自动化编译前端资源')
  .option('-m, --minify',     '是否要压缩代码或图片')
  .option('-p, --production', '设置 environment = production，默认是 development')
  .option('-s, --server',     '启动一个服务器，并将 distDir 设置为根目录')
  .option('--serve',          '和 --server 一样，方便有些人习惯用 serve，而不是 server')
  .option('-o, --open [file]','用浏览器打开指定的文件，没指定 file 就随机打开一个（只有启动了服务器才有效）')
  .option('-w, --watch',      '监听 assetDir 中的文件变化，有变化自动执行相应的命令')
  .option('--mobile',         '表示此网站是给手机端使用的，这样的话在处理代码时，可以不用兼容 IE')

  .option('-a, --asset-dir <DIRECTORY>',        '指定静态资源的目录，默认是自动在当前目录下寻找')
  .option('--dist-dir <DIRECTORY>',             '指定导出的目录，默认是项目根目录下的 dist 文件夹')
  .option('-e, --exclude-dir <DIRECTORY>',      '排除一些文件夹，以免程序在定位资源位置时报错', collect, excludeDirs)

  .option('-d, --disable-task <TASK_NAME>',
    '禁用指定的 task，有 styles,scripts,images,templates,fonts', collect, disabledTasks)

  .option('-r, --require <SASS_LIBRARY_NAME>',  '加载其它库文件，透传给 compass', collect, requires)
  .option('-I, --import-path <SASS_DIRECTORY>', '使此路径下的 sass 文件可以被 import，透传给 compass', collect, importPaths)

  .option('--debug',          '将日志级别设置成 debug')
  .option('--verbose',        '将日志级别设置成 verbose')
  .option('-q, --quiet',      '将日志级别设置成 silent，即无输出')
  .option('--level <level>',  '将日志级别设置成指定的值，有 silly, verbose, debug, info, ok , warn, error, fatal, silent')


  .parse(process.argv);


// @NOTE 这里配置的所有目录都要转化成相对于 projectDir 的目录
var root = program.args[0] || '.';
var prod = program.production;
var commands = ['compile'];
var level = 'info';

function getProjectDir (dir, defaultDir) {
  if (!dir) {
    return defaultDir || null;
  }
  return h.relativePath(dir, root);
}

if (program.server || program.serve) { commands.push('server'); }
if (program.watch) { commands.push('watch'); }

if (program.verbose) { level = 'verbose'; }
else if (program.debug) { level = 'debug'; }
else if (program.quiet) { level = 'silent'; }
else if (program.level) { level = program.level; }


var opts = {
  level: level,
  environment: prod ? 'production' : 'development',
  minify: prod || program.minify,
  excludeDirs: excludeDirs.map(getProjectDir),
  server: {
  },
  metas: {
    scripts: {},
    styles: {},
    templates: {},
    fonts: {},
    images: {}
  },
  tasks: {
    styles: {
      compass: {
        require: requires.map(getProjectDir),
        importPath: importPaths.map(getProjectDir)
      }
    }
  }
};

// 单独配置是因为这里的优先级最高，如果没配置就不要强加上，否则会覆盖配置文件中的配置
if (program.assetDir) {
  opts.assetDir = getProjectDir(program.assetDir);
}
if (program.distDir) {
  opts.distDir = getProjectDir(program.distDir);
}
if (program.open) {
  opts.server.open = program.open;
}
if (program.mobile) {
  opts.mobile = program.mobile;
}

disabledTasks.forEach(function(k) {
  if (k in opts.metas) {
    opts.metas[k].enabled = false;
  }
});

postWeb(root, commands, opts);

