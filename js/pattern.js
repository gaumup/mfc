'use strict';

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