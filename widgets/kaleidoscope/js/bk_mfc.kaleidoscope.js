'use strict';

/*
    themesColor: [
        '#204D88', //1
        '#2F285B', //2
        '#383B70', //3
        '#5C2E5D', //4
        '#404587', //5
        '#412A56', //6
        '#6B3571', //7
        '#454E9B', //8
        '#1D5A9D', //9
        '#432E71', //10
        '#FF79FE', //11
        '#650080', //12
        '#B901DF', //13
        '#1EB4CF', //14
        '#013186', //15
        '#0093B4', //16
        '#006188', //17
        '#9900F9', //18
        '#4F2660', //19
        '#008FFF'  //20
    ]
 */

(function($) {
    // start matching after: comment start block => ! or @preserve => optional whitespace => newline
    // stop matching before: last newline => optional whitespace => comment end block
    var _template = (function() {/*!
        <div class="mfc__kaleidoscope-wrapper">
            <div class="mfc__kaleidoscope">
                <div class="mfc__kaleidoscope-tile t0">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t1">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t2">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t3">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t4">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t5">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t6">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mfc__kaleidoscope-tile t7">
                    <div class="tile-helper">
                        <div class="mfc__kaleidoscope-image">
                            <div class="ct">
                                <div class="circle-tile"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    */}).toString().match(/\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//)[1];

    var MFC_Kaleidos = {};
    MFC_Kaleidos.init = function($obj, params) {
        var opts = $.extend( true, {
            delay: 500,
            duration: 1000
        }, params );

        var kaleidoscope = $obj.html( _template );
        var c = kaleidoscope.find('.circle-tile') ;
        var s = opts.duration;
        var _setDuration = function(el, duration) {
            return el.css({
                'transition-duration': duration/1000 + 's',
                '-webkit-transition-duration': duration/1000 + 's'
            });
        }
        var _setEasing = function(el, timingFunc) {
            return el.css({
                'transition-timing-function': timingFunc,
                '-webkit-transition-timing-function': timingFunc
            });
        }
        //loop
        var timer = function() {
            //run animation
            setTimeout(function() {
                c.addClass('animating');
                c.addClass('p1');
                _setDuration(c, s);
            }, opts.delay);
            setTimeout(function() { //p1 duration = 1s
                c.removeClass('p1');
                c.addClass('p2');
                _setDuration(c, s);
                _setEasing(c, 'cubic-bezier(1, 1.25, 0.75, 2)');
            }, s+opts.delay);
            setTimeout(function() { //p2 duration = 1s
                c.removeClass('p2');
                c.addClass('p3');
                _setDuration(c, s);
                _setEasing(c, 'linear');
            }, s+s+opts.delay);
            setTimeout(function() { //p3 duration = 1s
                c.removeClass('p3');
                c.addClass('p4');
                _setDuration(c, s/4);
            }, s+s+s+opts.delay);
            setTimeout(function() { //p4 duration = 0.25s = s/4
                c.removeClass('p4');
                c.addClass('p5');
                _setDuration(c, s/2);
            }, s+s+s+s/4+opts.delay);
            setTimeout(function() { //p5 duration = 0.5s = s/2
                c.removeClass('p5');
                c.addClass('p6');
                _setDuration(c, s/5);
            }, s+s+s+s/4+s/2+opts.delay);
            setTimeout(function() { //p6 duration = 0.2s = s/5
                c.removeClass('p6');
                c.addClass('p7');
                _setDuration(c, s/2);
            }, s+s+s+s/4+s/2+s/5+opts.delay);
            setTimeout(function() { //p7 duration = 0.5s = s/2 + delay 0.2s = s/5
                c.removeClass('p7');
                c.addClass('p8');
                _setDuration(c, s/5);
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+opts.delay);
            setTimeout(function() { //p8 duration = 0.2s = s/5
                c.removeClass('p8');
                c.addClass('p9');
                _setDuration(c, s/2);
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+s/5+opts.delay);
            setTimeout(function() { //p9 duration = 0.5s = s/2
                c.removeClass('p9');
                c.addClass('p10');
                _setDuration(c, 0);
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+s/5+s/2+opts.delay);
            setTimeout(function() { //p10 duration = 0s + delay 0.1s = s/10
                c.removeClass('p10');
                c.addClass('p11');
                _setDuration(c, s);
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+s/5+s/2+s/10+opts.delay);
            setTimeout(function() { //p11 duration = 1s = s
                c.removeClass('p11');
                c.addClass('p12');
                _setDuration(c, s);
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+s/5+s/2+s/10+s+opts.delay);
            setTimeout(function() { //p12 duration = 1s = s
                c.removeClass('p12').removeClass('animating');
                timer();
            }, s+s+s+s/4+s/2+s/5+s/2+s/5+s/5+s/2+s/10+s+s+opts.delay);
        }
        timer();

        return $obj.extend( true, {
            mfcKaleidos: {
                update: function(url, themeColor) {
                    kaleidoscope.find('.circle-tile').css({
                        backgroundImage: 'url(' + url + ')'
                    });
                    kaleidoscope.css({
                         backgroundColor: themeColor
                    });

                    return kaleidoscope;
                }
            }
        } );
    }

    //export as jQuery function
    $.fn.mfcKaleidos = function(opts) {
        return MFC_Kaleidos.init(this, opts);
    }
})(jQuery);