#!/usr/bin/env node
'use strict';

var path = require('path');
var program = require('commander');
var postWeb = require('./src/post-web');

var requires = [],
  importPaths = [],
  collect = function(val, container) {
    container.push(val);
    return container;
  };


program
  .version(require(require('path').resolve(__dirname, 'package.json')).version)
  .usage('[options] <directory>')
  .description('自动编译指定目录中的 SASS 文件')
  .option('-m, --minify', '是否要压缩代码或图片')
  .option('-e, --environment', '指定编译环境，可以是 production 或 development (default)')
  .option('-p, --production', '设置 environment = production')
  .option('-r, --require <LIBRARY_NAME>', '加载其它库文件，透传给 compass', collect, requires)
  .option('-I, --import-path <SASS_DIRECTORY>', '使此路径下的 sass 文件可以被 import，透传给 compass', collect, importPaths)
  .option('--asset-dir <direcotry>', '指定静态资源的目录，默认是自动在当前目录下寻找')
  .option('--dist-dir <direcotry>', '指定导出的目录，默认是项目根目录下的 public 文件')
  .option('-q, --quiet',     '安静无输出模式')

  .option('--mobile',    '表示此网站是给手机端使用的，这样的话在处理代码时，可以不用兼容 IE')

  .option('--c-debug',   '调用 compass --debug-info')
  .option('--c-trace',   '调用 compass --trace')
  .option('--c-force',   '调用 compass --force')
  .option('--c-time',    '调用 compass --time')

  //.option('-s, --server', '启动一个服务器，并将 distDir 设置为根目录')

  .option('-c, --clean', '清除所有生成的文件')

  // @TODO watch 不能用 compass 自带的，因为它只会调用 compass，不会执行剩下的命令
  //.option('-w, --watch', '执行 compass watch 命令')

  .parse(process.argv);


// @TODO 这里配置的所有目录都要转化成相对于 projectDir 的目录

var dir = program.args[0] || '.';
var command = 'compile';
var prod = program.production || program.environment && 'production'.indexOf(program.environment) === 0;

var opts = {
  quiet: program.quiet,
  environment: prod ? 'production' : 'development',
  minify: prod || program.minify,
  distDir: program.distDir || 'dist',
  assetDir: program.assetDir,
  mobile: program.mobile,

  compass: {
    require: requires,
    importPath: importPaths,

    debugInfo: program.cDebug,
    quiet: program.quiet,
    trace: program.cTrace,
    force: program.cForce,
    time: program.cTime
  }
};

['clean', 'watch', 'server'].reverse().forEach(function(key) {
  if (program[key]) { command = key; }
});
opts.command = command;

postWeb(dir, opts);

