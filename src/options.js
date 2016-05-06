/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var _ = require('lodash'),
  os = require('os');

var options = {
  EOL: os.EOL,

  // 所有目录的路径都要相对于此目录，所以在用命令行时，如果用户配置了某个目录，要记得将其转化成相对目录
  projectDir: null,

  assetDir: null,
  distDir: 'dist',
  angular: null,
  server: {
    open: false,
    handler: function(app, serverOpts, globalOpts) {
      // this === express
      // 并且添加了 modRewrite 到 this 变量中
      // app.use(this.modRewrite([ '^/static/(.*) /$1' ]));
    }
  },

  excludeDirs: [], // 需要排除的一些文件夹，如果没有指定 assetDir，程序会自动确认 assetDir，但判断过程可能会受其它目录干扰

  environment: 'development',
  minify: false,  // 是否压缩代码，当 environment 为 production 时，此值强制为 true

  runLimit: os.cpus().length, // 每次最多运行进程的数量

  // 这些后缀名主要用来帮助定位找到对应文件所在的目录
  // 这里的先后顺序也很关键，要先定位 styles 和 scripts，确定 assetDir，再定位剩下的三类。
  // 因为 templates, images, fonts 文件都比较常见，可能会出现在很多地方（比如项目的根目录就会有 md 文件）
  locate: {
    styles: ['css', 'sass', 'scss', 'less', 'styl'],
    scripts: ['js', 'jsx', 'coffee', 'iced', 'ts', 'tsx'],

    templates: ['html', 'htm', 'jade', 'slim', 'haml', 'swig'],

    // fonts 和 images 中都可能含有 svg 文件，所以两处都不要写它
    images: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    fonts: ['eot', 'ttf', 'woff', 'woff2']
  },

  // 常用文件的后缀名，如果没有设置就表示和文件类型一致，如 js => ['js']
  extensions: {
    html: ['html', 'htm'],
    markdown: ['md', 'markdown'],
    coffee: ['coffee'],
    stylus: ['styl'],
    less: ['less'],
    compass: ['sass', 'scss'],
    babel: ['jsx', 'es6'],
    iced: ['iced'],
    typescript: ['ts', 'tsx'],
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    font: ['eot', 'ttf', 'woff', 'woff2', 'svg']
  },

  src: {},
  tmp: {},
  dist: {},

  // 需要复制的文件，比如用 bower 安装了 bootstrap 之后，需要将它的字体文件复制到 dist 目录
  copy: {},

  metas: {
    styles: {
      enabled: true,
      types: ['compass', 'stylus', 'less', 'css'],
      finalExtension: 'css'
    },
    scripts: {
      enabled: true,
      types: ['babel', 'coffee', 'typescript', 'iced', 'js'],
      finalExtension: 'js'
    },
    templates: {
      enabled: true,
      types: ['markdown', 'jade', 'slim', 'haml', 'swig', 'html'],
      finalExtension: 'html'
    },
    images: {
      enabled: true,
      types: ['image']
    },
    fonts: {
      enabled: true,
      types: ['font']
    }
  },

  tasks: {
    styles: {
      compass: {
        importPath: [],
        require: [] // 导入需要的 compass 库
      },
      stylus: {},
      less: {},
      postcss: { plugins: [] },
      cleancss: {
        keepSpecialComments: 0
      },
      cssnext: {},
      concat: {
        // example: 后缀名可选，目录需要相对于对应资源的目录，而不是项目目录
        //styl: ['styl-1', 'styl-2', 'sub/styl']
      }
    },
    scripts: {
      uglify: {
        warnings: false,
        mangle: true,
        compress: {
          // 'drop_console': true,
          warnings: false,
        }
      },
      babel: { ast: false, stage: 0 },
      coffee: {},
      typescript: {
        //module: 'commonjs' // commonjs 或 amd
      },
      concat: {}
    },
    templates: {
      htmlMinifier: {
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyJS: true,
        minifyCSS: true
      },
      jade: {
        compileDebug: false,
        pretty: true, // 永远都是 true，要压缩统一用 htmlMinifier
        data: {
          //title: 'Jade - POST WEB'
        }
      },
      slim: {
        data: {
          //title: 'Slim - POST WEB'
        }
      },
      haml: {
        data: {
          //title: 'Haml - POST WEB'
        }
      },
      swig: {
        data: {
          //title: 'Swig - POST WEB'
        }
      }
    },
    images: {
      imagemin: { // 图片压缩选项
        interlaced: true,
        progressive: true,
        optimizationLevel: 3
      },
      img: {}   // 就一个伪造的任务
    },
    fonts: {}
  }
};


module.exports = function(root, userOptions) {

  var opts = _.merge({}, options, userOptions);
  opts.projectDir = root;

  if (opts.environment === 'production') {
    opts.minify = true;
  }

  return opts;
};
