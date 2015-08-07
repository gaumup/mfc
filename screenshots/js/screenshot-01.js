'use strict';

(function($) {
    $(document).ready(function() {
        $.getJSON(configUrl)
            .done(function(response) {
                var imgPlaceHolder01 = $('#scene-01__img-placeholder-01');
                var imgPlaceHolder02 = $('#scene-01__img-placeholder-02');
                var imgPlaceHolder03 = $('#scene-01__img-placeholder-03');
                var scaleBlock01 = $('#scene-01__scale-block-01');
                var staticBlock01 = $('#scene-01__static-block-01');
                imgPlaceHolder01
                    .css({
                        backgroundImage: 'url(' + response.image + ')'
                    });
                imgPlaceHolder02.add(imgPlaceHolder03)
                    .css({
                        backgroundImage: 'url(' + response.image + ')'
                    });
                scaleBlock01
                    .css({
                        backgroundImage: 'url(' + response.logo + ')'
                    });
                var staticBlock01Height = staticBlock01.height();
                staticBlock01
                    .css({
                        fontSize: staticBlock01Height*.2 + 'px',
                        lineHeight: staticBlock01Height + 'px'
                    });
            })
            .fail(function() {
            })
            .always(function() {});
    });
})(jQuery);