# post-web
[![NPM version](https://badge.fury.io/js/post-web.svg)](https://npmjs.org/package/post-web)
[![GitHub version][git-tag-image]][project-url]
[![Dependency Status][daviddm-url]][daviddm-image] <!--
[![Build Status][travis-image]][travis-url]
[![Code Climate][climate-image]][climate-url]
[![Coverage Status][coveralls-image]][coveralls-url] -->


__在项目根目录上运行 `pweb`，自动分析文件结构，同时：__

- 将 sass/stylus/less 编译成 css，同时支持 cssnext, autoprefixer 等，
- 将 coffee/jsx/es6/typescript 编译成 js
- 将 slim/jade/haml/md 编译成 html
- 支持 watch 源代码，有改动可以触发上面的对应的编译程序
- 支持 图片/字体/代码 的压缩
- 支持 字体文件自动根据 ttf 字体生成其它三类的字体：eot, svg 和 woff
- 支持启动 express 服务器，并启动 livereload（自动分配可以用的端口，一般不会出现端口被占用的情况）
- 支持在项目目录下设置 `{pweb,postweb,post-web}rc.{json,js,}` pattern 的配置文件（可以配置哪些选项可以查看[options.js](./src/options.js)）
<!-- - 支持 将 ttf 字体生成 css：主要作用是生成 iconfont -->


__缺点：__

- 不支持打包（可以考虑用 grunt 或 gulp 打包 post-web 生成后的代码）
- 不支持具体业务逻辑的处理（同样具体业务逻辑可以考虑处理 post-web 生成后的代码）


__NOTE:__

* 所有以 _ 开头的文件都会当作 partial，不会编译
* watch 过程中不要修改原有资源的文件夹名称（因为这些资源文件夹第一次初始化之后在程序中就不会变了）
* 除了 scripts/styles/templates/images/fonts 之外的其它文件（如 .txt），只有在 production 环境下才会拷贝到 distDir


__TODO:__


* 添加 lint
* 添加编译某些应用（已经支持 concat）
* 添加 hash
* 完善我的 sass 库


## Usage

### 先全局安装

```bash
npm i -g post-web
```

### 使用 `pweb` 或 `pwebs` 命令


```bash

pweb [options] [directory] # directory 是项目的根目录

pweb --help # 查看帮助


```

```bash

pwebs [options] [directories...]  # directory 是你的服务器要监听的静态资源的文件夹


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



### HTML 中的 concat 语法

RegExp: `/([ \t]*)<!--\s*concat:(\S*)\s+([\s\S]*?)\s*-->/gi`

```html

<!-- concat:dir/xx.js a.js,b.js,__bower -->

表示将 scripts/a.js, scripts/b.js 及 bower 安装的模块的所有的 js 文件合并到 scripts/dir/xx.js 中

CSS 的处理方式也类似

```


### SASS 处理

[compass](http://compass-style.org/)

__使用的是系统的 compass 命令__

compass 会自动 require 这几个项目：

- [compass/import-once/activate](https://github.com/Compass/compass/tree/master/import-once)
- [ceaser-easing](https://github.com/jhardy/compass-ceaser-easing)
- [plugins/extensions 下的所有 rb 文件](./plugins/extensions)



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

