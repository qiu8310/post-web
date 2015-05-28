(function() {
  var i, iced, __iced_k, __iced_k_noop, _begin, _end, _i, _positive, _while;

  iced = require('iced-runtime');
  __iced_k = __iced_k_noop = function() {};

  i = 0;
  _begin = 0;
  _end = 10;
  _positive = _end > _begin;
  _while = (function(_this) {
    var __iced_deferrals, _next;
    return function(__iced_k) {
      var _break, _continue;
      _break = __iced_k;
      _continue = function() {
        return iced.trampoline(function() {
          if (_positive) {
            i += 1;
          } else {
            i -= 1;
          }
          return _while(__iced_k);
        });
      };
      _next = _continue;
      if (!!((_positive === true && i > 10) || (_positive === false && i < 10))) {
        return _break();
      } else {

        (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {});
          setTimeout(__iced_deferrals.defer({
            lineno: 2
          }), 100);
          __iced_deferrals._fulfill();
        })(function() {
          return _next(console.log("hello"));
        });
      }
    };
  })(this);
  _while(__iced_k);

}).call(this);
