'use strict';

var queryString = window.location.search;
queryString = queryString.substring( queryString.indexOf('?')+1 );
var configUrl = queryString.split('=')[1];

(function($) {
    $(document).ready(function() {
        var $video = $('#mfc-video');
        //set video dimension with ratio 2:1
        (function(e) {
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
        })();
    });
})(jQuery);