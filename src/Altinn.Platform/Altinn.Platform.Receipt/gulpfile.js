const gulp = require('gulp');
const run = require('gulp-run-command').default;
const fs = require('fs');
const chokidar = require('chokidar');

let jsWatcher = null;
let cssWatcher = null;

const receiptFile = '../../react-apps/applications/receipt/dist/receipt.js';
const cssReceiptFile = '../../react-apps/applications/receipt/dist/receipt.css';

function copyReactJs(cb) {
  copyReceiptJS();
  cb();
  return;
}

function copyReactCss(cb) {
  copyReceiptCSS();
  cb();
  return;
}

function copyReceiptJS() {
  setTimeout(function () {
    gulp.src(receiptFile).pipe(gulp.dest('./Receipt/wwwroot/receipt/js/react'));
  }, 1000);
  return;
}


function copyReceiptCSS() {
  setTimeout(function () {
    gulp.src(cssReceiptFile).pipe(gulp.dest('./Receipt/wwwroot/receipt/css'));
  }, 1000);
  return;
}


function setupWatchers(cb) {
  var checkReceiptJsFile = setInterval(function () {
    if (fs.existsSync(receiptFile)) {
      jsWatcher = chokidar.watch(receiptFile);
      jsWatcher.on('change', copyReceiptJS);
      clearInterval(checkReceiptJsFile);
    }
  }, 1000);

  var checkReceiptCSSFile = setInterval(function () {
    if (fs.existsSync(cssReceiptFile)) {
      cssWatcher = chokidar.watch(cssReceiptFile);
      cssWatcher.on('change', copyReceiptCSS);
      clearInterval(checkReceiptCSSFile);
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
  run('dotnet run', {
    cwd: './Receipt/',
  }),
  run('npm run webpack-watch', {
    cwd: '../../react-apps/applications/receipt',
  })
));

gulp.task('install-react-app-dependencies', gulp.series(
  run('lerna bootstrap --hoist --ci', {
    cwd: '../../react-apps',
  })
));

gulp.task('default', gulp.series([
  run('npm run build', {
    cwd: '../../react-apps/applications/receipt',
  }),
  'copy-files'
]));
