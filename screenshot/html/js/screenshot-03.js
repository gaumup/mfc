'use strict';

(function($) {
    $(document).ready(function() {
        $.getJSON(configUrl)
            .done(function(response) {
                $('.font-preload').remove();

                var $video = $('#mfc-video').addClass( response.theme );
                var stage = $('#scene-03');
                var sentence = response.sentence;
                //remove , ! . and space more than 1
                sentence.phase = sentence.phase.replace( new RegExp('[,.!]', 'g'), '' ).replace( new RegExp('\\s+', 'g'), ' ' );
                var times = function(char, times) {
                    var result = '';
                    for ( var i=0; i < times; i++ ) {
                        result += '*';
                    }
                    return result;
                }
                var keyword = [];
                $.each(sentence.keyword.split(' '), function(index, word) {
                    keyword.push( times('*', word.length) );
                });
                var sentenceWithKeyword = sentence.phase.replace( new RegExp('{keyword}', 'g'), keyword.join(' ') );
                // console.log( sentenceWithKeyword )
                var $rows = $('.sentence-row');
                var stageWidth = stage.width();

                var _getWordsRow = function(rowString, offset) {
                    var lastSpacing = rowString.lastIndexOf(' ');
                    var nextSpacing = rowString.length;
                    if ( sentenceWithKeyword.lastIndexOf(' ') < offset+nextSpacing ) {
                        return sentenceWithKeyword.substr(offset, lastSpacing);
                    }
                    else {
                        while ( offset+nextSpacing < sentenceWithKeyword.length
                            && sentenceWithKeyword.charAt(offset+nextSpacing) !== ' '
                        ) {
                            nextSpacing++;
                        }
                        if ( rowString.length - lastSpacing - 1 > nextSpacing - rowString.length + 1 ) {
                            return sentenceWithKeyword.substr(offset, nextSpacing);
                        }
                        else {
                            return sentenceWithKeyword.substr(offset, lastSpacing);
                        }
                    }
                }
                var _doMaskingKeyword = function(rowStr) {
                    var asterikRegExp = new RegExp('(\\s)*(\\*)+(\\s)*', 'g');
                    var keywordMask = '{*}';
                    return rowStr.trim().replace( asterikRegExp, '$1' + keywordMask + '$3' );
                }
                var rows = (function() {
                    var charsPerRow = Math.round(sentenceWithKeyword.length/3);
                    var firstRow = sentenceWithKeyword.substr(0, charsPerRow);
                    firstRow = _getWordsRow( firstRow, 0 );

                    charsPerRow = Math.round(sentenceWithKeyword.substr(firstRow.length).trim().length/2);
                    var secondRow = sentenceWithKeyword.substr(firstRow.length, charsPerRow).trim();
                    secondRow = _getWordsRow( secondRow, firstRow.length+1 );

                    var thirdRow = sentenceWithKeyword.substr(firstRow.length + secondRow.length + 1).trim();

                    firstRow = _doMaskingKeyword(firstRow);
                    secondRow = _doMaskingKeyword(secondRow);
                    thirdRow = _doMaskingKeyword(thirdRow);

                    return [ firstRow.split(' '), secondRow.split(' '), thirdRow.split(' ') ];
                })();
                // console.log( rows[0], rows[0].join(' ').length );
                // console.log( rows[1], rows[1].join(' ').length );
                // console.log( rows[2], rows[2].join(' ').length );

                //re-flow keyword, make sure on 1 line
                var keywordDistibution = [
                    rows[0].indexOf('{*}') > -1 ? rows[0].join(' ').match(/{\*}/g).length : 0,
                    rows[1].indexOf('{*}') > -1 ? rows[1].join(' ').match(/{\*}/g).length : 0,
                    rows[2].indexOf('{*}') > -1 ? rows[2].join(' ').match(/{\*}/g).length : 0
                ];
                var max = 0;
                var keywordInRow = 0;
                $.each(keywordDistibution, function(index, count) {
                    if ( count > max ) {
                        max = count;
                        keywordInRow = index;
                    }
                });
                var _distributeRows = function(row1, row2) {
                    if ( Math.abs(row1.length - row2.length) > 1 ) {
                        var tmp = row1.concat(row2);
                        var mid = (function() {
                            var _m = Math.floor(tmp.length/2);
                            var _offset1 = tmp.slice( 0, _m ).join('').length - tmp.slice( _m ).join('').length;
                            var _offset2 = tmp.slice( 0, _m+1 ).join('').length - tmp.slice( _m+1 ).join('').length;

                            return _offset1 < _offset2 ? _m : _m+1;
                        })();
                        return [ tmp.slice( 0, mid ), tmp.slice( mid ) ];
                    }
                    return [row1, row2];
                }
                var keywordRegExp = new RegExp('({\\*}(\\s{\\*})*)+', 'g');
                switch( keywordInRow ) {
                    case 0: //row 1, words count ascending
                        if ( keywordDistibution[1] > 0 ) {
                            var split2 = rows[1].slice( 0, rows[1].lastIndexOf('{*}')+1 );
                            rows[0] = rows[0].concat( split2 );
                            rows[1] = rows[1].slice( rows[1].lastIndexOf('{*}')+1 );
                        }
                        rows[0] = rows[0].join(' ').replace(keywordRegExp, '{keyword}').split(' ');
                        var _dist = _distributeRows( rows[1], rows[2] );
                        rows[1] = _dist[0];
                        rows[2] = _dist[1];

                        break;
                    case 1: //row 2
                        if ( keywordDistibution[0] > 0 ) {
                            var split1 = rows[0].slice( 0, rows[0].indexOf('{*}') );
                            rows[1] = rows[0].slice( split1.length ).concat(rows[1]);
                            rows[0] = split1;
                        }

                        if ( keywordDistibution[2]  > 0 ) {
                            var split3 = rows[2].slice( 0, rows[2].lastIndexOf('{*}')+1 );
                            rows[1] = rows[1].concat( split3 );
                            rows[2] = rows[2].slice( rows[2].lastIndexOf('{*}')+1 );
                        }
                        rows[1] = rows[1].join(' ').replace(keywordRegExp, '{keyword}').split(' ');
                        break;
                    case 2: //row 3, words count desending
                        if ( keywordDistibution[1] > 0 ) {
                            var split2 = rows[1].slice( 0, rows[1].indexOf('{*}') );
                            rows[2] = rows[1].slice( split2.length ).concat(rows[2]);
                            rows[1] = split2;
                        }

                        rows[2] = rows[2].join(' ').replace(keywordRegExp, '{keyword}').split(' ');
                        var _dist = _distributeRows( rows[0], rows[1] );
                        rows[0] = _dist[0];
                        rows[1] = _dist[1];

                        while ( rows[2].length - 1 + sentence.keyword.split(' ').length - rows[1].length >= 1
                            && rows[2].length > 1
                        ) {
                            rows[1] = rows[1].concat( rows[2].shift() );
                            if ( rows[0].length < rows[1].length ) {
                                rows[0] = rows[0].concat( rows[1].shift() );
                            }
                        }

                        break;
                }
                // console.log( rows[0] );
                // console.log( rows[1] );
                // console.log( rows[2] );

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
                            .html('<span>' + (function() {
                                return word == '{keyword}'
                                    ? '<em class="scene-03__keyword">' + sentence.keyword + '</em>'
                                    : word;
                            })() + '</span>')
                            .addClass( word =='{keyword}' ? 'color-style-04' : 'color-style-03')
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
                        //always add a spacing at the last word of the 3rd line
                        if ( rowIndex == 2 && wordIndex == words.length-1 ) {
                            $rows.eq(rowIndex).append( _spaceBlock(rowIndex, rowHeight, initialFontSize, wordIndex) );
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
                    if ( rowIndex == 2 ) {
                        var lastSpaceMinWidth = stageWidth*0.1;
                        var lastSpaceBlock = rowBlockSpaces.last();
                        if ( spaceWidth < lastSpaceMinWidth ) {
                            spaceWidth = Math.floor( ( stageWidth - w - lastSpaceMinWidth )/( rowBlockSpaces.length - 1 ) );
                            lastSpaceBlock
                                .addClass('block-space--fixed')
                                .css({ width: lastSpaceMinWidth + 'px' });
                        }
                    }
                    var spaceMin = stageWidth*0.1;
                    if ( spaceWidth < spaceMin ) {
                        var _stageWidth = stageWidth;
                        var totalSpacesBlock = rowBlockSpaces.length;
                        if ( rowIndex == 2 ) {
                            totalSpacesBlock--;
                            _stageWidth -= rowBlockSpaces.last().outerWidth();
                        }
                        var reduceBlockWordWidth = Math.ceil( (totalSpacesBlock*spaceMin)/rowBlockWords.length )
                        if ( w > _stageWidth ) {
                            reduceBlockWordWidth += Math.ceil( (w - _stageWidth)/rowBlockWords.length );
                        }
                        var _w = 0;
                        $.each(rowBlockWordsSortAsc, function(index, item) {
                            var min = _stageWidth*0.15;
                            var $this = $(this);
                            var originW = $(this).outerWidth(true);
                            var outerW = originW - reduceBlockWordWidth;
                            if ( outerW < min ) {
                                //set block word min = 10%
                                $this.width(min);
                                var _newWidth = Math.ceil( $this.outerWidth(true) );
                                _w += _newWidth;

                                //recalculate reduce block word space
                                reduceBlockWordWidth = totalSpacesBlock == 0
                                    ? rowBlockSpaces.last().outerWidth()
                                    : Math.ceil( (totalSpacesBlock*min)/(rowBlockWords.length - (index + 1)) );
                                reduceBlockWordWidth += Math.ceil( ( (w - originW) - (_stageWidth - _newWidth) )/(rowBlockWords.length - (index + 1)) );
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
                        spaceWidth = totalSpacesBlock == 0 ? 0 : Math.floor( ( _stageWidth - _w)/totalSpacesBlock );
                    }
                    rowBlockSpaces.not('.block-space--fixed').css({ width: spaceWidth + 'px' });
                });

                //insert logo nfc on last space block of last row
                $('.block-space').last()
                    .html('<span class="mfc-logo"></span>')
                    .removeClass('color-style-02')
                    .addClass('color-style-01');
            })
            .fail(function() {
            })
            .always(function() {});
    });
})(jQuery);