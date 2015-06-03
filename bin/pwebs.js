#!/usr/bin/env node

process.env.YLOG = (process.env.YLOG ? process.env.YLOG + ',' : 'post:*');

var prog = require('commander');
var path = require('path');
var h = require('../src/helper');
var ylog = require('ylog')('post:s');

ylog.attributes.time = true;
ylog.Tag.ns.len = 15;
ylog.Tag.ns.align = 'right';

prog
  .version(require(require('path').resolve(__dirname, '../package.json')).version)
  .usage('[options] [directories...]')
  .description('启动一个独立服务器，并带 livereload 功能')
  .option('--level <level>','将日志级别设置成指定的值，有 silly, verbose, debug, info, ok , warn, error, fatal, silent')
  .option('-o, --open [file]','用浏览器打开指定的文件，没指定 file 就随机打开一个')
  .parse(process.argv);

ylog.setLevel(prog.level || 'info');


var dirs = [];
prog.args.forEach(function(dir) { if (h.isDirectory(dir)) { dirs.push(path.resolve(dir)); } });
if (!dirs.length) { dirs.push(process.cwd()); }


ylog.info.ln.title('start server');
ylog.info('watch directory ^%o^', dirs);


var lr;

require('../src/lib/watch')(dirs, {}, function(files) {
  if (lr) { lr.trigger([].concat(files)); }
});

require('../src/server/express-app')(
  {},
  function(app, opts) {
    var self = this;
    lr = app.lr;
    dirs.forEach(function(dir) { app.use(self.static(dir)); });
  },
  function(app, opts) {
    h.open(dirs, prog.open, opts.base);
  }
);
