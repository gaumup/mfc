'use strict';

(function($) {
    $(document).ready(function() {
        MFC.Video.init( $('#mfc-video'), 'config.json', {
            debug: true
        } );
    });

    //MFC namespace
    var ns = 'MFC_';
    var Pattern = window[ns + 'Pattern'];
    var Helpers = window[ns + 'Helpers'];
    // start matching after: comment start block => ! or @preserve => optional whitespace => newline
    // stop matching before: last newline => optional whitespace => comment end block
    var reCommentContents = /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//;

    //MFC Video class
    var MFC = {};
    MFC.Video = {};
    MFC.Video.config = {
    };
    MFC.Video.controls = {};
    MFC.Video.soundManager = createjs.Sound;
    MFC.Video.imageManager = (function() {
        var store = {};
        var _set = function(id, value) {
            store[id] = value;
        }
        var _get = function(id) { return store[id]; }

        return {
            set: _set,
            get: _get
        }
    })();
    MFC.Video.init = function($video, $configUrl, opts) {
        MFC.Video.player = $video;

        //common vars
            var playPauseReplayBtn = MFC.Video.controls.playPauseReplayBtn = $('#mfc-play-pause-replay');
            var stopBtn = MFC.Video.controls.stopBtn = $('#mfc-stop');
            var $body = $('body');

        //logs
            var _log = (function() {
                if ( opts.debug ) {
                    var _console = $('<div id="logs" class="logs"></div>').prependTo('body');

                    return (function(content) {
                        _console.append('<p>- ' + content + '</p>');
                    });
                }
                else {
                    return (function() {});
                }
            })();

        //set video dimension with ratio 2:1
            var _setVideoHeightLazy = Helpers.throttle( function(e) {
                //video size
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

                //kaleidoscope wrapper size
                $('.kaleidoscope__wrapper').each(function() {
                    var $this = $(this);
                    $this.css({ width: $this.height() });
                });
            }, 250 );
            _setVideoHeightLazy();
            $(window).on( 'resize', _setVideoHeightLazy );

        //apply pub/sub to 'MFC.Video'
            Pattern.Mediator.installTo(MFC.Video);
            MFC.Video.sub( 'MFC.Video:init', function() {
                $body.attr('data-state', 'playing');
                MFC.Video.playScene01();
            });
            MFC.Video.sub( 'MFC.Video.stop', MFC.Video.stop );

        /*
         * 1- load 'config' -> publish 'MFC.Video.config:ready'
         * 2- preparing assets: images, sounds => preloading (show loading during this step) -> publish 'MFC.Video:ready'
         * 3- start playing video -> publish 'MFC.Video:init'
         */

        //1- load config
            var loadingProgress = $('#mfc-loading-progress');
            var loadingProgressText = loadingProgress.find('> span').eq(0);
            var loadingProgressHeight;
            var _setLoadingProgressFont = Helpers.throttle(function() {
                loadingProgressHeight = loadingProgress.height();
                loadingProgress.css({
                    fontSize: loadingProgressHeight*.11 + 'px',
                    lineHeight: loadingProgressHeight + 'px'
                });
            }, 250);

            $(window).on( 'resize', _setLoadingProgressFont );
            $.getJSON($configUrl)
                .done(function(response) {
                    $.extend( true, MFC.Video.config, response );
                    MFC.Video.pub( 'MFC.Video.config:ready' );
                })
                .fail(function() {
                })
                .always(function() {});

        //2- preparing assets: images and sounds
            MFC.Video.sub( 'MFC.Video.config:ready', function() {
                playPauseReplayBtn.on('click touch', function() {
                    _log('Loading...');

                    playPauseReplayBtn.addClass('playing');

                    if ( $body.attr('data-state').indexOf('replay') > 0 ) {
                        MFC.Video.pub( 'MFC.Video:init' );
                    }
                    else {
                        $body.attr('data-state', 'loading');
                        MFC.Video.pub( 'MFC.Video.startLoading' );
                    }
                });
                stopBtn.on('click touch', function() {
                    _log('Stop');
                    MFC.Video.pub( 'MFC.Video.stop' );
                });
            } );
            MFC.Video.sub( 'MFC.Video.startLoading', function() {
                loadingProgress.removeClass('hidden');
                _setLoadingProgressFont();

                var overallProgress = 0;
                var _setLoadingProgress = function() {
                    loadingProgressText.text( Math.round( (++overallProgress/totalAssets)*100 ) );
                }

                //preparing assets: images + sounds
                var isAllImagesLoaded = false;
                var isAllSoundLoaded = false;
                var totalAssets = MFC.Video.config.images.total + MFC.Video.config.sound.total;
                MFC.Video.sub( 'MFC.Video.assets:load', function() {
                    if ( isAllImagesLoaded && isAllSoundLoaded ) {
                        MFC.Video.pub( 'MFC.Video:ready' );
                    }
                } );

                //preload image
                var imageLoad = 0;
                MFC.Video.sub( 'MFC.Video.image:load', function() {
                    _log( '<span style="color:#6D9F43">Done: ' + arguments[0] + '</span>' );
                    imageLoad++;
                    _setLoadingProgress();
                    if ( imageLoad == MFC.Video.config.images.total ) {
                        isAllImagesLoaded = true;
                        MFC.Video.pub( 'MFC.Video.assets:load' );
                    }
                } );
                MFC.Video.sub( 'MFC.Video.image:fail', function() {
                    _log( '<span style="color:#f00">Failed: "' + arguments[0] + '</span>' );
                } );
                // load images
                var imagesQueue = new createjs.LoadQueue(true);
                $.each(MFC.Video.config.images.files, function(key, images) {
                    $.each(images, function(_subkey, _image) {
                        var _img = new Image();
                        _img.onload = function() {
                            MFC.Video.pub( 'MFC.Video.image:load', _image );
                        }
                        _img.onerror = function() {
                            MFC.Video.pub( 'MFC.Video.image:fail', _image );
                        }
                        _img.src = _image;
                        MFC.Video.imageManager.set( key + '_' + _subkey, _image );
                    });
                });

                //preload sound
                var soundLoaded = 0;
                MFC.Video.sub( 'MFC.Video.sound:load', function() {
                    _log( '<span style="color:#6D9F43">Done: ' + arguments[0] + '": ' + arguments[1] + '</span>' );
                    soundLoaded++;
                    _setLoadingProgress();
                    if ( soundLoaded == MFC.Video.config.sound.total ) {
                        isAllSoundLoaded = true;
                        MFC.Video.pub( 'MFC.Video.assets:load' );
                    }
                } );
                MFC.Video.sub( 'MFC.Video.sound:fail', function() {
                    _log( '<span style="color:#f00">Failed: "' + arguments[0] + '": ' + arguments[1] + '</span>' );
                } );
                //SoundJS
                createjs.Sound.addEventListener('fileload', function(e) {
                    MFC.Video.pub( 'MFC.Video.sound:load', e.id, e.src );
                });
                $.each(MFC.Video.config.sound.files, function(key, sounds) {
                    $.each(sounds, function(_subkey, _sound) {
                        _log('Loading: "' + (key + '_' + _subkey) + '": ' + _sound);
                        createjs.Sound.registerSound( _sound, (key + '_' + _subkey) );
                    });
                });
            } );

        //3- start playing video
            MFC.Video.sub( 'MFC.Video:ready', function() {
                loadingProgress.velocity(
                    {
                        opacity: 0
                    },
                    {
                        duration: 800,
                        complete: function() {
                            loadingProgress.remove();
                            $video.removeClass('mfc-video__loading');
                            MFC.Video.pub( 'MFC.Video:init' );
                        }
                    }
                )
            } );
    };

    MFC.Video.stop = function() {
        //1- clear all subscribes
            //part 1
            MFC.Video.unsub( 'MFC.Video.scene01:startPart1' );
            MFC.Video.unsub( 'MFC.Video.scene01:startPart2' );
            MFC.Video.unsub( 'MFC.Video.scene01:startPart3' );
            MFC.Video.unsub( 'MFC.Video.scene01:completed' );
            //part 2
            MFC.Video.unsub( 'MFC.Video.scene02:start' );
            MFC.Video.unsub( 'MFC.Video.scene02:initKaleidoscopeLoop' );
            MFC.Video.unsub( 'MFC.Video.scene02:completed' );
            //part 3
            MFC.Video.unsub( 'MFC.Video.scene03:startPart1' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart2' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart3' );

        //2- stop all animation
            $('.velocity-animating').velocity( 'stop', true );

        //3- clear all generated HTML
            // MFC.Video.player.find('.stage').empty();

        //4- stop all sounds, note: stop but not remove sound registers
            MFC.Video.soundManager.stop();

        //5- update <body> state
            $('body').attr('data-state', 'stop replay');

        //6- update buttons state & display
            MFC.Video.controls.playPauseReplayBtn.removeClass('playing');
    }
    MFC.Video.playScene01 = function() {
        MFC.Video.sub( 'MFC.Video.scene01:completed', MFC.Video.playScene02 );

        //html template
        var _template = (function() {/*!
            <div class="block img-placeholder img-placeholder-01 color-style-03" id="scene-01__img-placeholder-01">
                <div class="img-alpha-layer color-style-03"></div>
            </div>

            <div class="block img-placeholder img-placeholder-02 color-style-03" id="scene-01__img-placeholder-02"></div>

            <div class="block anim-block-01 color-style-01" id="scene-01__anim-block-01"></div>

            <div class="block img-placeholder img-placeholder-03 color-style-03" id="scene-01__img-placeholder-03"></div>

            <div class="block anim-block-02" id="scene-01__anim-block-02">
                <div class="block__inner color-style-01"></div>
                <div class="block__inner block__inner--alt color-style-02"></div>
            </div>

            <div class="block scale-block-01" id="scene-01__scale-block-01">
                <div class="block__inner color-style-03">
                    <div class="kaleidoscope" id="scene-01__kaleidoscope"></div>
                </div>
            </div>

            <div class="block static-block-01 color-style-03" id="scene-01__static-block-01"></div>

            <div class="block anim-block-03 color-style-03" id="scene-01__anim-block-03"></div>
        */}).toString().match(reCommentContents)[1];
        var stage = $('#scene-01').html( _template );
        var sound = MFC.Video.soundManager.createInstance('scene01_sound01');

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
            //play sound
            sound.play();

            //set cover image to img placeholder block
            imgPlaceHolder01
                .css({
                    backgroundImage: 'url(' + MFC.Video.imageManager.get( MFC.Video.config.cover.image ) + ')'
                });
            imgPlaceHolder02.add(imgPlaceHolder03)
                .css({
                    backgroundImage: 'url(' + MFC.Video.imageManager.get( MFC.Video.config.cover.image ) + ')'
                });

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
                    left: '-100%'
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
                    right: '-100%'
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
                MFC.Video.soundManager.stop();
                stage.empty();
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
                            var kaleidoscopeApi = kaleidoscope.mfcKaleidos({
                                delay: 100,
                                duration: 500
                            });
                            //set theme color/img
                            kaleidoscopeApi.updateImg(
                                kaleidoscope,
                                MFC.Video.imageManager.get( MFC.Video.config.cover.image ),
                                MFC.Video.config.cover.bgColor
                            );
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
                var _delay = 1000;
                scaleBlock01Wrapper.velocity(
                    {
                        left: '100%'
                    },
                    {
                        delay: _delay,
                        duration: t1/3,
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
                        duration: t1/3,
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
        MFC.Video.sub( 'MFC.Video.scene02:completed', MFC.Video.playScene03 );

        //html template
        var _template = (function() {/*!
            <div class="block anim-block-01 color-style-default" id="scene-02__anim-block-01">
                <div class="kaleidoscope" id="scene-02__kaleidoscope"></div>
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
        */}).toString().match(reCommentContents)[1];
        var stage = $('#scene-02').html( _template );
        var sound;

        //blocks
        var animBlock01 = $('#scene-02__anim-block-01');
        var imgPlaceHolder01Wrapper = $('#scene-02__img-placeholder-01');
        var imgPlaceHolder01 = $('#scene-02__img-placeholder-01 > .block__inner');
        var animBlock02 = $('#scene-02__anim-block-02');
        var kaleidoscope = $('#scene-02__kaleidoscope');
        var kaleidoscopeText = $('#scene-02__kaleidoscope-text');
        var kaleidoscopeSentence = $('#scene-02__kaleidoscope-sentence');
        var kaleidoscopeSentenceHeight = kaleidoscopeSentence.height();
        var arrTxt = MFC.Video.config.message;

        MFC.Video.sub( 'MFC.Video.scene02:start', function() {
            //sentence at bottom
            kaleidoscopeSentence
                .empty()
                .css({
                    fontSize: parseInt(kaleidoscopeSentenceHeight)*.9 + 'px',
                    lineHeight: kaleidoscopeSentenceHeight + 'px'
                });

            //init kaleidoscope & text inside
            MFC.Video.pub( 'MFC.Video.scene02:initKaleidoscopeLoop' );

            var d1 = $.Deferred(); //block contains kaleidoscope
            var d2 = $.Deferred(); //block contains img on the right
            var d3 = $.Deferred(); //block at the bottom
            $.when( d1, d2, d3 ).done(function(v1, v2, v3 ) {
                //TODO...
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

        MFC.Video.sub( 'MFC.Video.scene02:initKaleidoscopeLoop', function() {
            var i = 0;
            var t = 1;
            var _ajustKaleidoscopeFont = Helpers.throttle(function() {
                //word in kaleidoscope
                var _kHeight = kaleidoscope.height();
                var _height = _kHeight*parseInt(arrTxt[i].fontSize)/100;
                kaleidoscopeText.css({
                    fontSize: _height + 'px',
                    lineHeight: _kHeight + 'px',
                });

                //sentence
                kaleidoscopeSentenceHeight = kaleidoscopeSentence.height();
                kaleidoscopeSentence.css({
                    fontSize: kaleidoscopeSentenceHeight + 'px',
                    lineHeight: kaleidoscopeSentenceHeight + 'px',
                });
            }, 250);
            $(window).on( 'resize', _ajustKaleidoscopeFont );
            var kaleidoscopeApi;
            var kaleidoscopeTextIntv = function() {
                setTimeout(function() {
                    if ( t == 1 ) { //1st time, init kaleidoscope
                        kaleidoscopeApi = kaleidoscope.mfcKaleidos({
                            delay: 200,
                            duration: 400
                        });
                        t = 2000;
                    }

                    //get/play sound
                    if ( sound !== undefined ) {
                        sound.stop();
                    }
                    sound = MFC.Video.soundManager.createInstance( arrTxt[i].themeSound );
                    sound.play();

                    //set theme color/img
                    kaleidoscopeApi.updateImg(
                        kaleidoscope,
                        MFC.Video.imageManager.get( arrTxt[i].themeBgKaleidoscope ),
                        arrTxt[i].themeBgKaleidoscopeColor
                    );
                    //load new text to kaleidoscope
                    kaleidoscopeText.text( arrTxt[i].text );
                    _ajustKaleidoscopeFont();

                    //set theme color
                    animBlock01.add(animBlock02).css({
                        backgroundColor: arrTxt[i].themeBgColor
                    });
                    imgPlaceHolder01.css({
                        backgroundImage: 'url(' + MFC.Video.imageManager.get( arrTxt[i].themeBgImg ) + ')'
                    });

                    //update text to sentence at bottom
                    if ( i > 0 ) {
                        kaleidoscopeSentence.append( arrTxt[i-1].text );
                    }

                    if ( i == arrTxt.length - 1 ) { //last word
                        setTimeout(function() {
                            kaleidoscopeSentence.append( arrTxt[i].text );
                        }, t);
                        setTimeout(function() {
                            sound.stop();
                            stage.empty();
                            MFC.Video.pub( 'MFC.Video.scene02:completed' );
                        }, t + 500);
                    }
                    else { //do the loop
                        setTimeout(kaleidoscopeTextIntv, t);
                        i++;
                    }
                }, t);
            }
            kaleidoscopeTextIntv();
        } );

        //do something before start scene 02
        //...
        MFC.Video.pub( 'MFC.Video.scene02:start' );
    };
    MFC.Video.playScene03 = function() {
        //html template
        var _templatePart01 = (function() {/*!
            <div class="sentence-row sentence-row-01"></div>
            <div class="sentence-row sentence-row-02"></div>
            <div class="sentence-row sentence-row-03"></div>
        */}).toString().match(reCommentContents)[1];
        var _templatePart02 = (function() {/*!
            <div class="word-block-wrapper" id="scene-03__word-block-wrapper">
                <div class="word-block word-block-01 color-style-03">
                    <span>Message</span>
                    <hr class="color-style-03" />
                    <hr class="color-style-03" />
                    <hr class="color-style-03" />
                    <hr class="color-style-03" />
                </div>
                <div class="word-block word-block-02 color-style-04">
                    <span>in the</span>
                    <hr class="color-style-04" />
                    <hr class="color-style-04" />
                    <hr class="color-style-04" />
                    <hr class="color-style-04" />
                </div>
                <div class="word-block word-block-03 color-style-01">
                    <span>music</span>
                    <hr class="color-style-01" />
                    <hr class="color-style-01" />
                    <hr class="color-style-01" />
                    <hr class="color-style-01" />
                </div>
            </div>
        */}).toString().match(reCommentContents)[1];
        var _templatePart03 = (function() {/*!
            <div class="mfc-banner-01 color-style-01" id="scene-03__mfc-banner-01">Sschh...Schubert!</div>
            <div class="mfc-big-day" id="scene-03__mfc-big-day">13.09.2015</div>
            <div class="mfc-brand">
                <a class="mfc-logo" href="#" title=""></a>
                <p class="mfc-copyright" id="scene-03__mfc-copyright">Music for Community</p>
            </div>
        */}).toString().match(reCommentContents)[1];
        var stage = $('#scene-03').html(_templatePart01);
        var sound = MFC.Video.soundManager.createInstance( 'scene03_sound01' );
        var sentence = MFC.Video.config.sentence;

        /*
         * scene 03 - part 1
         * - load pre-defined sentence into block words & spaces
         * - delay for 3s before go to part 2
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart1', function() {
            sound.play();

            var $rows = $('.sentence-row');
            var isKeywordHidden = true;
            var _preparingContent = Helpers.throttle( function() { //need responsively update
                $rows.empty();
                var stageWidth = stage.width();
                var sentenceBreakdown = sentence.phase.split(' ');
                var totalBlocks = sentenceBreakdown.length;
                var rows = [ [], [], [] ];
                var wordsPerRow = Math.round(totalBlocks/3); //excluding spacing
                rows[0] = sentenceBreakdown.slice(0, wordsPerRow);
                rows[1] = sentenceBreakdown.slice(wordsPerRow, wordsPerRow*2);
                rows[2] = sentenceBreakdown.slice(wordsPerRow*2);
                //ensure 3 rows: row's height: 25%, 25%, 50%
                var _blockTpl = (function() {/*!
                    <div class="block"></div>
                */}).toString().match(reCommentContents)[1];
                var _spaceBlock = (function(rowIndex, rowHeight, initialFontSize, wordIndex) {
                    var colorClass = (function() {
                        return ( wordIndex%2 == 0
                            ? ( rowIndex%2 == 0 ? 'color-style-01' : 'color-style-02' )
                            : ( rowIndex%2 == 0 ? 'color-style-02' : 'color-style-01' )
                        )
                    })();
                    return $(_blockTpl)
                        .addClass('block-space')
                        .addClass(colorClass)
                        .html('&nbsp;')
                        .css({
                            height: rowHeight
                        });
                });
                $.each(rows, function(rowIndex, words) {
                    var rowHeight = $rows.eq(rowIndex).height();
                    var initialFontSize = Math.floor(rowHeight);
                    //generate word block and space block
                    $.each(words, function(wordIndex, word) {
                        //create word block
                        var _block = $(_blockTpl)
                            .html('<span>' + (function() {
                                return word == '{keyword}'
                                    ? '<em class="scene-03__keyword ' + (isKeywordHidden ? '' : 'visible') + '">' + sentence.keyword + '</em>'
                                    : word;
                            })() + '</span>')
                            .addClass('color-style-03')
                            .css({
                                height: rowHeight,
                                fontSize: rowHeight,
                                lineHeight: rowHeight + 'px'
                            });
                        $rows.eq(rowIndex).append( _block );

                        //create spacing
                        if ( wordIndex < words.length - 1
                            || ( words.length == 1 && rowIndex < 2 )
                        ) {
                            $rows.eq(rowIndex).append( _spaceBlock(rowIndex, rowHeight, initialFontSize, wordIndex) );
                        }
                        if ( rowIndex == 1 && words.length == 1 ) {
                            $rows.eq(rowIndex).prepend( _spaceBlock(rowIndex, rowHeight, initialFontSize, wordIndex) );
                        }
                    });

                    //ajust width/height, font-size
                    var w = 0;
                    var rowBlocks = $rows.eq(rowIndex).find('.block');
                    var rowBlockWords = $rows.eq(rowIndex).find('.block').filter(':not(.block-space)');
                    var rowBlockSpaces = $rows.eq(rowIndex).find('.block-space');
                    rowBlockWords.each(function() {
                        var $this = $(this);
                        var outerW = Math.floor( $(this).outerWidth(true) );
                        $this.outerWidth( outerW, true );
                        w += outerW;
                    });
                    //set space width
                    var spaceWidth = Math.floor( ( stageWidth - w)/rowBlockSpaces.length );
                    if ( spaceWidth < stageWidth*0.1 ) { //set space = 10%
                        var reduceBlockWordWidth = Math.ceil( (rowBlockSpaces.length*stageWidth*0.1)/rowBlockWords.length );
                        if ( w > stageWidth ) {
                            reduceBlockWordWidth += Math.ceil( (w - stageWidth)/rowBlockWords.length );
                        }
                        var _w = 0;
                        rowBlockWords.each(function() {
                            var $this = $(this);
                            var outerW = Math.floor($this.outerWidth(true) - reduceBlockWordWidth);
                            $this.outerWidth( outerW, true );
                            _w += outerW;
                            var innerW = $this.width();
                            var p = $this.find('span').eq(0);
                            var _fs = initialFontSize;
                            while( p.width() > innerW ) {
                                $this.css({
                                    fontSize: (--_fs) + 'px'
                                });
                            }
                        });
                        spaceWidth = Math.floor( ( stageWidth - _w)/rowBlockSpaces.length );
                    }
                    rowBlockSpaces.css({ width: spaceWidth + 'px' });

                    //exceptional for last row, 1 word block only
                    if ( rowBlocks.length == 1 && rowIndex == 2 ) {
                        rowBlocks.outerWidth( stageWidth, true );
                    }
                });

                //display keyword of the sentence
                if ( isKeywordHidden ) {
                    setTimeout(function() {
                        isKeywordHidden = false;
                        $('.scene-03__keyword').css({ visibility: 'visible' });
                    }, 750);
                }
            }, 250 );
            $(window).on( 'resize', _preparingContent );
            _preparingContent();

            setTimeout(function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart2' );
            }, 2000);
        } );

        /*
         * scene 03 - part 2
         * - load pre-defined sentence "Mesage in the music"
         * - delay for 3s before go to part 3
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart2', function() {
            sound.stop();
            sound = MFC.Video.soundManager.createInstance( 'scene03_sound01' );
            sound.play();

            stage.html(_templatePart02);

            var wordBlockWrapper = $('#scene-03__word-block-wrapper');
            var _preparingContent = Helpers.throttle( function() { //need responsively update
                var wordBlockWrapperHeight = wordBlockWrapper.height();
                $('#scene-03__word-block-wrapper .word-block').css({
                    height: wordBlockWrapperHeight,
                    fontSize: wordBlockWrapperHeight/2 + 'px',
                    lineHeight: wordBlockWrapperHeight + 'px'
                });
            }, 250);
            $(window).on( 'resize', _preparingContent );
            _preparingContent();

            setTimeout(function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart3' );
            }, 2000);
        });

        /*
         * scene 03 - part 3
         * - display the ending scene
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart3', function() {
            sound.stop();
            sound = MFC.Video.soundManager.createInstance( 'scene03_sound01' );
            sound.play();

            stage.html(_templatePart03);

            var banner = $('#scene-03__mfc-banner-01');
            var bigDay = $('#scene-03__mfc-big-day');
            var copyright = $('#scene-03__mfc-copyright');
            var _preparingContent = Helpers.throttle( function() { //need responsively update

                var bannerHeight = banner.height();
                banner.css({
                    fontSize: bannerHeight*.6 + 'px',
                    lineHeight: bannerHeight + 'px'
                });

                var bigDayHeight = bigDay.height();
                bigDay.css({
                    fontSize: bigDayHeight*.7 + 'px',
                    lineHeight: bigDayHeight + 'px'
                });

                var copyrightHeight = copyright.height();
                copyright.css({
                    fontSize: copyrightHeight*.75 + 'px',
                    lineHeight: copyrightHeight + 'px'
                });
            }, 250);
            $(window).on( 'resize', _preparingContent );
            _preparingContent();
        });

        //do something before start scene 03
        //...
        MFC.Video.pub( 'MFC.Video.scene03:startPart1' );
    };
})(jQuery);