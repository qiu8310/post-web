# post-web
[![NPM version](https://badge.fury.io/js/post-web.svg)](https://npmjs.org/package/post-web)
[![GitHub version][git-tag-image]][project-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-url]][daviddm-image]
[![Code Climate][climate-image]][climate-url]
[![Coverage Status][coveralls-image]][coveralls-url]


在项目根目录上运行 `post-web`，自动分析文件结构，同时：

- 将 sass 编译成 css，编译 sass ，同时会使用我预定义好的一些非常有用的 mixin，
- 将 coffee、dart、type、es6 相关的 JS 编译成 es5 版的 js
- 将 图片压缩
- 将 slim、jade 编译成 html


NOTE:

* 所有以 _ 开头的文件都会当作 partial，不会编译
* （要做，因为 compass 会编译）另外 styles 或 scripts 子目录中的文件也不会被编译，它们也被当作 partial


## Usage

### 先全局安装

```bash
npm i -g post-web
```

### 使用 `pweb` 或 `postweb` 命令


```bash

pweb [options] [directory]

pweb --help # 查看帮助

```

__下面指定的版本号只是我系统上安装过没问题的版本，不代表只能安装此版本，但建议大版本号要一致__

### Styles

* sass        - 系统需要安装 compass 1.0.*  (`gem install compass`)
* stylus      - 系统需要安装 stylus 0.51.*  (`npm -g i stylus`)
* less        - 系统需要安装 less 2.5.*     (`npm -g i less`)

### Scripts

* babel       - 使用内部 babel-core 模块
* typescript  - 使用内部 typescript 模块 (对 typescript 还不熟悉，是否需要使用全局模块？)
* coffee      - 系统需要安装 coffee 1.9.*  (`npm -g i coffee-script`)
* iced        - 系统需要安装 iced-coffee-script 1.8.*  （`npm -g i iced-coffee-script`)

### Templates

* markdown    - 使用内部 markdown 模块
* jade        - 使用内部 jade 模块
* slim        - 系统需要安装 slim 3.0.* (`gem install slim`)
* haml        - 系统需要安装 haml 4.0.* (`gem install haml`)






## SASS 处理流

### [compass](http://compass-style.org/)

__使用的是系统的 compass 命令__

compass 会自动 require 这几个项目：

- [compass/import-once/activate](https://github.com/Compass/compass/tree/master/import-once)
- [ceaser-easing](https://github.com/jhardy/compass-ceaser-easing)
- [plugins/extensions 下的所有 rb 文件](./plugins/extensions)


处理 sass 时，可以指定加载我预先定义好的一些[常用的 sass](./plugins/sass)

__如何加载这些常用的 sass 文件呢？__

1. 假设你有一个文件叫 `app.scss`

2. 在同目录下定义一个 `_app_config.scss` 和 `app.require` 两个文件

  - `_app_config.scss` 是你在 `app.scss` 中 import 的文件，你可以在此文件上面定义一些变量，
    或者覆盖 importPath 中的 sass 文件中的变量；总之这个文件在 sass 中会最先执行

  - `app.require` 是你的库加载文件，你可以像 `.gitignore` 一样指定 [plugins/sass](./plugins/sass) 目录中或你自定义的 importPath 中的文件，
    你也可以指定文件夹，前提是文件夹下包含有一个 `_bootstrap.scss` 文件；另外，如果没有 `app.require`，也可以只定义一个 `.require` 文件，
    不过这个 `.require` 文件就可能被 `bar.scss` 或 `xxx.scss` 文件复用
    
3. 在你的 `app.scss` 的最上面使用导入 `_app_config.scss`： `@import "bootstrap";`

4. 在 `app.require` 中定义一些你要加载的文件

5. 大功告成，接下来，你只要在你的项目目录下运行 `pweb` 即可

  - 在编译过程中，会将 `app.require` 中指定的文件导入了 `app.scss` 中，
    编译完成后就会把这些导入的内容删除，所以你看不出编译前后有什么区别


### [autoprefixer](https://github.com/postcss/autoprefixer)

#### Temporary disable

```
a {
    /* autoprefixer: off */
    transition: 1s;
}
```

### [cssnext](https://github.com/cssnext/cssnext)

`cssnext` 中包含了 `autoprefixer`


### [cssgrace](https://github.com/cssdream/cssgrace)

支持的简写形式：

* `position: center; width: 200px; height: 100px;` << `left: 50%; margin-left: -100px; ...` 
* `rgba(0, 0, 0, .5)`     << `filter: progid:DXImageTransform.Microsoft.gradient(startColorstr ...`
* `opacity: .5`           << `filter: alpha(opacity=50)`
* `display: inline-block` << `*display: inline; *zoom: 1`
* 支持使用 image-width 或 image-height 来得到当前 selector 上的图片的宽高
* `text-overflow: ellipsis` << `overflow: auto; white-space: normal;`

### [clean-css](https://github.com/jakubpawlowicz/clean-css)

clean-css 定义了很多优化 css 规则，如果发现你的样式在低版本上不 work 了，可能是 clean-css 帮你优化了。
详情可以去它 [github 主页](https://github.com/jakubpawlowicz/clean-css) 上看它有哪些优化的选项




## Image 处理流

### [imagemin](https://github.com/imagemin/imagemin)


## HTML 处理流

- [haml](http://haml.info/docs/yardoc/file.REFERENCE.html): 使用系统的 haml 命令
- [slim](http://www.rubydoc.info/gems/slim/frames): 使用系统的 slim 命令
markdown, slim, haml, jade, ejs


## JS 处理流

coffee, liveScript, typeScript, dart, atScript

jsx, cjsx (coffee jsx)



## History

[CHANGELOG](CHANGELOG.md)


## License

Copyright (c) 2015 Zhonglei Qiu. Licensed under the MIT license.



[project-url]: https://github.com/qiu8310/post-web
[git-tag-image]: http://img.shields.io/github/tag/qiu8310/post-web.svg
[climate-url]: https://codeclimate.com/github/qiu8310/post-web
[climate-image]: https://codeclimate.com/github/qiu8310/post-web/badges/gpa.svg
[travis-url]: https://travis-ci.org/qiu8310/post-web
[travis-image]: https://travis-ci.org/qiu8310/post-web.svg?branch=master
[daviddm-url]: https://david-dm.org/qiu8310/post-web.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/qiu8310/post-web
[coveralls-url]: https://coveralls.io/r/qiu8310/post-web
[coveralls-image]: https://coveralls.io/repos/qiu8310/post-web/badge.png

