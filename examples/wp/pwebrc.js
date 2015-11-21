module.exports = {
  assetDir: "src",
  webpack: {
    entry: {
      app: './page1.js'
    },
    externals: {
      nm: 'NM'
    }
  }
};
