'use strict';

(function($) {
    $(document).ready(function() {
        MFC.Video.init( $('#mfc-video'), 'config.json', {
            debug: false
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
        canPause: false //pause is not well-tested so, please do not turn on
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
    TweenLite.defaultEase = Quad.easeOut;
    MFC.Video.init = function($video, $configUrl, opts) {
        MFC.Video.player = $video;

        //common vars
            var playPauseReplayBtn = MFC.Video.controls.playPauseReplayBtn = $('#mfc-play-pause-replay').removeClass('hidden');
            var stopBtn = MFC.Video.controls.stopBtn = $('#mfc-stop');
            var volumeBtn = MFC.Video.controls.volumeBtn = $('#mfc-volume').removeClass('hidden');
            var $body = $('body');
            //extend playPauseReplayBtn methods
            $.extend( true, playPauseReplayBtn, {
                setStatus: function(status) {
                    switch ( status ) {
                        case 'playing':
                        case 'resume':
                            playPauseReplayBtn
                                // .text('Pause')
                                .attr('data-play', 1)
                                .attr('data-pause', 0)
                                .addClass('playing')
                            break;
                        case 'pause':
                            playPauseReplayBtn
                                // .text('Resume')
                                .attr('data-pause', 1)
                            break;
                        case 'stop':
                        case 'replay':
                            playPauseReplayBtn
                                // .text('Play')
                                .attr('data-play', 0)
                                .attr('data-pause', 0)
                                .attr('data-replay', 1)
                                .removeClass('playing')
                        case 'replay':
                            playPauseReplayBtn
                                // .text('Replay')
                            break;
                    }
                }
            });

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
                MFC.Video.timeline = new TimelineLite();
                $body.attr('data-state', 'playing');
                MFC.Video.playScene01();
            });
            MFC.Video.sub( 'MFC.Video:end', function() {
                MFC.Video.stop();
                playPauseReplayBtn.setStatus('replay');
            } );
            MFC.Video.sub( 'MFC.Video:stop', MFC.Video.stop );

        /*
         * 1- load 'config' -> publish 'MFC.Video.config:ready'
         * 2- preparing assets: images, sounds => preloading (show loading during this step) -> publish 'MFC.Video:ready'
         * 3- start playing video -> publish 'MFC.Video:init'
         */

        //1- load config
            //create loading progress
            var loadingProgress = $('#mfc-loading-progress');
            var loadingProgressText = loadingProgress.find('> span').eq(0);
            var loadingProgressHeight;
            var _setLoadingProgressFont = Helpers.throttle(function() {
                loadingProgressHeight = loadingProgress.height();
                loadingProgress.css({
                    fontSize: loadingProgressHeight*.08 + 'px',
                    lineHeight: loadingProgressHeight + 'px'
                });
            }, 250);
            $(window).on( 'resize', _setLoadingProgressFont );
            //end. create loading progress

            //get config
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
                //press spacebar to play|pause
                $(document).on('keyup', function(e) {
                    if ( e.keyCode == 32 ) {
                        playPauseReplayBtn.trigger('click');
                    }
                });
                playPauseReplayBtn.on('click touch', function(e) {
                    $video.removeClass('mfc-video__waiting');

                    //Start play: update <body> status
                    if ( playPauseReplayBtn.attr('data-play') == 0 ) {
                        if ( $body.attr('data-state').indexOf('replay') > 0 ) {
                            _log('Replay video...');
                            MFC.Video.pub( 'MFC.Video:init' );
                        }
                        else {
                            _log('Start loading video assets...');
                            $body.attr('data-state', 'loading');
                            MFC.Video.pub( 'MFC.Video:startLoading' );
                        }
                        //set buttons status
                        playPauseReplayBtn.setStatus('playing');
                        stopBtn.removeClass('hidden');
                    }
                    else {
                        if ( MFC.Video.config.canPause ) {
                            //Playing -> Pause
                            if ( playPauseReplayBtn.attr('data-pause') == 0 ) {
                                playPauseReplayBtn.setStatus('pause');
                                MFC.Video.timeline.pause();
                                MFC.Video.soundManager.currentPlaying.paused = true;
                            }
                            //Pause -> Resume
                            else {
                                playPauseReplayBtn.setStatus('resume');
                                MFC.Video.timeline.resume();
                                MFC.Video.soundManager.currentPlaying.paused = false;
                            }
                        }
                    }

                    return false;
                });
                stopBtn.on('click touch', function(e) {
                    _log('Stop');
                    MFC.Video.pub( 'MFC.Video:stop' );

                    return false;
                });
                volumeBtn.on('click touch', function(e) {
                    var $this = $(this);
                    $this.toggleClass('muted');
                    MFC.Video.soundManager.currentPlaying.muted = MFC.Video.soundManager.muted = $this.hasClass('muted') ? true : false;

                    return false;
                });
            } );
            MFC.Video.sub( 'MFC.Video:startLoading', function() {
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
                loadingProgress.animate(
                    {
                        opacity: 0
                    }, 800, function() {
                            loadingProgress.remove();
                            $video.removeClass('mfc-video__loading');
                            MFC.Video.pub( 'MFC.Video:init' );
                    }
                );
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
            MFC.Video.unsub( 'MFC.Video.scene02:initMessageLoop' );
            MFC.Video.unsub( 'MFC.Video.scene02:completed' );
            //part 3
            MFC.Video.unsub( 'MFC.Video.scene03:startPart1' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart2' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart3' );

        //2- stop all animation
            MFC.Video.timeline.kill();

        //3- clear all generated HTML
            MFC.Video.player.find('.stage').empty();

        //4- stop all sounds, note: stop but not remove sound registers
            MFC.Video.soundManager.stop();

        //5- update <body> state
            $('body').attr('data-state', 'stop replay');
            MFC.Video.player.addClass('mfc-video__waiting');

        //6- update buttons state & display
            MFC.Video.controls.playPauseReplayBtn.setStatus('stop');
            MFC.Video.controls.stopBtn.addClass('hidden');
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
        var sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance('scene01_sound01');

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
            sound.muted = MFC.Video.soundManager.muted;
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

            var t1 = 3;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                TweenLite.to( animBlock02, t1, {
                    width: '3%',
                    onComplete: function() {
                        d1.resolve();
                    }
                } ),
                TweenLite.to( scaleBlock01, t1, {
                    width: '100%',
                    right: 0,
                    onComplete: function() {
                        d2.resolve();
                    }
                } ),
                TweenLite.to( animBlock01, t1, {
                    height: '48%',
                    onComplete: function() {
                        d3.resolve();
                    }
                } ),
                TweenLite.to( imgPlaceHolder02, t1/3, {
                    top: 0,
                    delay: t1/2,
                    onComplete: function() {
                        d4.resolve();
                    }
                } )
            ] );
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
            var t1 = 0.8;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                TweenLite.to( animBlock02, t1, {
                    width: '20%',
                    onComplete: function() {
                        d1.resolve();
                    }
                } ),
                TweenLite.to( scaleBlock01Wrapper, t1, {
                    width: '22%',
                    onComplete: function() {
                        d2.resolve();
                    }
                } ),
                TweenLite.to( imgPlaceHolder01, t1, {
                    left: '-100%',
                    onComplete: function() {
                        imgPlaceHolder01.remove();
                        d3.resolve();
                    }
                } ),
                TweenLite.to( animBlock01, t1/2, {
                    right: '-100%',
                    onComplete: function() {
                        animBlock01.remove();
                        d4.resolve();
                    }
                } )
            ] );
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

            var t1 = 0.8;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                // d1: 2 blocks move left and hide to bottom
                TweenLite.to( animBlock02, t1, {
                    width: '5%',
                    bottom: '-100%',
                    onComplete: function() {
                        animBlock02.remove();
                        d1.resolve();
                    }
                } ),
                // d2: hidden block grown-up
                TweenLite.to( scaleBlock01Wrapper, t1, {
                    width: '40%',
                    height: '83%'
                } ),
                //d3
                TweenLite.to( imgPlaceHolder02, t1/3, {
                    left: '100%',
                    delay: t1*3/4,
                    onComplete: function() {
                        imgPlaceHolder02.remove();
                        d3.resolve();
                    }
                } ),
                //d4
                TweenLite.to( imgPlaceHolder03, t1/3, {
                    right: '-100%',
                    delay: t1*3/4,
                    onComplete: function() {
                        imgPlaceHolder03.remove();
                        d4.resolve();
                    }
                } ),
                //d5
                TweenLite.to( staticBlock01, t1/2, {
                    height: 0,
                    delay: t1/4,
                    onComplete: function() {
                        staticBlock01.remove();
                        d5.resolve();
                    }
                } )
            ] );
            timeline.add( [
                //d2: hidden block grown-up, scale 100% width
                TweenLite.to( scaleBlock01Wrapper, t1/2, {
                    width: '100%',
                    onStart: function() {
                        scaleBlock01Wrapper.css({
                            right: 'auto',
                            left: scaleBlock01Wrapper.position().left
                        });
                    }
                } ),
                //d2: hidden block change position alignment and grow up
                TweenLite.to( scaleBlock01Wrapper, t1/2, {
                    // hidden block scale full-width, align top
                    left: 0,
                    top: 0,
                    delay: t1/3,
                    onStart: function() {
                        scaleBlock01Wrapper.css({
                            bottom: 'auto',
                            top: scaleBlock01Wrapper.position().top
                        });
                    },
                    onComplete: function() {
                        //init kaleidoscope
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
                } )
            ] );
            $.when( d2 ).done(function(v2) {
                timeline.add( [
                    TweenLite.to( animBlock03, t1, {
                        width: '100%',
                        delay: 0.5,
                        onComplete: function() {
                            d6.resolve();
                        }
                    } )
                ] );
            });
            $.when( d2, d6 ).done(function() { //goes off hidden
                var _delay = 1;
                timeline.add( [
                    TweenLite.to( scaleBlock01Wrapper, t1/3, {
                        left: '100%',
                        delay: _delay,
                        onComplete: function() {
                            d7.resolve();
                        }
                    } ),
                    TweenLite.to( animBlock03, t1/3, {
                        left: '-100%',
                        delay: _delay,
                        onComplete: function() {
                            d8.resolve();
                        }
                    } )
                ] );
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

        var i = 0;
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
        var _updateMessage = function(message) {
            //get/play sound
            if ( sound !== undefined ) {
                sound.stop();
            }
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( message.themeSound );
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            //set theme color/img
            kaleidoscopeApi.updateImg(
                kaleidoscope,
                MFC.Video.imageManager.get( message.themeBgKaleidoscope ),
                message.themeBgKaleidoscopeColor
            );
            //load new text to kaleidoscope
            kaleidoscopeText.text( message.text );
            _ajustKaleidoscopeFont();

            //set theme color
            animBlock01.add(animBlock02).css({
                backgroundColor: message.themeBgColor
            });
            imgPlaceHolder01.css({
                backgroundImage: 'url(' + MFC.Video.imageManager.get( message.themeBgImg ) + ')'
            });
        }
        MFC.Video.sub( 'MFC.Video.scene02:start', function() {
            //sentence at bottom
            kaleidoscopeSentence
                .empty()
                .css({
                    fontSize: parseInt(kaleidoscopeSentenceHeight)*.9 + 'px',
                    lineHeight: kaleidoscopeSentenceHeight + 'px'
                });

            var d1 = $.Deferred(); //block contains kaleidoscope
            var d2 = $.Deferred(); //block contains img on the right
            var d3 = $.Deferred(); //block at the bottom
            $.when( d1, d2, d3 ).done(function(v1, v2, v3) {
                //no thing
            });

            var t1 = 0.5;
            var timeline = MFC.Video.timeline;
            //update 1st message theme
            timeline.add(
                (function() {
                    i++;
                    //init kaleidoscope
                    kaleidoscopeApi = kaleidoscope.mfcKaleidos({
                        delay: 200,
                        duration: 400
                    });
                    _updateMessage( arrTxt[0] );
                })
            );
            timeline.add( [
                //block contains kaleidoscope move right full-width
                TweenLite.to( animBlock01, t1, {
                    left: 0,
                    onComplete: function() {
                        d1.resolve();
                    }
                } ),
                //block at the bottom move left full-width
                TweenLite.to( animBlock02, t1, {
                    width: '100%',
                    onComplete: function() {
                        d3.resolve();
                    }
                } )
            ] );
            //block contains img move left
            timeline.add(
                TweenLite.to( imgPlaceHolder01Wrapper, t1/2, {
                    right: 0,
                    delay: 0.2,
                    ease: Sine.easeIn,
                    onComplete: function() {
                        d2.resolve();
                    }
                } )
            );
            MFC.Video.pub( 'MFC.Video.scene02:initMessageLoop' );
        } );

        MFC.Video.sub( 'MFC.Video.scene02:initMessageLoop', function() {
            var t2 = 3;
            var d1 = $.Deferred();
            $.when( d1 ).done(function(v1) {
                sound.stop();
                stage.empty();
                MFC.Video.pub( 'MFC.Video.scene02:completed' );
            });

            var loopMessageTween = [];
            $.each(arrTxt, function(index, message) {
                if ( index == 0 ) { return true; } //continue
                loopMessageTween.push(
                    (function() {
                        if ( i < arrTxt.length - 1 ) { i++; }
                        kaleidoscopeSentence.append( arrTxt[index-1].text );
                        _updateMessage(message);
                    })
                );
            });
            var timeline = MFC.Video.timeline;
            //loop message
            timeline.add( loopMessageTween, '+=' + t2, 'sequence', t2 );
            //last word
            timeline.add(
                (function() {
                    kaleidoscopeSentence.append( arrTxt[arrTxt.length-1].text );
                    d1.resolve();
                }),
                '+=' + t2
            );
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
        var sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound01' );
        var sentence = MFC.Video.config.sentence;

        //do something before start scene 03
        //...
        var t = 2;
        var timeline = MFC.Video.timeline;
        var a;
        timeline.add(
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart1' );
            })
        );
        // display keyword of the sentence
        var isKeywordHidden = true;
        timeline.add(
            (function() {
                isKeywordHidden = false;
                $('.scene-03__keyword').css({ visibility: 'visible' });
            }),
            '+=' + 0.75
        );
        timeline.add( [
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart2' );
            }),
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart3' );
            })
        ], '+=' + t, 'sequence', t);
        //the end...
        timeline.add(
            (function() {
                if ( sound.position == sound.duration ) {
                    MFC.Video.pub( 'MFC.Video:end' );
                }
                else {
                    sound.addEventListener('complete', function() {
                        MFC.Video.pub( 'MFC.Video:end' );
                    });
                }
            }),
            '+=' + t
        );

        /*
         * scene 03 - part 1
         * - load pre-defined sentence into block words & spaces
         * - delay for 3s before go to part 2
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart1', function() {
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            var $rows = $('.sentence-row');
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
            }, 250 );
            $(window).on( 'resize', _preparingContent );
            _preparingContent();
        } );

        /*
         * scene 03 - part 2
         * - load pre-defined sentence "Mesage in the music"
         * - delay for 3s before go to part 3
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart2', function() {
            sound.stop();
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound02' );
            sound.muted = MFC.Video.soundManager.muted;
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
        });

        /*
         * scene 03 - part 3
         * - display the ending scene
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart3', function() {
            sound.stop();
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound03' );
            sound.muted = MFC.Video.soundManager.muted;
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
    };
})(jQuery);