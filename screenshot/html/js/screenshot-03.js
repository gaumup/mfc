'use strict';

(function($) {
    $(document).ready(function() {
        $.getJSON(configUrl)
            .done(function(response) {
                var $video = $('#mfc-video').addClass( response.theme );
                var stage = $('#scene-03');
                var sentence = response.sentence;
                var $rows = $('.sentence-row');
                (function() {
                    var stageWidth = stage.width();
                    var sentenceBreakdown = sentence.split(' ');
                    var totalBlocks = sentenceBreakdown.length;
                    var rows = [ [], [], [] ];
                    var wordsPerRow = Math.round(totalBlocks/3); //excluding spacing
                    rows[0] = sentenceBreakdown.slice(0, wordsPerRow);
                    rows[1] = sentenceBreakdown.slice(wordsPerRow, wordsPerRow*2);
                    rows[2] = sentenceBreakdown.slice(wordsPerRow*2);
                    //ensure 3 rows: row's height: 25%, 25%, 50%
                    var _blockTpl = '<div class="block"></div>';
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
                                .html('<span>' + word + '</span>')
                                .addClass('color-style-03')
                                .css({
                                    height: rowHeight,
                                    fontSize: initialFontSize,
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

                    $('.block-space').eq(0).css({
                        backgroundImage: 'url(' + response.logo + ')'
                    });
                })();
            })
            .fail(function() {
            })
            .always(function() {});
    });
})(jQuery);