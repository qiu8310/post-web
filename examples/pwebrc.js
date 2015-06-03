module.exports = {
  server: {
    handler: function(app, serverOpts, globalOpts) {
      console.log();
      console.log('----------- My Server ----------');
      console.log('------- this === express -------');
      console.log('-------  this.modRewrite -------');
    }
  }
};
