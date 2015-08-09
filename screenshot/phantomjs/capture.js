'use strict';

(function() {
    try {
        //log
        var _log_start = new Date();
        //config
        var config = {
            debug: {
                verbose: true, //set 'true' for debug only
                logLevel: 'debug', //debug | info | warning | error
                viewportSize: { width: 1920, height: 960 },
                timeout: 15000, //Max timeout in milliseconds
                waitTimeout: 5000, //Default wait timeout, for wait* family functions.
                retryTimeout: 1000, //retry after 1s
            },
            dev: {
                verbose: true, //set 'true' for debug only
                logLevel: 'error', //debug | info | warning | error
                viewportSize: { width: 1920, height: 960 },
                timeout: 15000, //Max timeout in milliseconds
                waitTimeout: 5000, //Default wait timeout, for wait* family functions.
                retryTimeout: 1000, //retry after 1s
            },
            prod: {
                verbose: false, //set 'true' for debug only
                logLevel: 'error', //debug | info | warning | error
                viewportSize: { width: 1920, height: 960 },
                timeout: 15000, //Max timeout in milliseconds
                waitTimeout: 5000, //Default wait timeout, for wait* family functions.
                retryTimeout: 1000, //retry after 1s
            }
        }
        //require
        var system = require('system');
        var casper = require('casper');

        // these args will be processed
        /*
         * --url: (required) url of page to take the screenshot, separate by space
         * --img-path: (required) where to save the screenshot, separate by space
         * --img-name: (optional) file name of the screenshot, separate by space
         * --mode: (optional) run in 3 mode debug | dev | prod(default mode)
         */
        var argsApplicable = ['--img-path', '--url', '--img-name', '--mode'];
        // populated with the valid args provided in availableArgs but like params.img_path
        var params = {};
        //phantomjs params
        var args = system.args;
        if ( args.length === 1 ) {
            // Try to pass some arguments when invoking this script!
            // first arg which is always script name
        } else {
            args.forEach(function(arg, i) {
                // skip first arg which is always script name
                if ( i > 0 ) {
                    var bits = arg.split('=');
                    if ( bits.length != 2 ) {
                        //Arguement has wrong format
                    }
                    if ( argsApplicable.indexOf(bits[0]) > -1 ) {
                        var argVar = bits[0].replace(/\-/g, '_');
                        argVar = argVar.replace(/__/, '');
                        if ( bits[1] !== "" ) {
                            params[argVar] = bits[1].split(',');
                        }
                        else {
                            params[argVar] = [];
                        }
                    }
                }
            });
        }
        //validate args: --img-path
        if ( params.img_path === undefined || params.img_path.length == 0 ) {
            casper.echo( JSON.stringify({
                'status': 0,
                'message': 'Missing parameters --img-path',
                'images': []
            }) );
            phantom.exit();
        }

        //screenshot urls
        var pageUrls = [];
        //validate args: --url
        if ( params.url === undefined || params.url.length == 0 ) {
            casper.echo( JSON.stringify({
                'status': 0,
                'message': 'Missing parameters --url',
                'images': []
            }) );
            phantom.exit();
        }
        else {
            params.url.forEach(function(url, i) {
                pageUrls.push( decodeURIComponent(url) );
            });
        }

        //create a casperjs
        if ( params.mode === undefined || params.mode.length == 0 ) {
            params.mode = 'dev'; //default to the most quiet mode
        }
        casper = casper.create( config[ params.mode ] );

        //capturing part...
        var results = [];
        var i = 0;
        var guid = function() {
            return (new Date()).valueOf() + '_' + Math.random() * Math.pow(10, 6);
        }
        var captureCallback = function() {
            if ( i == pageUrls.length - 1 ) {
                var _log_end = new Date();
                casper.echo( JSON.stringify({
                    'status': 1,
                    'message': 'Finished in: ' + Math.round( (_log_end - _log_start)*100/1000 )/100 + 's',
                    'images': results
                }) );
                phantom.exit();
            }
            else {
                i++;
                capture();
            }
        }
        var capture = function() {
            //catch error
            casper.onLoadError = function(casper, url, status) {
                // console.log(status);
            }
            casper.onLoadError = function(message, backtrace) {
                // console.log(message);
            }
            casper.onWaitTimeout = function(timeout) {
                // console.log(timeout);
            }
            //open page
            casper.start(pageUrls[i], function() {
                var status = this.status();
                if ( status.currentHTTPStatus == 200 ) {
                    var self = this;

                    casper.evaluate(function() {
                        var images = document.getElementsByTagName('img');
                        images = Array.prototype.filter.call(images, function(i) { return !i.complete; });
                        window.imagesNotLoaded = images.length;
                        Array.prototype.forEach.call(images, function(i) {
                            i.onload = function() { window.imagesNotLoaded--; };
                        });
                    });

                    casper.waitFor(function() {
                        return this.evaluate(function() {
                            return window.imagesNotLoaded == 0;
                        });
                    }, function() {
                        var imgPath = params.img_path[i] === undefined
                            ? params.img_path[0]
                            : params.img_path[i];
                        var imgName = params.img_name[i] === undefined
                            ? guid()
                            : params.img_name[i];
                        var imgSavePath = imgPath + '/' +  imgName + '.jpg';
                        results.push( imgSavePath );
                        self.capture(
                            imgSavePath,
                            { //clip rect
                                top: 0,
                                left: 0,
                                width: 1920,
                                height: 960
                            },
                            { //image options
                                format: 'jpg',
                                quality: 100
                            }
                        );
                        self.clear();
                        captureCallback();
                    });
                }
                else {
                    this.clear();
                    captureCallback();
                }
            });
            casper.run();
        }
        capture();

    } catch(e) {
        casper.echo( JSON.stringify({
            'status': 0,
            'message': 'Exception thrown',
            'images': [],
            'error': e
        }) );
        phantom.exit();
    }
})();