<!DOCTYPE html>
<html lang="en">
    <head>
        <title>MFC</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1">
        <style type="text/css">
            html, body {
                padding: 0;
                margin: 0;
            }
            a.mfc-screenshot {
                display: block;
                float: left;
                margin: 0 10px 10px 0;
                padding: 0;
            }
                a.mfc-screenshot img {
                    display: block;
                    margin: 0;
                    padding: 0;
                }
            a.mfc-screenshot,
            a.mfc-screenshot:hover {
                text-decoration: none;
            }
            a.mfc-screenshot:hover {
                opacity: 0.8;
                -moz-opacity: 0.8;
                filter: alpha(opacity=80);
            }

            .keyword-field {
                font-size: 16px;
                padding: 8px 10px;
                width: 250px;
                margin: 0 auto;
                display: block;
            }
            button {
                width: 274px;
                font-size: 16px;
                margin: 1px auto 0;
                display: block;
                border: none;
                background: #ccc;
                color: #666;
                padding: 5px 0;
            }
        </style>
    </head>

    <body>
        <form method="post" action="">
            <input type="text" name="keyword" placeholder="Enter your keyword(3-20 chars)" class="keyword-field" maxlength="20" />
            <button>Generate</button>
        </form>
        <?php
            if ( isset($_POST) && !empty($_POST['keyword']) ) {
                try {
                    $wwwPath = 'http://projects.local/od.mfc/video/screenshot/html';

                    //params keyword
                    $keyword = $_POST['keyword'];
                    //generate config files
                    include_once( 'generate-inspirations.php' );

                    //params: ?config=url
                    $configUrl = isset($_GET['config'])
                        ? $_GET['config']
                        : $wwwPath . '/config.json'; //default config path
                    //define required vars
                    $root = __DIR__ . '/../phantomjs';
                    $phantomjsScriptPath = $root . '/capture.js';
                    $cmd = 'casperjs ' . $phantomjsScriptPath;
                    $imgPath = array(
                        __DIR__ . '/screenshots/test'
                    );
                    $imgName = array();
                    $urls = array();
                    $inspiration = json_decode( file_get_contents('inspirations.json'), true );
                    foreach( $inspiration as $key => $sentence ) {
                        array_push( $imgName, $key );
                        array_push( $urls, urlencode( $wwwPath . '/screenshot-03.html?config=../html/test/config.' . $key . '.json') );
                    }

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
            }
        ?>
    </body>
</html>