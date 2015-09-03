<?php
    try {
        $inspiration = json_decode( file_get_contents('inspirations.json'), true );
        $themes = array(
            'mfc-video__content--theme-01',
            'mfc-video__content--theme-02',
            'mfc-video__content--theme-03',
            'mfc-video__content--theme-04'
        );
        foreach( $inspiration as $key => $sentence ) {
            $themeKey = 0;
            if ( in_array($key, ['love1','love2','love3','love4']) ) {
                $themeKey = 0;
            }
            if ( in_array($key, ['fun1','fun2','fun3','fun4']) ) {
                $themeKey = 1;
            }
            if ( in_array($key, ['idol1','idol2','idol3','idol4']) ) {
                $themeKey = 2;
            }
            if ( in_array($key, ['success1','success2','success3','success4']) ) {
                $themeKey = 3;
            }

            file_put_contents(
                '../html/test/config.' . $key . '.json',
                json_encode( array(
                    'name' => 'MFC',
                    'theme' => $themes[$themeKey],
                    'logo' => 'images/logo.png',
                    'image' => 'images/kaka.jpg',
                    'idol' => array(
                        'images' => 'images/cover-01.png',
                        'color' => '#fff'
                    ),
                    'sentence' => array(
                        'phase' => $sentence,
                        'keyword' => $keyword
                    )
                ) )
            );
        }
    } catch (Exception $exp) {
        //$exp->getMessage();
    }