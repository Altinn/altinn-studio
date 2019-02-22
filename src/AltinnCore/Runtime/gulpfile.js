const gulp = require('gulp');
const run = require('gulp-run-command').default;
const chokidar = require('chokidar');
const fs = require('fs');

const jsRuntimeFile = '../../react-apps/applications/runtime/dist/react-app.js';
const cssRuntimeFile = '../../react-apps/applications/runtime/dist/react-app.css';

let jsWatcher = null;
let cssWatcher = null;

function copyReactJs(cb) {
  copyRuntimeJs();
  cb();
  return;
}

function copyReactCss(cb) {
  copyRuntimeCss();
  cb();
  return;
}

function copyRuntimeJs() {
  setTimeout(function () {
    gulp.src(jsRuntimeFile).pipe(gulp.dest('../Designer/wwwroot/designer/js/react'));
  }, 1000);
  return;
}

function copyRuntimeCss() {
  setTimeout(function () {
    gulp.src(cssRuntimeFile).pipe(gulp.dest('../Designer/wwwroot/designer/css/react'));
  }, 1000);
  return;
}

function setupWatchers(cb) {
  var checkRuntimeJsFile = setInterval(function () {
    if (fs.existsSync(jsRuntimeFile)) {
      jsWatcher = chokidar.watch(jsRuntimeFile);
      // jsWatcher.on('ready', copyReactJs);
      jsWatcher.on('change', copyRuntimeJs);
      clearInterval(checkRuntimeJsFile);
    }
  }, 1000);

  var checkRuntimeCssFile = setInterval(function () {
    if (fs.existsSync(cssRuntimeFile)) {
      cssWatcher = chokidar.watch(cssRuntimeFile);
      // cssWatcher.on('ready', copyReactCss);
      cssWatcher.on('change', copyRuntimeCss);
      clearInterval(checkRuntimeCssFile);
    }
  }, 1000);

  cb();
}

gulp.task('copy-files', gulp.series(
  copyReactJs,
  copyReactCss
));

gulp.task('develop', gulp.parallel(
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../../react-apps/applications/runtime',
  })
));

gulp.task('default', gulp.series([
  run('npm run build', {
    cwd: '../../react-apps/applications/runtime',
  }),
  'copy-files'
]));
