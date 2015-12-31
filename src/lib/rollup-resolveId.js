var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');

function isFile ( file ) {
  try {
    var stats = fs.statSync( file );
    return stats.isFile();
  } catch ( err ) {
    return false;
  }
}


module.exports = function (initOpts) {

  var ylog = this;
  var extensions = initOpts.extensions ? [].concat(initOpts.extensions) : ['', 'jsx', 'js'];

  return {
    resolveId: function (importee, importer) {
      if (!extensions || !extensions.length) return importee;

      var id;
      var found = _.find(extensions, function(ext) {
        id = importee + (ext.length && ext[0] !== '.' ? '.' + ext : ext);

        if (importer) id = path.resolve(path.dirname(importer), id);

        return isFile(id) ? true : false;
      });

      if (found) return id;
      ylog.warn('module ' + importee + ' not found');
      // throw new Error('Can not found module ' + importee); // 有可能是 external 模块
    }
  };
}
