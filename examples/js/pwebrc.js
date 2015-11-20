module.exports = {
  assetDir: ".",
  proxy: {
    "/api": "http://localhost:9000"
  },
  rewrite: [
    "^/static/(.*) /$1 [L]"
  ]
};
