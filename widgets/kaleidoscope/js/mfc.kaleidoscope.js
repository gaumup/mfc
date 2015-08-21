'use strict';

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

        var kaleidoscope = $obj;
        var timeline;
        var isGPU = false;
        var _createTimeline = function(c) {
            var t = opts.duration/1000;
            TweenLite.defaultEase = Linear.easeOut;
            timeline = new TimelineLite({
                paused: true,
                onComplete: function() {
                    timeline.seek(0).play(); //loop
                }
            });

            timeline.add( //p1 = t
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '+=1%',
                        yPercent: '+=6.5%',
                        rotation: '-=13deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p2 = t
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '-=4.5%',
                        yPercent: '+=12.5%',
                        rotation: '-=21deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p3 = t/2
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '-=2%',
                        yPercent: '+=4%',
                        rotation: '-=11deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p4 = t/3
                TweenLite.to(c, t/3, {
                    // immediateRender: false,
                    ease: Linear.easeNone,
                    css: {
                        xPercent: '+=7%',
                        yPercent: '-=19%',
                        rotation: '+=53deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p5 = t
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '+=16.5%',
                        yPercent: '-=7.5%',
                        rotation: '+=42deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p6 = t/3
                TweenLite.to(c, t/3, {
                    // immediateRender: false,
                    ease: Linear.easeNone,
                    css: {
                        xPercent: '+=8%',
                        yPercent: '+=2.5%',
                        rotation: '+=24deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p7 = t
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '+=3%',
                        yPercent: '+=2.2%',
                        rotation: '+=15deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p8 = t -> bridge
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '-=10%',
                        yPercent: '-=9%',
                        rotation: '-=20deg'
                    },
                    ease: Linear.easeNone,
                    force3D: isGPU
                })
            );
            timeline.add( //p9 = t/2 -> bridge
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '-=6%',
                        yPercent: '-=1.5%',
                        rotation: '-=17deg'
                    },
                    ease: Linear.easeNone,
                    force3D: isGPU
                })
            );
            timeline.add( //p10 = t/2
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '-=7.5%',
                        yPercent: '+=2%',
                        rotation: '-=30deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p11 = t
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '-=3%',
                        yPercent: '+=9%',
                        rotation: '-=26deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p12 = t/2
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '-=9%',
                        yPercent: '+=19%',
                        rotation: '-=38deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p13 = t/3
                TweenLite.to(c, t/3, {
                    // immediateRender: false,
                    ease: Linear.easeNone,
                    css: {
                        xPercent: '+=10%',
                        yPercent: '-=18%',
                        rotation: '+=53deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p14 = t
                TweenLite.to(c, t/2, {
                    css: {
                        xPercent: '+=15%',
                        yPercent: '-=4.5%',
                        rotation: '+=38deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p15 = t/3
                TweenLite.to(c, t/3, {
                    // immediateRender: false,
                    ease: Linear.easeNone,
                    css: {
                        xPercent: '+=8%',
                        yPercent: '+=2.5%',
                        rotation: '+=24deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.add( //p7 = t
                TweenLite.to(c, t, {
                    css: {
                        xPercent: '+=3%',
                        yPercent: '+=1%',
                        rotation: '+=15deg'
                    },
                    force3D: isGPU
                })
            );
            timeline.play();
        }

        return $obj.data({
            mfcKaleidos: {
                clear: function() {
                    timeline.clear();
                    kaleidoscope.empty();

                    return kaleidoscope;
                },
                play: function(url) {
                    //add template
                    kaleidoscope.html( _template );
                    //set img
                    var c = kaleidoscope.find('.circle-tile')
                    _createTimeline(c);
                    c.add(kaleidoscope).css({
                        backgroundImage: 'url(' + url + ')'
                    });

                    return kaleidoscope;
                },
                pause: function() {
                    timeline.pause();

                    return kaleidoscope;
                },
                resume: function() {
                    timeline.resume();

                    return kaleidoscope;
                }
            }
        });
    }

    //export as jQuery function
    $.fn.mfcKaleidos = function(opts) {
        return MFC_Kaleidos.init(this, opts);
    }
})(jQuery);