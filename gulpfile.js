var gulp = require('gulp');
var exec = require('child_process').exec;
var clean = require('gulp-clean');
var htmlreplace = require('gulp-html-replace');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');

gulp.task('build', function() {
    exec('gulp clean', function() {
        exec('gulp html copy min-css min-js');
    });
});
gulp.task('clean', function() {
    gulp
        .src('build/*')
        .pipe( clean() );
});
gulp.task('html', function() {
    gulp
        .src('index.html')
        .pipe( htmlreplace({
            'css': 'css/video.min.css',
            'js': 'js/video.min.js'
        }) )
        .pipe( gulp.dest('build/video') );
});
gulp.task('copy', function() {
    gulp
        .src([
            './fonts/**/*.*',
            './images/**/*.*',
            './sound/**/*.*',
            'config.json',
            './screenshot/php/screenshots/screenshot-01.jpg'
        ], { base: './' })
        .pipe( gulp.dest('build/video') );
});
gulp.task('min-css', function() {
    gulp
        .src(
            [
                'css/video.css',
                'css/theme.css',
                'widgets/kaleidoscope/css/mfc.kaleidoscope.css'
            ]
        )
        .pipe( concat('video.min.css') )
        .pipe( minifyCSS() )
        .pipe( gulp.dest('build/video/css') );
});
gulp.task('min-js', function() {
    gulp
        .src(
            [ //must preserve this order
                'js/jquery2.min.js',
                'js/utils.js',
                'widgets/kaleidoscope/js/mfc.kaleidoscope.js',
                'widgets/greensock/js/plugins/CSSPlugin.min.js',
                'widgets/greensock/js/easing/EasePack.min.js',
                'widgets/greensock/js/TweenLite.min.js',
                'widgets/greensock/js/TimelineLite.min.js',
                'js/preloadjs-0.6.1.min.js',
                'js/soundjs-0.6.1.min.js',
                'js/video.js'
            ]
        )
        .pipe( concat('video.min.js') )
        .pipe( gulp.dest('build/video/js') );
});