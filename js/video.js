'use strict';

(function($) {
    $(document).ready(function() {

        //TODO
        MFC.Video.init( $('#mfc-video') );
    });

    //MFC Video class
    var MFC = {};
    MFC.Video = {};
    MFC.Video.config = {
    };
    MFC.Video.init = function($video) {
        //set video dimension with ratio 2:1
            var windowHeight = $(window).height();
            var videoHeight = $video.width()/2;
            if ( videoHeight > windowHeight ) {
                $video.css({
                    width: windowHeight*2,
                    height: windowHeight
                });
            }
            else {
                $video.css({ height: videoHeight });
            }

        //apply pub/sub to 'MFC.Video'
            Pattern.Mediator.installTo(MFC.Video);
            MFC.Video.sub( 'MFC.Video:init', MFC.Video.playScene02 );
            MFC.Video.sub( 'MFC.Video.scene01:completed', MFC.Video.playScene02 );
            MFC.Video.sub( 'MFC.Video.scene02:completed', MFC.Video.playScene03 );

        /*
         * 1- load 'config'
         * 2- preparing assets: images, sounds => preloading (show loading during this step)
         * 3- start playing video
         */

        //1- load config
            $.get( 'config.json', function(response) {
                $.extend( true, MFC.Video.config, response );
                $video.removeClass('mfc-video__loading');
                MFC.Video.pub( 'MFC.Video:init', $video );
            } );
    };

    MFC.Video.playScene01 = function($video) {
        //html template
        var _template = (function () {/*
            <div class="block img-placeholder img-placeholder-01 color-style-03" id="scene-01__img-placeholder-01">
                <!-- dynamic loading 'img' -->
            </div>

            <div class="block img-placeholder img-placeholder-02 color-style-03" id="scene-01__img-placeholder-02">
                <!-- dynamic loading 'img' -->
            </div>

            <div class="block anim-block-01 color-style-01" id="scene-01__anim-block-01"></div>

            <div class="block img-placeholder img-placeholder-03 color-style-03" id="scene-01__img-placeholder-03"></div>

            <div class="block anim-block-02" id="scene-01__anim-block-02">
                <div class="block__inner color-style-01"></div>
                <div class="block__inner block__inner--alt color-style-02"></div>
            </div>

            <div class="block scale-block-01" id="scene-01__scale-block-01">
                <div class="block__inner color-style-03">
                    <div class="kaleidoscope__wrapper scene-01__kaleidoscope-01">
                        <div class="kaleidoscope" id="scene-01__kaleidoscope"></div>
                    </div>
                </div>
            </div>

            <div class="block static-block-01 color-style-03" id="scene-01__static-block-01"></div>

            <div class="block anim-block-03 color-style-03" id="scene-01__anim-block-03"></div>
        */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
        $('#scene-01').html( _template );

        //blocks
        var imgPlaceHolder01 = $('#scene-01__img-placeholder-01');
        var imgPlaceHolder02 = $('#scene-01__img-placeholder-02');
        var imgPlaceHolder03 = $('#scene-01__img-placeholder-03');
        var animBlock01 = $('#scene-01__anim-block-01');
        var animBlock02 = $('#scene-01__anim-block-02');
        var scaleBlock01Wrapper = $('#scene-01__scale-block-01');
        var scaleBlock01 = $('#scene-01__scale-block-01 > .block__inner');
        var staticBlock01 = $('#scene-01__static-block-01');
        var animBlock03 = $('#scene-01__anim-block-03');
        /*
         * scene 01 - part 1
         * - anim block on top-right move down
         * - img placeholder 2 slide down, delay about 1/2 scene duration
         * - 2 blocks at bottom-left move left, display ~10% width
         * - hidden block at bottom-left move left, display ~40% width
         */
        MFC.Video.sub( 'MFC.Video.scene01:startPart1', function() {
            var d1 = $.Deferred(); //2 blocks at bottom-left
            var d2 = $.Deferred(); //hidden block at bottom-left
            var d3 = $.Deferred(); //anim block at top-right
            var d4 = $.Deferred(); //img placholder 2 block from top slide down
            $.when( d1, d2, d3, d4 ).done(function() {
                MFC.Video.pub( 'MFC.Video.scene01:startPart2' );
            });
            var t1 = 3000;
            animBlock02.velocity(
                { //2 blocks move left
                    width: '3%'
                },
                {
                    duration: t1,
                    complete: function() {
                        d1.resolve();
                    }
                }
            );
            scaleBlock01.velocity(
                { // hidden block move left
                    width: '100%',
                    right: 0
                },
                {
                    duration: t1,
                    complete: function() {
                        d2.resolve();
                    }
                }
            );
            animBlock01.velocity(
                { // block anim top-right move down
                    height: '48%'
                },
                {
                    duration: t1,
                    complete: function() {
                        d3.resolve();
                    }
                }
            );
            imgPlaceHolder02.velocity(
                { //image placeholder 2 slide down
                    top: 0
                },
                {
                    delay: t1/2,
                    duration: t1/3,
                    complete: function() {
                        d4.resolve();
                    }
                }
            );
        } );

        /*
         * scene 01 - part 2
         * - 2 blocks at bottom-left move right a little bit
         * - hidden block at bottom-left move right a little bit
         * - img placeholder 01 on top-left move left then hide, delay a little bit
         * - anim block on top-right move right then hide, delay a little bit
         */
        MFC.Video.sub( 'MFC.Video.scene01:startPart2', function() {
            var d1 = $.Deferred();
            var d2 = $.Deferred();
            var d3 = $.Deferred();
            var d4 = $.Deferred();
            $.when( d1, d2, d3, d4 ).done(function() {
                MFC.Video.pub( 'MFC.Video.scene01:startPart3' );
            });
            //set state
            scaleBlock01.css({
                right: 'auto',
                left: 0
            });
            //animate
            var t1 = 800;
            animBlock02.velocity(
                { // 2 blocks move right a little bit
                    width: '20%'
                },
                {
                    duration: t1,
                    complete: function() {
                        d1.resolve();
                    }
                }
            );
            scaleBlock01Wrapper.velocity(
                { // blocks move right a little bit
                    width: '22%'
                },
                {
                    duration: t1,
                    complete: function() {
                        d2.resolve();
                    }
                }
            );
            imgPlaceHolder01.velocity(
                {
                    width: 0
                },
                {
                    duration: t1,
                    complete: function() {
                        imgPlaceHolder01.remove();
                        d3.resolve();
                    }
                }
            );
            animBlock01.velocity(
                {
                    width: 0
                },
                {
                    duration: t1/2,
                    complete: function() {
                        animBlock01.remove();
                        d4.resolve();
                    }
                }
            );
        } );

        /*
         * scene 01 - part 3
         * - 2 blocks at bottom-left move left-bottom then hide
         * - hidden block(scale block) at bottom-left move left a little bit, scale up 100% width
         * - img placeholder 02 move right then hide
         * - img placeholder 03 move right then hide
         * - static block at bottom move bottom then hide
         * - anim block 3 appear from the right, at bottom, full-width, delay ~1s after scale block get full-width
         */
        MFC.Video.sub( 'MFC.Video.scene01:startPart3', function() {
            var d1 = $.Deferred(); //2 blocks at bottom-right
            var d2 = $.Deferred(); //scale block
            var d3 = $.Deferred(); //imgPlaceHolder02
            var d4 = $.Deferred(); //imgPlaceHolder03
            var d5 = $.Deferred(); //staticBlock01
            var d6 = $.Deferred(); //anim block at bottom appear
            var d7 = $.Deferred(); //scale block disappear
            var d8 = $.Deferred(); //anim block at bottom disappear
            $.when( d1, d2, d3, d4, d5, d6, d7, d8 ).done(function() {
                MFC.Video.pub( 'MFC.Video.scene01:completed' );
            });
            //animate
            var t1 = 800;
            animBlock02.velocity(
                { // 2 blocks move left and hide to bottom
                    width: '5%',
                    bottom: '-100%'
                },
                {
                    duration: t1,
                    complete: function() {
                        animBlock02.remove();
                        d1.resolve();
                    }
                }
            );
            scaleBlock01Wrapper.velocity(
                { // hidden block grown-up
                    width: '40%',
                    height: '83%'
                },
                {
                    duration: t1,
                    easing: 'linear',
                    complete: function() {
                        scaleBlock01Wrapper.css({
                            right: 'auto',
                            left: scaleBlock01Wrapper.position().left
                        });
                        scaleBlock01Wrapper.velocity(
                            { // hidden block grown-up
                                width: '100%'
                            },
                            {
                                duration: t1,
                                queue: false
                            }
                        );
                    }
                }
            );
            setTimeout(function() {
                scaleBlock01Wrapper.css({
                    bottom: 'auto',
                    top: scaleBlock01Wrapper.position().top
                });
                scaleBlock01Wrapper.velocity(
                    { // hidden block scale full-width, align top
                        left: 0,
                        top: 0
                    },
                    {
                        duration: t1/2,
                        queue: false,
                        complete: function() {
                            var kaleidoscope = $('#scene-01__kaleidoscope');
                            var kaleidoscopeWrapper = kaleidoscope.parent();
                            kaleidoscopeWrapper.css({ width: kaleidoscopeWrapper.height() })
                            kaleidoscope.kaleidescope({
                                src: '',
                                opacity: 1,
                                opacityAnim: 800
                            });
                            d2.resolve();
                        }
                    }
                )
            }, t1*4/3);
            imgPlaceHolder02.velocity(
                {
                    left: '100%'
                },
                {
                    delay: t1*3/4,
                    duration: t1/3,
                    complete: function() {
                        imgPlaceHolder02.remove();
                        d3.resolve();
                    }
                }
            );
            imgPlaceHolder03.velocity(
                {
                    right: '-100%'
                },
                {
                    delay: t1*3/4,
                    duration: t1/3,
                    complete: function() {
                        imgPlaceHolder03.remove();
                        d4.resolve();
                    }
                }
            );
            staticBlock01.velocity(
                {
                    height: 0
                },
                {
                    delay: t1/4,
                    duration: t1/2,
                    complete: function() {
                        staticBlock01.remove();
                        d5.resolve();
                    }
                }
            );
            $.when( d2 ).done(function(v2) {
                animBlock03.velocity(
                    {
                        width: '100%'
                    },
                    {
                        delay: 500,
                        duration: t1,
                        complete: function() {
                            d6.resolve();
                        }
                    }
                );
            });
            $.when( d2, d6 ).done(function() {
                var _delay = 2000;
                scaleBlock01Wrapper.velocity(
                    {
                        left: '100%'
                    },
                    {
                        delay: _delay,
                        duration: t1/2,
                        complete: function() {
                            d7.resolve();
                        }
                    }
                );
                animBlock03.velocity(
                    {
                        left: '-100%'
                    },
                    {
                        delay: _delay,
                        duration: t1/2,
                        complete: function() {
                            d8.resolve();
                        }
                    }
                );
            });
        } );

        //do something before start scene 01
        //...
        MFC.Video.pub( 'MFC.Video.scene01:startPart1' );
    };
    MFC.Video.playScene02 = function() {
        //html template
        var _template = (function () {/*
            <div class="block anim-block-01 color-style-default" id="scene-02__anim-block-01">
                <div class="kaleidoscope__wrapper scene-02__kaleidoscope-01">
                    <div class="kaleidoscope" id="scene-02__kaleidoscope"></div>
                </div>
                <p id="scene-02__kaleidoscope-text" class="kaleidoscope-text"></p>
            </div>

            <div class="block img-placeholder-01" id="scene-02__img-placeholder-01">
                <div class="block__inner color-style-default">
                    <!-- dynamic img -->
                </div>
            </div>

            <div class="block anim-block-02 color-style-default" id="scene-02__anim-block-02">
                <p id="scene-02__kaleidoscope-sentence" class="kaleidoscope-sentence"></p>
            </div>
        */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
        $('#scene-02').html( _template );

        //blocks
        var animBlock01 = $('#scene-02__anim-block-01');
        var imgPlaceHolder01Wrapper = $('#scene-02__img-placeholder-01');
        var imgPlaceHolder01 = $('#scene-02__img-placeholder-01 > .block__inner');
        var animBlock02 = $('#scene-02__anim-block-02');
        var kaleidoscope = $('#scene-02__kaleidoscope');
        var kaleidoscopeWrapper = kaleidoscope.parent();
        var kaleidoscopeText = $('#scene-02__kaleidoscope-text');
        var kaleidoscopeTextHeight = kaleidoscopeText.height();
        var kaleidoscopeSentence = $('#scene-02__kaleidoscope-sentence');
        var kaleidoscopeSentenceHeight = kaleidoscopeSentence.height();
        var arrTxt = [ //dummy
            {
                text: 'I',
                fontSize: '60%',
                fontColor: '#fff',
                themeBgColor: '#23092D',
                themeBgImg: 'images/idol-19.jpg',
                themeBgKaleidoscope: 'images/idol-19-k.jpg',
            },
            {
                text: 'n',
                fontSize: '80%',
                fontColor: '#fff',
                themeBgColor: '#311036',
                themeBgImg: 'images/idol-07.jpg',
                themeBgKaleidoscope: 'images/idol-07.jpg',
                themeSound: ''
            },
            {
                text: 't',
                fontSize: '50%',
                fontColor: '#fff',
                themeBgColor: '#1E214C',
                themeBgImg: 'images/idol-05.jpg',
                themeBgKaleidoscope: 'images/idol-05.jpg',
                themeSound: ''
            },
            {
                text: 'e',
                fontSize: '50%',
                fontColor: '#fff',
                themeBgColor: '#242860',
                themeBgImg: 'images/idol-08.jpg',
                themeBgKaleidoscope: 'images/idol-08.jpg',
                themeSound: ''
            },
            {
                text: 'R',
                fontSize: '115%',
                fontColor: '#fff',
                themeBgColor: '#06616E',
                themeBgImg: 'images/idol-16.jpg',
                themeBgKaleidoscope: 'images/idol-16.jpg',
                themeSound: ''
            },
            {
                text: 'o',
                fontSize: '78%',
                fontColor: '#fff',
                themeBgColor: '#073664',
                themeBgImg: 'images/idol-09.jpg',
                themeBgKaleidoscope: 'images/idol-09.jpg',
                themeSound: ''
            },
        ];

        MFC.Video.sub( 'MFC.Video.scene02:start', function() {
            //init kaleidoscope & text inside
            kaleidoscopeWrapper.css({ width: kaleidoscopeWrapper.height() })
            kaleidoscope.kaleidescope({
                src: ''
            });
            //text inside kaleidoscope
            kaleidoscopeText
                .text( arrTxt[0].text )
                .css({
                    fontSize: parseInt(kaleidoscopeTextHeight)*parseInt(arrTxt[0].fontSize)/100 + 'px',
                    color: arrTxt[0].fontColor,
                    lineHeight: kaleidoscopeTextHeight + 'px'
                });
            //sentence at bottom
            kaleidoscopeSentence
                .empty()
                .css({
                    fontSize: parseInt(kaleidoscopeSentenceHeight)*.9 + 'px',
                    lineHeight: kaleidoscopeSentenceHeight + 'px'
                });
            //set theme
            animBlock01.add(animBlock02).css({
                backgroundColor: arrTxt[0].themeBgColor
            });
            imgPlaceHolder01.css({
                backgroundImage: 'url(' + arrTxt[0].themeBgImg + ')'
            });
            kaleidoscope.find('> .tile > .image').css({
                backgroundImage: 'url(' + arrTxt[0].themeBgKaleidoscope + ')'
            });

            var d1 = $.Deferred(); //block contains kaleidoscope
            var d2 = $.Deferred(); //block contains img on the right
            var d3 = $.Deferred(); //block at the bottom
            $.when( d1, d2, d3 ).done(function(v1, v2, v3 ) {
                // MFC.Video.pub( 'MFC.Video.scene02:animCompleted' );
            });
            var t1 = 500;
            animBlock01.velocity(
                { //block contains kaleidoscope move right full-width
                    left: 0
                },
                {
                    duration: t1,
                    complete: function() {
                        d1.resolve();
                    }
                }
            );
            $.when( d1 ).done(function() {
                imgPlaceHolder01Wrapper.velocity(
                    { //block contains img move left
                        right: 0
                    },
                    {
                        delay: 200,
                        duration: t1/2,
                        easing: 'easeIn',
                        complete: function() {
                            d2.resolve();
                        }
                    }
                );
            });
            animBlock02.velocity(
                { //block at the bottom move left full-width
                    width: '100%'
                },
                {
                    duration: t1,
                    complete: function() {
                        d3.resolve();
                    }
                }
            );
        } );

        MFC.Video.sub( 'MFC.Video.scene02:animCompleted', function() {
            var i = 1;
            var kaleidoscopeTextIntv = setInterval(function() {
                if ( i == arrTxt.length - 1 ) {
                    setTimeout(function() {
                        kaleidoscopeSentence.append( arrTxt[i-1].text );
                    }, 2000);
                    clearInterval(kaleidoscopeTextIntv);
                }
                kaleidoscopeSentence.append( arrTxt[i-1].text );
                kaleidoscopeText
                    .text( arrTxt[i].text )
                    .css({
                        fontSize: parseInt(kaleidoscopeTextHeight)*parseInt(arrTxt[i].fontSize)/100 + 'px',
                        lineHeight: kaleidoscopeTextHeight + 'px',
                        color: arrTxt[i].fontColor
                    });

                //change theme color
                animBlock01.add(animBlock02).css({
                    backgroundColor: arrTxt[i].themeBgColor
                });
                imgPlaceHolder01.css({
                    backgroundImage: 'url(' + arrTxt[i].themeBgImg + ')'
                });
                kaleidoscope.find('> .tile > .image').css({
                    backgroundImage: 'url(' + arrTxt[i].themeBgKaleidoscope + ')'
                });

                i++;
            }, 2000);
        } );

        //do something before start scene 02
        //...
        MFC.Video.pub( 'MFC.Video.scene02:start' );
    };
    MFC.Video.playScene03 = function() {

        //TODO
    };
})(jQuery);