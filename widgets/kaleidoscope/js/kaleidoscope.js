(function($) {
    var KaleidoscopeJS = {};
    KaleidoscopeJS.init = function($obj, params) {
        var params = $.extend( true, {
            s: 3, //PARAMETER: *s* is the speed of the automatic timeout animation.
            n: 4, // PARAMETER: *n* is the number of segments.
            src: '', // PARAMETER: *src* is the URL for an alternate image.
            opacity: 0, // PARAMETER: *opacity* sets opacity (0.0 -> 1.0).
            opacityAnim: 1000, // PARAMETER: *opacityAnim* sets opacity transition duration
            mode: 2 // PARAMETER (undocumented): *mode* changes the animation style.
        }, params );

        var s = params.s;
        var n = params.n;

        var x = 0;
        var y = 0;

        var auto = true;
        var auto_x = 0;
        var auto_y = 0;
        var auto_throttle = false;

        var tiles = '';
        if ( n ) {
            for ( var i = 0; i <= n * 2; i++ ) {
                tiles += [ '<div class="tile t', i, '"><div class="image"></div></div>' ].join( '' );
            }
        }

        var $kaleidescope = $obj.addClass( 'n' + n ).append( tiles );

        var $image = $kaleidescope.find( '.image' );

        var k = $kaleidescope[0];

        var src = params.src;
        if ( src ) {
            $image.css( 'background-image', [ 'url(', decodeURIComponent( src ), ')' ].join( '' ) );
        }

        var opacity = parseFloat( params.opacity );
        var opacityAnim = parseInt( params.opacityAnim );
        if ( opacity ) {
            if ( !opacityAnim ) {
                $kaleidescope.css('opacity', opacity);
            }
            else {
                $kaleidescope.css('opacity', 0).fadeTo( opacityAnim, opacity );
            }
        }

        // Animate all the things!
        window.requestAnimFrame = ( function( window ) {
            var suffix = "equestAnimationFrame",
                rAF = [ "r", "webkitR", "mozR" ].filter( function( val ) {
                    return val + suffix in window;
                })[ 0 ] + suffix;

            return window[ rAF ] || function( callback ) {
                window.setTimeout( function() {
                    callback( +new Date() );
                }, 1000 / 60 );
            };
        })( window );

        function animate() {
            var time = new Date().getTime() * [ '.000', s ].join( '' );
            auto_x = Math.sin( time ) * document.body.clientWidth;
            auto_y++;

            move( auto_x, auto_y );
            if ( auto ) requestAnimFrame( animate );
        }

        function move( x, y ) {
            $image.css( 'background-position', [ x + "px", y + "px" ].join( ' ' ) );
        }

        //Timer to check for inactivity
        var t = 1;
        (function timer(t) {
            setTimeout( function() {
                t = 5000;
                if ( auto && !auto_throttle ) {
                    animate();
                    auto_throttle = true;
                } else {
                    auto = true;
                }
            }, t );
        })();
    }

    //export as jQuery function
    $.fn.kaleidescope = function(opts) {
        KaleidoscopeJS.init(this, opts);
    }
})(jQuery);