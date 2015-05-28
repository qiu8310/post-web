/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var _ = require('lodash'),
  os = require('os'),
  path = require('path');

var options = {
  // @TODO 所有目录的路径都要相对于此目录，所以在用命令行时，如果用户配置了某个目录，要记得将其转化成相对目录
  projectDir: null,
  distDir: 'dist',

  assetDir: null,
  excludeDirs: [], // 需要排除的一些文件夹，如果没有指定 assetDir，程序会自动确认 assetDir，但判断过程可能会受其它目录干扰

  environment: 'development',
  minify: false,  // 是否压缩代码，当 environment 为 production 时，此值强制为 true

  runLimit: os.cpus().length, // 每次最多运行进程的数量

  // 这些后缀名主要用来帮助定位找到对应文件所在的目录
  // 这里的先后顺序也很关键，要先定位 styles 和 scripts，确定 assetDir，再定位剩下的三类。
  // 因为 templates, images, fonts 文件都比较常见，可能会出现在很多地方（比如项目的根目录就会有 md 文件）
  locate: {
    styles: ['css', 'sass', 'scss', 'less', 'styl'],
    scripts: ['js', 'jsx', 'coffee', 'iced', 'ts'],

    templates: ['html', 'htm', 'md', 'jade', 'slim', 'haml'],

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
    babel: ['jsx'],
    iced: ['iced'],
    typescript: ['ts'],
    img: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
  },

  src: {},
  tmp: {},
  dist: {},

  tasks: {
    styles: {
      compass: {
        importPath: [],
        require: [] // 导入需要的 compass 库
      },
      stylus: {},
      less: {},
      postcss: { plugins: [] },
      cleancss: {},
      cssnext: {}
    },
    scripts: {
      babel: { ast: false },
      coffee: {},
      typescript: {
        //module: 'commonjs' // commonjs 或 amd
      }
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
          title: 'Jade - POST WEB'
        }
      },
      slim: {
        data: {
          title: 'Slim - POST WEB'
        }
      },
      haml: {
        data: {
          title: 'Haml - POST WEB'
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

  /*
  compass: {
    command: 'compile',
    require: []
  },
  css: {

  },
  cssnext: {

  },
  cleanCss: {

  },
  image: {
    // compass 自动将指定文件夹中的所有图片生成一个 sprite 文件，
    // 如果此选项是 true，则会忽略这些有生成 sprite 文件的文件夹中的所有图片文件
    ignoreSpriteSrc: true
  },
  // imagemin 的配置选项
  imagemin: {
    interlaced: true,
    progressive: true,
    optimizationLevel: 3
  }
  */
};


module.exports = function(root, userOptions) {

  options = _.merge(options, userOptions);
  options.projectDir = root;

  if (options.environment === 'production') {
    options.minify = true;
  }

  return options;

};
