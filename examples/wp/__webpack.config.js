module.exports = {
  context: 'src',
  entry: {
    page1: './page1.js'
  },
  externals: {
    nm: 'React.mm'
  },
  output: {
    filename: '[name].new.js',
    chunkFilename: '[id]-[name].js',
    path: './dist',
    publicPath: '/s/',
    library: 'wp'
  }
};
