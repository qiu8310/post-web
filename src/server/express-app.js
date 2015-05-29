/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var ylog = require('ylog')('post:server');
var h = require('../helper');

var path = require('path');
var http = require('http');
var https = require('https');

var express = require('express');
var _ = require('lodash');
var lrMiddleWare = require('connect-livereload');
var portscanner = require('portscanner');
var tinylr = require('tiny-lr');
var async = require('async');


function findUnusedPort(port, hostname, callback) {
  // 最多扫描 30 个端口
  portscanner.findAPortNotInUse(port, 30, hostname, callback);
}


/**
 * @param {Object} [options]
 * @param {Number} options.port
 * @param {Number} options.livereload
 * @param {String} options.host
 * @param {String} options.protocol
 * @param {Function} cb
 */
function app(options, cb) {

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  options = _.assign({
    protocol: 'http',
    port: 9000,
    host: '0.0.0.0',
    livereload: 35729
  }, options);


  async.map([options.port, options.livereload],
    function(port, done) {
      if (port) {
        port = parseInt(port, 10);
        findUnusedPort(port, options.host, done);
      } else {
        done(null, port);
      }
    },
    function(err, result) {
      if (err) {
        ylog.fatal(err);
        throw err;
      }
      options.port = result[0];
      options.livereload = result[1];
    });


  var outputHost = options.host === '0.0.0.0' ? 'localhost' : options.host;

  var app = express(), server;

  if (options.livereload) {
    app.lr = new tinylr.Server({port: options.livereload});
    app.lr.server.listen(options.livereload, options.host, function(err) {
      if (err) {
        ylog.fatal(err);
        throw err;
      }

      ylog.ok('livereload server started on ~http://%s:%d~', outputHost, options.livereload);

    });

    app.use(lrMiddleWare({port: options.livereload}));

    app.lr.trigger = function(files) {
      ylog.info('live reloading %j ...', files);
      app.lr.changed({body:{files:files}});
    };
  }


  if (cb) {
    cb.call(express, app, options);
  }

  if (options.protocol === 'https') {
    // copy from grunt-contrib-connect
    server = https.createServer({
      key: options.key || h.readFile(path.join(__dirname, 'certs', 'server.key')),
      cert: options.cert || h.readFile(path.join(__dirname, 'certs', 'server.crt')),
      ca: options.ca || h.readFile(path.join(__dirname, 'certs', 'ca.crt')),
      passphrase: options.passphrase || 'grunt'
    }, app);
  } else {
    server = http.createServer(app);
  }

  server
    .listen(options.port, options.host)
    .on('error', function(err) {
      ylog.error(err);
    })
    .on('listening', function(err) {
      if (err) {
        ylog.error(err);
      } else {
        ylog.ok('web server started on ~%s://%s%s~',
          options.protocol,
          outputHost,
          options.port === 80 ? '' : ':' + options.port
        );
      }
  });
}

module.exports = app;
