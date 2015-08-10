'use strict';

(function(ns, g, $) {
    var Pattern = {};

    /**
     * @class
     * Mediator class
     */
    Pattern.Mediator = (function () {
        var options = {
            allowDuplicate: false //allow duplicated subscribe channel for identical object
        };
        var channels = {};

        var subscribe = function(channel, fn) {
            //avoid duplicate sub for identical object
            //un-subscribe before add new callback
            if ( !options.allowDuplicate && channels[channel] ) {
                unSubscribe.apply(this, [channel]);
            }
            if ( !channels[channel] ) { channels[channel] = []; }
            channels[channel].push({
                context: this,
                callback: fn
            });
            return this;
        }

        var unSubscribe = function(channel) {
            if ( !channels[channel] ) { return false; }
            for (var i = 0, l = channels[channel].length; i < l; i++) {
                if ( channels[channel][i].context === this ) {
                    channels[channel].splice(i, 1);
                    break;
                }
            }
            return this;
        }

        var publish = function(channel) {
            if ( !channels[channel] ) { return false; }
            var args = Array.prototype.slice.call(arguments, 1);
            for (var i = 0, l = channels[channel].length; i < l; i++) {
                var subscription = channels[channel][i];
                subscription.callback.apply(subscription.context, args);
            }
            return this;
        }

        var setOpts = function(name, value) {
            if ( !options[name] ) { return false; }
            options[name] = value;
        }

        return {
            pub: publish,
            sub: subscribe,
            unsub: unSubscribe,
            installTo: function(obj) {
                obj.pub = publish;
                obj.sub = subscribe;
                obj.unsub = unSubscribe;
                obj.setOpts = setOpts;
            }
        }
    })();
    //export global
    g[ns + 'Pattern'] = Pattern;

    var Helpers = {
        throttle: function(func, wait, options) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            var now = Date.now || function() {
                return new Date().getTime();
            }
            if (!options) options = {};
            var later = function() {
              previous = options.leading === false ? 0 : now();
              timeout = null;
              result = func.apply(context, args);
              if (!timeout) context = args = null;
            };
            return function() {
                var _now = now();
                if (!previous && options.leading === false) previous = _now;
                var remaining = wait - (_now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                    } else if (!timeout && options.trailing !== false) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            }
        },
        debounce: function(func, wait, immediate) {
            var timeout, args, context, timestamp, result;
            var now = Date.now || function() {
                return new Date().getTime();
            }

            var later = function() {
                var last = now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                }
                else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) { context = args = null; }
                    }
                }
            }

            return function() {
                context = this;
                args = arguments;
                timestamp = now();
                var callNow = immediate && !timeout;
                if (!timeout) { timeout = setTimeout(later, wait); }
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            }
        },
        prefixMethod: function(obj, method) {
            var pfx = ['webkit', 'moz', 'ms', 'o', ''];
            var p = 0, m, t;
            while (p < pfx.length && !obj[m]) {
                m = method;
                if (pfx[p] == '') {
                    m = m.substr(0,1).toLowerCase() + m.substr(1);
                }
                m = pfx[p] + m;
                t = typeof obj[m];
                if (t != 'undefined') {
                    pfx = [pfx[p]];
                    return (t == 'function' ? obj[m]() : obj[m]);
                }
                p++;
            }
        },
        isFullscreen: function() {
            return Helpers.prefixMethod(document, 'FullScreen') || Helpers.prefixMethod(document, 'IsFullScreen');
        },
        setFullscreen: function(el) {
            Helpers.prefixMethod(el, 'RequestFullScreen');
        },
        closeFullscreen: function() {
            return Helpers.prefixMethod(document, 'CancelFullScreen');
        }
    }
    //export global
    g[ns + 'Helpers'] = Helpers;

})('MFC_', window, jQuery);