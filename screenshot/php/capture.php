<?php
    try {
        $wwwPath = 'http://projects.local/od.mfc/video/screenshot/html';

        //params: ?config=url
        $configUrl = isset($_GET['config'])
            ? $_GET['config']
            : $wwwPath . '/config.json'; //default config path
        //define required vars
        $root = __DIR__ . '/../phantomjs';
        $phantomjsScriptPath = $root . '/capture.js';
        $cmd = 'casperjs ' . $phantomjsScriptPath;
        $imgPath = array(
            __DIR__ . '/screenshots'
        );
        $imgName = array( 'screenshot-01', 'screenshot-02', 'screenshot-03' );
        $urls = array(
            urlencode( $wwwPath . '/screenshot-01.html?config=' . $configUrl),
            urlencode( $wwwPath . '/screenshot-02.html?config=' . $configUrl),
            urlencode( $wwwPath . '/screenshot-03.html?config=' . $configUrl)
        );

        //build command for phantomjs
        $cmd .= ' ' .
            '--url=' . implode(',', $urls) . ' ' .
            '--img-path=' . implode(',', $imgPath) . ' ' .
            '--img-name=' . implode(',', $imgName) . ' ' .
            '--mode=prod' . ' ' .
            '--ssl-protocol=any --ignore-ssl-errors=true';


        //execute and process response data
        $rawResults = shell_exec($cmd);
        $results = json_decode( $rawResults, true );
        print_r('<pre>');
        if ( $results['status'] === 1 ) {
            $imagesWebPath = array();
            foreach ( $results['images'] as $filePath ) {
                array_push( $imagesWebPath, substr( str_replace(__DIR__, '', $filePath), 1) );
            }

            //return message
            print_r( $results['message'] );
            print_r( '<br />' );
            print_r( '<br />' );


            //images local files path
            print_r( 'Files local path' );
            print_r( '<br />' );
            print_r( '---' );
            print_r( '<br />' );
            print_r( $results['images'] );
            print_r( '<br />' );
            print_r( '<br />' );

            //images www path
            print_r( 'Images www path' );
            print_r( '<br />' );
            print_r( '---' );
            print_r( '<br />' );
            print_r( $imagesWebPath );
            print_r( '<br />' );
            print_r( '<br />' );

            print_r( 'Images generated' );
            print_r( '<br />' );
            print_r( '---' );
            print_r( '<br />' );
            foreach ( $imagesWebPath as $src ) {
                print_r('<a target="_blank" href="' . $src . '" title="Download" class="mfc-screenshot"><img src="' . $src . '" width="200" /></a>');
            }
        }
        else {
            print_r( 'Error: ' );
            print_r( '<br />' );
            print_r( $rawResults );
        }
        print_r('</pre>');
    } catch (Exception $exp) {
        //$exp->getMessage();
    }