const gulp = require('gulp');
const run = require('gulp-run-command').default;
const chokidar = require('chokidar');
const del = require('del');
const fs = require('fs');

const cleanGlobs = [
  "wwwroot/designer/css/lib/**/*.css",
  "wwwroot/designer/js/lib/**/*.js",
  "wwwroot/designer/css/font-awesome/*.css",
  "wwwroot/designer/js/lib/**",
  "wwwroot/designer/css/lib/**",
  "wwwroot/designer/css/bootstrap*.css",
  "wwwroot/designer/css/font/fontawesome*.*"
];


const jsServDevFile = '../../react-apps/applications/service-development/dist/service-development.js';
const jsServDevModuleFile0 = '../../react-apps/applications/service-development/dist/0.service-development.js';
const jsServDevModuleFile1 = '../../react-apps/applications/service-development/dist/1.service-development.js';
const jsServDevModuleFile2 = '../../react-apps/applications/service-development/dist/2.service-development.js';
const jsServDevModuleFile3 = '../../react-apps/applications/service-development/dist/3.service-development.js';
const jsServDevMonacoWorker1 = '../../react-apps/applications/service-development/js/react/editor.worker.js';
const jsServDevMonacoWorker2 = '../../react-apps/applications/service-development/js/react/typescript.worker.js';
const jsDashboardFile = '../../react-apps/applications/dashboard/dist/dashboard.js';
const jsUiEditorFile = '../../react-apps/applications/ux-editor/dist/runtime.js';
const cssServDevFile = '../../react-apps/applications/service-development/dist/service-development.css';
const cssDashboardFile = '../../react-apps/applications/dashboard/dist/dashboard.css';
const cssUiEditorFile = '../../react-apps/applications/ux-editor/dist/react-app.css';

let jsWatcher = null;
let cssWatcher = null;

const copyGlobs = [{
  src: "node_modules/bootstrap/dist/css/bootstrap*.css",
  dest: "wwwroot/designer/css/"
},
{
  src: "node_modules/jquery-ui-dist/*.js",
  dest: "wwwroot/designer/js/lib/jquery-ui/"
},
{
  src: "node_modules/bootstrap/dist/js/bootstrap*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/json-editor/dist/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/select2/dist/js/select2.full.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/select2/dist/css/select2.css",
  dest: "wwwroot/designer/css/lib"
},
{
  src: "node_modules/jquery/dist/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/requirejs/require.js",
  dest: "wwwroot/designer/js/lib/"
},
{
  src: "node_modules/underscore/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/requirejs-text/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/js-beautify/js/lib/beautify*.js",
  dest: "wwwroot/designer/js/lib/"
},
{
  src: "node_modules/sightglass/*.js",
  dest: "wwwroot/designer/js/lib/"
},
{
  src: "node_modules/rivets/dist/*.js",
  dest: "wwwroot/designer/js/lib/"
},
{
  src: "node_modules/jquery-validation-unobtrusive/dist/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/jquery-validation/dist/*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/popper.js/dist/umd/*.*.js",
  dest: "wwwroot/designer/js/lib"
},
{
  src: "node_modules/monaco-editor/min/**/*.*",
  dest: "wwwroot/designer/js/lib/monaco-editor"
},
{
  src: "node_modules/bootstrap-list-filter/bootstrap-list-filter.min.js",
  dest: "wwwroot/designer/js/lib"
}
];

function copyNodeModulePackages(cb) {
  copyGlobs.map(copyGlob => gulp.src(copyGlob.src).pipe(gulp.dest(copyGlob.dest)));
  cb();
}

function cleanNodeModulePackages() {
  return del(cleanGlobs);
}

function copyReactJs(cb) {
  copyDashboardJs();
  copyServDevJs();
  copyUiEditorJs();
  cb();
  return;
}

function copyReactCss(cb) {
  copyDashboardCss();
  copyServDevCss();
  copyUiEditorCss();
  cb();
  return;
}

function copyDashboardJs() {
  setTimeout(function () {
    gulp.src(jsDashboardFile).pipe(gulp.dest('./wwwroot/designer/js/react'));
  }, 1000);
  return;
}

function copyServDevJs() {
  setTimeout(function () {
    gulp.src(jsServDevFile).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevModuleFile0).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevModuleFile1).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevModuleFile2).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevModuleFile3).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevMonacoWorker1).pipe(gulp.dest('./wwwroot/designer/js/react'));
    gulp.src(jsServDevMonacoWorker2).pipe(gulp.dest('./wwwroot/designer/js/react'));
  }, 1000);
  return;
}

function copyUiEditorJs() {
  setTimeout(function () {
    gulp.src(jsUiEditorFile).pipe(gulp.dest('./wwwroot/designer/js/react'));
  }, 1000);
  return;
}

function copyDashboardCss() {
  setTimeout(function () {
    gulp.src(cssDashboardFile).pipe(gulp.dest('./wwwroot/designer/css/react'));
  }, 1000);
  return;
}

