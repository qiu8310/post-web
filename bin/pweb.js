#!/usr/bin/env node

process.env.YLOG = (process.env.YLOG ? process.env.YLOG + ',' : 'post:*');

var path = require('path');
var program = require('commander');
var postWeb = require('./../src/post-web');
var h = require('./../src/helper');

var requires = [],
  importPaths = [],
  collect = function(val, container) {
    container.push(val);
    return container;
  };


program
  .version(require(require('path').resolve(__dirname, '../package.json')).version)
  .usage('[options] <directory>')
  .description('自动化编译前端资源')
  .option('-m, --minify',                       '是否要压缩代码或图片')
  .option('-e, --environment',                  '指定编译环境，可以是 production 或 development (default)')
  .option('-p, --production',                   '设置 environment = production')
  .option('-r, --require <LIBRARY_NAME>',       '加载其它库文件，透传给 compass', collect, requires)
  .option('-I, --import-path <SASS_DIRECTORY>', '使此路径下的 sass 文件可以被 import，透传给 compass', collect, importPaths)
  .option('-a, --asset-dir <direcotry>',        '指定静态资源的目录，默认是自动在当前目录下寻找')
  .option('--dist-dir <direcotry>',             '指定导出的目录，默认是项目根目录下的 public 文件')


  .option('--mobile',       '表示此网站是给手机端使用的，这样的话在处理代码时，可以不用兼容 IE')

  .option('--debug',        '将日志级别设置成 debug')
  .option('--verbose',      '将日志级别设置成 verbose')
  .option('-q, --quiet',    '将日志级别设置成 silent，即无输出')
  .option('--level <level>','将日志级别设置成指定的值，有 silly, verbose, debug, info, ok , warn, error, fatal, silent')


  .option('-s, --server',   '启动一个服务器，并将 distDir 设置为根目录')
  .option('--serve',        '和 --server 一样，方便有些人习惯用 serve，而不是 server')
  .option('-w, --watch',    '监听 assetDir 中的文件变化，有变化自动执行相应的命令')

  .parse(process.argv);


// @NOTE 这里配置的所有目录都要转化成相对于 projectDir 的目录
var root = program.args[0] || '.';
var prod = program.production || program.environment && 'production'.indexOf(program.environment) === 0;
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
  distDir: getProjectDir(program.distDir, 'dist'),
  assetDir: getProjectDir(program.assetDir),
  mobile: program.mobile,

  tasks: {
    styles: {
      compass: {
        require: requires.map(getProjectDir),
        importPath: importPaths.map(getProjectDir)
      }
    }
  }
};

postWeb(root, commands, opts);

