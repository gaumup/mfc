'use strict';

(function($) {
    var queryString = window.location.search;
    queryString = queryString.substring( queryString.indexOf('?')+1 );
    var configUrl = queryString.split('=')[1];

    $(document).ready(function() {
        MFC.Video.init( $('#mfc-video'), configUrl, {
            debug: false
        } );
    });

    //MFC namespace
    var ns = 'MFC_';
    var Pattern = window[ns + 'Pattern'];
    var Helpers = window[ns + 'Helpers'];
    var Themes = {
        love: 'mfc-video__content--theme-01',
        fun: 'mfc-video__content--theme-02',
        idol: 'mfc-video__content--theme-03',
        success: 'mfc-video__content--theme-04'
    }
    // start matching after: comment start block => ! or @preserve => optional whitespace => newline
    // stop matching before: last newline => optional whitespace => comment end block
    var reCommentContents = /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//;

    //MFC Video class
    var MFC = {};
    MFC.Video = {};
    MFC.Video.config = {
        allowFullscreen: false,
        canPause: false, //90% tested work stability on Chrome, FF, Safari, IE9+
        showProgress: false //not-well tested and design, should not go on production
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
        MFC.Video.player = $video.removeClass('hidden');

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
                $video.css({width: '100%'});
                //video size
                var windowHeight = Math.round( $(window).height() );
                var videoHeight = Math.round( $video.width()/2 );
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
                if ( MFC.Video.config.showProgress ) {
                    $('#mfc-video-progress-wrapper').removeClass('hidden');
                }
                $video.css({
                    backgroundImage: 'none'
                });
                $body.attr('data-state', 'playing');
                MFC.Video.timeline.play();
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
                    MFC.Video.pub( 'MFC.Video.config:error' );
                })
                .always(function() {});

        //2- bind buttons events & preparing assets: images and sounds
            MFC.Video.sub( 'MFC.Video.config:ready', function() {
                $video.addClass( Themes[ MFC.Video.config.theme ] ).css({
                    backgroundImage: 'url(' + MFC.Video.config.frontCover + ')'
                });

                //press spacebar to play|pause
                $(document).on('keyup', function(e) {
                    if ( e.keyCode == 32 ) {
                        playPauseReplayBtn.trigger('click');
                    }
                });
                playPauseReplayBtn.on('click touch', function(e) {
                    $video.removeClass('mfc-video__waiting');

                    //request fullscreen
                    if ( MFC.Video.config.allowFullscreen && !Helpers.isFullscreen() ) {
                        Helpers.setFullscreen( $video.get(0) );
                    }

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
                                if ( MFC.Video.timeline !== undefined ) {
                                    MFC.Video.timeline.pause();
                                }
                                //pause the kaleidoscope
                                var kaleidoscope = $('.kaleidoscope').data('mfcKaleidos');
                                if ( kaleidoscope !== undefined  ) {
                                    kaleidoscope.pause();
                                }
                                if ( MFC.Video.soundManager.currentPlaying !== undefined ) {
                                    MFC.Video.soundManager.currentPlaying.paused = true;
                                }
                            }
                            //Pause -> Resume
                            else {
                                playPauseReplayBtn.setStatus('resume');
                                if ( MFC.Video.timeline !== undefined ) {
                                    MFC.Video.timeline.resume();
                                }
                                //resume the kaleidoscope
                                var kaleidoscope = $('.kaleidoscope').data('mfcKaleidos');
                                if ( kaleidoscope !== undefined  ) {
                                    kaleidoscope.resume();
                                }
                                if ( MFC.Video.soundManager.currentPlaying !== undefined ) {
                                    MFC.Video.soundManager.currentPlaying.paused = false;
                                }
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
                    MFC.Video.soundManager.muted = $this.hasClass('muted') ? true : false;
                    if ( MFC.Video.soundManager.currentPlaying !== undefined ) {
                        MFC.Video.soundManager.currentPlaying.muted = MFC.Video.soundManager.muted;
                    }
                    return false;
                });
            } );
            MFC.Video.sub( 'MFC.Video:startLoading', function() {
                $video.css({
                    backgroundImage: 'none'
                });

                loadingProgress.removeClass('hidden');
                _setLoadingProgressFont();

                var overallProgress = 0;
                var _setLoadingProgress = function() {
                    loadingProgressText.text( Math.round( (++overallProgress/totalAssets)*100 ) );
                }

                //preparing assets: images + sounds & layouts
                var assetsPath = MFC.Video.config.assetsPath;
                var isAllImagesLoaded = false;
                var isAllSoundLoaded = false;
                var isLayoutReady = false;
                var totalAssets = MFC.Video.config.images.total + MFC.Video.config.sound.total;
                MFC.Video.sub( 'MFC.Video.assets:load', function() {
                    if ( isAllImagesLoaded && isAllSoundLoaded && isLayoutReady ) {
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

                    //ignore image failed, pub 'load'
                    MFC.Video.pub( 'MFC.Video.image:load' );
                } );
                // load images
                $.each(MFC.Video.config.images.files, function(key, images) {
                    $.each(images, function(_subkey, _image) {
                        var _imgPath = assetsPath.images + '/' + _image;
                        var _img = new Image();
                        _img.onload = function() {
                            MFC.Video.pub( 'MFC.Video.image:load', _image );
                        }
                        _img.onerror = function() {
                            MFC.Video.pub( 'MFC.Video.image:fail', _image );
                        }
                        _img.src = _imgPath;
                        MFC.Video.imageManager.set( key + '_' + _subkey, _imgPath );
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

                    //ignore sound failed, pub 'load'
                    MFC.Video.pub( 'MFC.Video.sound:load' );
                } );
                //SoundJS
                createjs.Sound.addEventListener('fileload', function(e) {
                    MFC.Video.pub( 'MFC.Video.sound:load', e.id, e.src );
                });
                createjs.Sound.addEventListener('fileerror', function(e) {
                    MFC.Video.pub( 'MFC.Video.sound:fail', e.id, e.src );
                });
                $.each(MFC.Video.config.sound.files, function(key, sounds) {
                    $.each(sounds, function(_subkey, _sound) {
                        var _soundPath = assetsPath.sound + '/' + _sound;
                        _log('Loading: "' + (key + '_' + _subkey) + '": ' + _soundPath);
                        createjs.Sound.registerSound( _soundPath, (key + '_' + _subkey) );
                    });
                });

                //prepare layouts
                MFC.Video.sub( 'MFC.Video.layout:ready', function() {
                    isLayoutReady = true;
                });
                MFC.Video.prepareLayout();
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

        //handling error
            MFC.Video.sub( 'MFC.Video.config:error', function() {
                $video.addClass('mfc-video__error');
                $('<p class="mfc-video-error-text">Sorry, this video is no longer exists!</p>')
                    .appendTo($video)
                    .css({
                        fontSize: $video.height()*.03 + 'px',
                        lineHeight: $video.height() + 'px'
                    })
            } );
    };
    MFC.Video.stop = function() {
        if ( MFC.Video.timeline === undefined ) { return false; }
        try {
        //1- set progress = zero
            $('#mfc-video-progress').css({
                width: 0
            });

        //2- clear all subscribes
            //scene 1
            MFC.Video.unsub( 'MFC.Video.scene01:preparePart01' );
            MFC.Video.unsub( 'MFC.Video.scene01:preparePart02' );
            MFC.Video.unsub( 'MFC.Video.scene01:preparePart03' );
            MFC.Video.unsub( 'MFC.Video.scene01:prepareLayout' );
            MFC.Video.unsub( 'MFC.Video.scene01:end' );
            MFC.Video.unsub( 'MFC.Video.scene01:completed' );
            //scene 2
            MFC.Video.unsub( 'MFC.Video.scene02:prepareLayout' );
            MFC.Video.unsub( 'MFC.Video.scene02:preparePart01' );
            MFC.Video.unsub( 'MFC.Video.scene02:preparePart02' );
            MFC.Video.unsub( 'MFC.Video.scene02:end' );
            MFC.Video.unsub( 'MFC.Video.scene02:completed' );
            //scene 3
            MFC.Video.unsub( 'MFC.Video.scene03:startPart01' );
            MFC.Video.unsub( 'MFC.Video.scene03:preparePart01' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart02' );
            MFC.Video.unsub( 'MFC.Video.scene03:preparePart02' );
            MFC.Video.unsub( 'MFC.Video.scene03:startPart03' );
            MFC.Video.unsub( 'MFC.Video.scene03:preparePart03' );
            MFC.Video.unsub( 'MFC.Video.scene03:prepareLayout' );
            MFC.Video.unsub( 'MFC.Video.scene03:end' );
            MFC.Video.unsub( 'MFC.Video.scene03:completed' );

        //3- stop all animation, return timeline position to zero
            MFC.Video.timeline.clear(true);
            MFC.Video.timeline = undefined;

        //4- empties all generated contents
            MFC.Video.player.find('.stage').empty().addClass('invisible');

        //5- stop all sounds, note: stop but not remove sound registers
            MFC.Video.soundManager.stop();

        //6- update <body> state
            $('body').attr('data-state', 'stop replay');
            MFC.Video.player.addClass('mfc-video__waiting');

        //7- update buttons state & display
            MFC.Video.controls.playPauseReplayBtn.setStatus('stop');
            MFC.Video.controls.stopBtn.addClass('hidden');

        //8- update cover
            MFC.Video.player.addClass( Themes[ MFC.Video.config.theme ] ).css({
                backgroundImage: 'url(' + MFC.Video.config.frontCover + ')'
            });

        //9- ... finally, preparing content for replay
            MFC.Video.prepareLayout();
        } catch(ex) {}
    }
    MFC.Video.prepareLayout = function() {
        MFC.Video.timeline = new TimelineLite({
            paused: true,
            onUpdate: function() {
                $('#mfc-video-progress').css({
                    width: MFC.Video.timeline.progress().toFixed(2)*100 + '%'
                })
            }
        });

        MFC.Video.prepareScene01();
        MFC.Video.prepareScene02();
        MFC.Video.prepareScene03();

        MFC.Video.pub( 'MFC.Video.layout:ready' );
    }
    MFC.Video.prepareScene01 = function() {
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
        var sound;
        var isStarted = false;

        //blocks
        var imgPlaceHolder01 = $('#scene-01__img-placeholder-01');
        var imgPlaceHolder02 = $('#scene-01__img-placeholder-02');
        var imgPlaceHolder03 = $('#scene-01__img-placeholder-03');
        var animBlock01 = $('#scene-01__anim-block-01');
        var animBlock02Wrapper = $('#scene-01__anim-block-02');
        var animBlock02 = $('#scene-01__anim-block-02 > .block__inner');
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
        MFC.Video.sub( 'MFC.Video.scene01:preparePart01', function() {
            //set cover image to img placeholder block
            imgPlaceHolder01
                .css({
                    backgroundImage: 'url(' + MFC.Video.imageManager.get( MFC.Video.config.cover.image ) + ')'
                });
            imgPlaceHolder02.add(imgPlaceHolder03)
                .css({
                    backgroundImage: 'url(' + MFC.Video.imageManager.get( MFC.Video.config.cover.image ) + ')'
                });

            var t1 = 3;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                'scene-01', //label for scene 1
                (function() { //start play scene 1
                    isStarted = true;
                    stage.removeClass('invisible');
                    sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance('scene01_sound01');
                    sound.muted = MFC.Video.soundManager.muted;
                    sound.play();
                })
            ] );
            //animations
            timeline.add( [
                TweenLite.to( animBlock02, t1, {
                    xPercent: -95
                } ),
                TweenLite.to( scaleBlock01, t1, {
                    xPercent: -95
                } ),
                TweenLite.to( animBlock01, t1, {
                    yPercent: 100
                } ),
                TweenLite.to( imgPlaceHolder02, t1/3, {
                    yPercent: 105,
                    delay: t1/2
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
        MFC.Video.sub( 'MFC.Video.scene01:preparePart02', function() {
            var t1 = 0.8;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                TweenLite.to( animBlock02, t1, {
                    xPercent: -55
                } ),
                TweenLite.to( scaleBlock01, t1, {
                    xPercent: -55
                } ),
                TweenLite.to( imgPlaceHolder01, t1, {
                    xPercent: -100,
                    onComplete: function() {
                        imgPlaceHolder01.remove();
                    }
                } ),
                TweenLite.to( animBlock01, t1/2, {
                    xPercent: 100,
                    onComplete: function() {
                        animBlock01.remove();
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
        MFC.Video.sub( 'MFC.Video.scene01:preparePart03', function() {
            var t1 = 0.8;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                //d1: 2 blocks move left and hide to bottom
                TweenLite.to( animBlock02, t1/2, {
                    xPercent: -80,
                    yPercent: 300,
                    ease: Linear.easeNone,
                    onComplete: function() {
                        animBlock02.remove();
                    }
                } ),
                //d2: hidden block grown-up
                TweenLite.to( scaleBlock01Wrapper, t1/2, {
                    height: '83%',
                    ease: Linear.easeNone
                } ),
                TweenLite.to( scaleBlock01, t1/2, {
                    xPercent: -80,
                    ease: Linear.easeNone
                } ),
                //d2: hidden block grown-up, scale 100% width
                TweenLite.to( scaleBlock01Wrapper, t1/2, {
                    width: '100%',
                    yPercent: -17,
                    delay: t1/2,
                    ease: Linear.easeNone
                } ),
                'scene-01-kaleidoscope', //label: 'scene-01-kaleidoscope'
                TweenLite.to( scaleBlock01, t1/2, {
                    xPercent: -47.3, //TODO: optimizing
                    delay: t1/2,
                    ease: Linear.easeNone,
                    onComplete: function() {
                        //init kaleidoscope
                        var kaleidoscope = $('#scene-01__kaleidoscope');
                        kaleidoscope
                            .hide()
                            .mfcKaleidos({
                                delay: 50,
                                duration: 500
                            })
                            .data('mfcKaleidos').play(
                                MFC.Video.imageManager.get( MFC.Video.config.cover.image )
                            )
                            .fadeIn();
                    }
                } ),
                //d3
                TweenLite.to( imgPlaceHolder02, t1/3, {
                    xPercent: 150,
                    delay: t1/3,
                    ease: Linear.easeNone,
                    onComplete: function() {
                        imgPlaceHolder02.remove();
                    }
                } ),
                //d4
                TweenLite.to( imgPlaceHolder03, t1/3, {
                    xPercent: 350,
                    delay: t1/3,
                    ease: Linear.easeNone,
                    onComplete: function() {
                        imgPlaceHolder03.remove();
                    }
                } ),
                //d5
                TweenLite.to( staticBlock01, t1/3, {
                    yPercent: 100,
                    delay: t1/4,
                    onComplete: function() {
                        staticBlock01.remove();
                    }
                } )
            ] );
            timeline.add( [
                TweenLite.to( animBlock03, t1, {
                    xPercent: -100,
                    delay: 0.5
                } ),
                'scene-01-kaleidoscope+=' + t1/2
            ] );
            var _delay = 1.5;
            timeline.add( [
                TweenLite.to( scaleBlock01Wrapper, t1/3, {
                    xPercent: 100,
                    delay: _delay
                } ),
                TweenLite.to( animBlock03, t1/3, {
                    xPercent: -200,
                    delay: _delay
                } )
            ] );
            //end of scene 01
            timeline.add(
                (function() {
                    MFC.Video.pub( 'MFC.Video.scene01:end' );
                })
            );
        } );

        MFC.Video.sub( 'MFC.Video.scene01:prepareLayout', function() {
            MFC.Video.pub( 'MFC.Video.scene01:preparePart01' );
            MFC.Video.pub( 'MFC.Video.scene01:preparePart02' );
            MFC.Video.pub( 'MFC.Video.scene01:preparePart03' );
        });

        //end of scene 01
        MFC.Video.sub( 'MFC.Video.scene01:end', function() {
            if ( isStarted ) {
                sound.stop();
                stage.empty().addClass('invisible');
                MFC.Video.pub( 'MFC.Video.scene01:completed' );
            }
        });

        //do something before start scene 01
        //...
        MFC.Video.pub( 'MFC.Video.scene01:prepareLayout' );
    };
    MFC.Video.prepareScene02 = function() {
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
        var isStarted = false;

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
                fontSize: _height*.9 + 'px',
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
        var _updateMessage = function(message) {
            //get/play sound
            if ( sound !== undefined ) {
                sound.stop();
            }
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( message.themeSound );
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            //set theme color/img
            kaleidoscope.mfcKaleidos.play(
                MFC.Video.imageManager.get( message.themeBgKaleidoscope )
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
        MFC.Video.sub( 'MFC.Video.scene02:preparePart01', function() {
            //sentence at bottom
            kaleidoscopeSentence
                .empty()
                .css({
                    fontSize: parseInt(kaleidoscopeSentenceHeight)*.9 + 'px',
                    lineHeight: kaleidoscopeSentenceHeight + 'px'
                });

            var t1 = 0.5;
            var timeline = MFC.Video.timeline;
            timeline.add( [
                'scene-02', //label for scene 2
                (function() { //start play scene 2
                    isStarted = true;
                    stage.removeClass('invisible');
                })
            ] );
            //update 1st message theme
            timeline.add(
                (function() {
                    i++;
                    //init kaleidoscope
                    kaleidoscope.mfcKaleidos({
                        delay: 50,
                        duration: 500
                    });
                    kaleidoscope.mfcKaleidos = kaleidoscope.data('mfcKaleidos');
                    if ( arrTxt[0].text.trim() !== '' ) {
                        _updateMessage( arrTxt[0] );
                    }
                })
            );
            timeline.add( [
                //block contains kaleidoscope move right full-width
                TweenLite.to( animBlock01, t1, {
                    xPercent: 100
                } ),
                //block at the bottom move left full-width
                TweenLite.to( animBlock02, t1, {
                    xPercent: -100
                } )
            ] );
            //block contains img move left
            timeline.add(
                TweenLite.to( imgPlaceHolder01Wrapper, t1/2, {
                    xPercent: -100,
                    delay: 0.2,
                    ease: Sine.easeIn
                } )
            );
        } );

        //loop message by word
        MFC.Video.sub( 'MFC.Video.scene02:preparePart02', function() {
            var t2 = 3;
            var timeline = MFC.Video.timeline;
            //loop message
            $.each(arrTxt, function(index, message) {
                if ( index == 0 ) { return true; } //continue, ignore 1st letter
                if ( message.text.trim() === '' ) {
                    timeline.add(
                        (function() {
                            if ( i < arrTxt.length - 1 ) { i++; }
                            kaleidoscopeSentence.append( arrTxt[index-1].text );
                        }),
                        '+=' + t2
                    );    
                }
                else {
                    timeline.add(
                        (function() {
                            if ( i < arrTxt.length - 1 ) { i++; }
                            kaleidoscopeSentence.append( arrTxt[index-1].text.trim() === '' ? '&nbsp;' : arrTxt[index-1].text );
                            kaleidoscope.mfcKaleidos.clear();
                            _updateMessage( message );
                        }),
                        '+=' + ( arrTxt[index-1].text.trim() === '' ? 0 : t2 )
                    );
                }
            });
            //last word
            timeline.add(
                (function() {
                    kaleidoscopeSentence.append( arrTxt[arrTxt.length-1].text );
                    MFC.Video.pub( 'MFC.Video.scene02:end' );
                }),
                '+=' + t2
            );
        } );

        MFC.Video.sub( 'MFC.Video.scene02:prepareLayout', function() {
            MFC.Video.pub( 'MFC.Video.scene02:preparePart01' );
            MFC.Video.pub( 'MFC.Video.scene02:preparePart02' );
        });

        //end of scene 02
        MFC.Video.sub( 'MFC.Video.scene02:end', function() {
            if ( isStarted ) {
                sound.stop();
                stage.empty().addClass('invisible');
                MFC.Video.pub( 'MFC.Video.scene02:completed' );
            }
        });

        //do something before start scene 02
        //...
        MFC.Video.pub( 'MFC.Video.scene02:prepareLayout' );
    };
    MFC.Video.prepareScene03 = function() {
        //html template
        var _templatePart01 = (function() {/*!
            <div class="scene-03__part-block scene-03__part-01 invisible" id="scene-03__part-01">
                <div class="sentence-row sentence-row-01"></div>
                <div class="sentence-row sentence-row-02"></div>
                <div class="sentence-row sentence-row-03"></div>
            </div>
        */}).toString().match(reCommentContents)[1];
        var _templatePart02 = (function() {/*!
            <div class="scene-03__part-block scene-03__part-02 invisible" id="scene-03__part-02">
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
            </div>
        */}).toString().match(reCommentContents)[1];
        var _templatePart03 = (function() {/*!
            <div class="scene-03__part-block scene-03__part-03 invisible" id="scene-03__part-03">
                <div class="mfc-banner-01 color-style-01" id="scene-03__mfc-banner-01">Sschh...Schubert!</div>
                <div class="mfc-big-day" id="scene-03__mfc-big-day">13.09.2015</div>
                <div class="mfc-brand">
                    <a class="mfc-logo" href="#" title=""></a>
                    <p class="mfc-copyright" id="scene-03__mfc-copyright">Music for Community</p>
                </div>
            </div>
        */}).toString().match(reCommentContents)[1];
        var stage = $('#scene-03');
        var scene03Part01;
        var scene03Part02;
        var scene03Part03;
        var currentPart;
        var sound;
        var isStarted = false;
        var sentence = MFC.Video.config.sentence;
        //remove , ! . and space more than 1
        sentence.phase = sentence.phase.replace( new RegExp('[,.!]', 'g'), '' ).replace( new RegExp('\\s+', 'g'), ' ' );

        //do something before start scene 03
        //...
        var t = 2;
        var timeline = MFC.Video.timeline;
        timeline.add( [
            'scene-03', //label for scene 3
            (function() { //start play scene 3
                isStarted = true;
                stage.removeClass('invisible');
            })
        ] );
        var a;
        //play part 1
        timeline.add( //part 1 delay more time than 2,3
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart01' );
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
        //play 2, 3 sequentially
        timeline.add( [
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart02' );
            }),
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:startPart03' );
            })
        ], '+=' + (t*1.5), 'sequence', t);
        //the end...
        timeline.add(
            (function() {
                MFC.Video.pub( 'MFC.Video.scene03:end' );
            }),
            '+=' + t
        );

        /*
         * scene 03 - part 1
         * - load pre-defined sentence into block words & spaces
         * - delay for 3s before go to part 2
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart01', function() {
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound01' );
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            currentPart = scene03Part01.removeClass('invisible');
        });
        MFC.Video.sub( 'MFC.Video.scene03:preparePart01', function() {
            stage.html(_templatePart01);

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
                    var rowBlockWordsSortAsc = [];
                    var rowBlockWordsWidthSortAsc = [];
                    rowBlockWords.each(function() {
                        var $this = $(this);
                        var outerW = $(this).outerWidth(true);
                        $this.outerWidth( Math.floor(outerW), true );
                        w += Math.ceil(outerW);
                        if ( rowBlockWordsSortAsc.length == 0
                            || outerW > rowBlockWordsWidthSortAsc[rowBlockWordsSortAsc.length-1]
                        ) {
                            rowBlockWordsSortAsc.push($this);
                            rowBlockWordsWidthSortAsc.push(outerW);
                        }
                        else {
                            rowBlockWordsSortAsc.unshift($this);
                            rowBlockWordsWidthSortAsc.unshift(outerW);
                        }
                    });

                    //set space width
                    var spaceWidth = Math.floor( ( stageWidth - w)/rowBlockSpaces.length );
                    if ( spaceWidth < stageWidth*0.1 ) { //set space = 10%
                        var reduceBlockWordWidth = Math.ceil( (rowBlockSpaces.length*stageWidth*0.1)/rowBlockWords.length );
                        if ( w > stageWidth ) {
                            reduceBlockWordWidth += Math.ceil( (w - stageWidth)/rowBlockWords.length );
                        }
                        var _w = 0;
                        $.each(rowBlockWordsSortAsc, function(index, item) {
                            var $this = $(this);
                            var originW = $(this).outerWidth(true);
                            var outerW = originW - reduceBlockWordWidth;
                            if ( outerW < stageWidth*.1 ) {
                                //set block word min = 10%
                                $this.width(stageWidth*.1);
                                var _newWidth = Math.ceil( $this.outerWidth(true) );
                                _w += _newWidth;

                                //recalculate reduce block word space
                                reduceBlockWordWidth = Math.ceil( (rowBlockSpaces.length*stageWidth*0.1)/(rowBlockWords.length - (index + 1)) );
                                reduceBlockWordWidth += Math.ceil( ( (w - originW) - (stageWidth - _newWidth) )/(rowBlockWords.length - (index + 1)) );
                            }
                            else {
                                $this.outerWidth( Math.floor(outerW), true );
                                _w += Math.ceil(outerW);
                            }
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

            scene03Part01 = $('#scene-03__part-01');
        } );

        /*
         * scene 03 - part 2
         * - load pre-defined sentence "Mesage in the music"
         * - delay for 3s before go to part 3
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart02', function() {
            sound.stop();
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound02' );
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            if ( currentPart !== undefined ) {
                currentPart.remove();
            }
            currentPart = scene03Part02.removeClass('invisible');
        });
        MFC.Video.sub( 'MFC.Video.scene03:preparePart02', function() {
            stage.append(_templatePart02);

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

            scene03Part02 = $('#scene-03__part-02');
        });

        /*
         * scene 03 - part 3
         * - display the ending scene
         */
        MFC.Video.sub( 'MFC.Video.scene03:startPart03', function() {
            sound.stop();
            sound = MFC.Video.soundManager.currentPlaying = MFC.Video.soundManager.createInstance( 'scene03_sound03' );
            sound.muted = MFC.Video.soundManager.muted;
            sound.play();

            if ( currentPart !== undefined ) {
                currentPart.remove();
            }
            currentPart = scene03Part03.removeClass('invisible');
        });
        MFC.Video.sub( 'MFC.Video.scene03:preparePart03', function() {
            stage.append(_templatePart03);

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

            scene03Part03 = $('#scene-03__part-03');
        });

        MFC.Video.sub( 'MFC.Video.scene03:prepareLayout', function() {
            MFC.Video.pub( 'MFC.Video.scene03:preparePart01' );
            MFC.Video.pub( 'MFC.Video.scene03:preparePart02' );
            MFC.Video.pub( 'MFC.Video.scene03:preparePart03' );
        });

        //end of scene 03
        MFC.Video.sub( 'MFC.Video.scene03:end', function() {
            var _fn = function() {
                if ( isStarted ) {
                    if ( currentPart !== undefined ) {
                        currentPart.remove();
                        currentPart = undefined;
                    }
                    stage.empty().addClass('invisible');
                    MFC.Video.pub( 'MFC.Video.scene03:completed' );
                    MFC.Video.pub( 'MFC.Video:end' );
                }
            }
            if ( sound.position == sound.duration ) {
                _fn();
            }
            else {
                sound.addEventListener('complete', function() {
                    _fn();
                });
            }
        });

        //do something
        //...
        MFC.Video.pub( 'MFC.Video.scene03:prepareLayout' );
    };

    //export to global
    window[ns + 'Video_stop'] = MFC.Video.stop; //MFC_Video_stop
})(jQuery);