function copyServDevCss() {
  setTimeout(function () {
    gulp.src(cssServDevFile).pipe(gulp.dest('./wwwroot/designer/css/react'));
  }, 1000);
  return;
}

function copyUiEditorCss() {
  setTimeout(function () {
    gulp.src(cssUiEditorFile).pipe(gulp.dest('./wwwroot/designer/css/react'));
  }, 1000);
  return;
}

function deleteServDevJs() {
  return del('wwwroot/designer/js/react/service-development.js');
}

function deleteDashboardJs() {
  return del('wwwroot/designer/js/react/dashboard.js');
}

function deleteUiEditorJs() {
  return del('wwwroot/designer/js/react/runtime.js');
}


function deleteServDevCss() {
  return del('wwwroot/designer/css/react/service-development.css');
}

function deleteDashboardCss() {
  return del('wwwroot/designer/css/react/dashboard.css');
}

function deleteUiEditorCss() {
  return del('wwwroot/designer/css/react/react-app.css');
}

function setupWatchers(cb) {
  var checkDashboardJsFile = setInterval(function () {
    if (fs.existsSync(jsDashboardFile)) {
      jsWatcher = chokidar.watch(jsDashboardFile);
      // jsWatcher.on('ready', copyReactJs);
      jsWatcher.on('change', copyDashboardJs);
      clearInterval(checkDashboardJsFile);
    }
  }, 1000);

  var checkServDevJsFile = setInterval(function () {
    if (fs.existsSync(jsServDevFile)) {
      jsWatcher = chokidar.watch(jsServDevFile);
      // jsWatcher.on('ready', copyReactJs);
      jsWatcher.on('change', copyServDevJs);
      clearInterval(checkServDevJsFile);
    }
  }, 1000);

  var checkUiEditorJsFile = setInterval(function () {
    if (fs.existsSync(jsUiEditorFile)) {
      jsWatcher = chokidar.watch(jsUiEditorFile);
      // jsWatcher.on('ready', copyReactJs);
      jsWatcher.on('change', copyUiEditorJs);
      clearInterval(checkUiEditorJsFile);
    }
  }, 1000);

  var checkDashboardCssFile = setInterval(function () {
    if (fs.existsSync(cssDashboardFile)) {
      cssWatcher = chokidar.watch(cssDashboardFile);
      // cssWatcher.on('ready', copyReactCss);
      cssWatcher.on('change', copyDashboardCss);
      clearInterval(checkDashboardCssFile);
    }
  }, 1000);

  var checkServDevCssFile = setInterval(function () {
    if (fs.existsSync(cssServDevFile)) {
      cssWatcher = chokidar.watch(cssServDevFile);
      // cssWatcher.on('ready', copyReactCss);
      cssWatcher.on('change', copyServDevCss);
      clearInterval(checkServDevCssFile);
    }
  }, 1000);

  var checkUiEditorCssFile = setInterval(function () {
    if (fs.existsSync(cssUiEditorFile)) {
      cssWatcher = chokidar.watch(cssUiEditorFile);
      // cssWatcher.on('ready', copyReactCss);
      cssWatcher.on('change', copyUiEditorCss);
      clearInterval(checkUiEditorCssFile);
    }
  }, 1000);

  cb();
}

gulp.task('build', gulp.series([
  copyNodeModulePackages,
]));

gulp.task('copy-files', gulp.series(
  copyNodeModulePackages,
  copyReactJs,
  copyReactCss
));

gulp.task('clean', gulp.series(
  deleteServDevCss,
  deleteDashboardCss,
  deleteUiEditorCss,
  deleteServDevJs,
  deleteDashboardJs,
  deleteUiEditorJs,
  cleanNodeModulePackages,
  run('npm run clean', {
    cwd: '../../react-apps/applications/dashboard',
  }),
  run('npm run clean', {
    cwd: '../../react-apps/applications/service-development',
  })
));

gulp.task('develop', gulp.parallel(
  copyNodeModulePackages,
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../../react-apps/applications/service-development',
  })
));

gulp.task('develop-dashboard', gulp.parallel(
  copyNodeModulePackages,
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../../react-apps/applications/dashboard',
  })
));

gulp.task('build-ux-editor', gulp.series(
  run('npm run build', {
    cwd: '../../react-apps/applications/ux-editor',
  }),
  'copy-files'
));

gulp.task('install-react-app-dependencies', gulp.series(
  run('lerna bootstrap --hoist', {
    cwd: '../../react-apps',
  })
));

gulp.task('default', gulp.series([
  run('npm run build', {
    cwd: '../../react-apps/applications/service-development',
  }),
  run('npm run build', {
    cwd: '../../react-apps/applications/dashboard',
  }),
  run('npm run build', {
    cwd: '../../react-apps/applications/ux-editor',
  }),
  'copy-files'
]));
