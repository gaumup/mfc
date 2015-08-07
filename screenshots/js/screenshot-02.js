'use strict';

(function($) {
    $(document).ready(function() {
        $.getJSON(configUrl)
            .done(function(response) {
                var scaleBlock01 = $('#scene-02__scale-block-01');
                scaleBlock01
                    .css({
                        backgroundImage: 'url(' + response.logo + ')'
                    });

                var kaleidoscope = $('#scene-02__kaleidoscope');
                kaleidoscope.css({
                    backgroundColor: response.idol.color
                })
                var c = kaleidoscope.find('.circle-tile');
                c.css({
                    backgroundImage: 'url(' + response.idol.image + ')'
                });
            })
            .fail(function() {
            })
            .always(function() {});
    });
})(jQuery);