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


const jsServDevFile = '../frontend/dist/app-development/app-development.js';
const jsServDevModuleFile0 = '../frontend/dist/app-development/1.app-development.js';
const jsServDevModuleFile1 = '../frontend/dist/app-development/2.app-development.js';
const jsServDevModuleFile2 = '../frontend/dist/app-development/3.app-development.js';
const jsServDevModuleFile3 = '../frontend/dist/app-development/4.app-development.js';
const jsServDevMonacoWorker1 = '../frontend/dist/app-development/editor.worker.js';
const jsServDevMonacoWorker2 = '../frontend/dist/app-development/ts.worker.js';
const jsDashboardFile = '../frontend/dist/dashboard/dashboard.js';
const cssServDevFile = '../frontend/dist/app-development/app-development.css';
const cssDashboardFile = '../frontend/dist/dashboard/dashboard.css';

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
  cb();
  return;
}

function copyReactCss(cb) {
  copyDashboardCss();
  copyServDevCss();
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

function deleteServDevJs() {
  return del('wwwroot/designer/js/react/app-development.js');
}

function deleteDashboardJs() {
  return del('wwwroot/designer/js/react/dashboard.js');
}

function deleteServDevCss() {
  return del('wwwroot/designer/css/react/app-development.css');
}

function deleteDashboardCss() {
  return del('wwwroot/designer/css/react/dashboard.css');
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
  deleteServDevJs,
  deleteDashboardJs,
  cleanNodeModulePackages,
  run('npm run clean', {
    cwd: '../frontend/dashboard',
  }),
  run('npm run clean', {
    cwd: '../frontend/app-development',
  })
));

gulp.task('develop', gulp.parallel(
  copyNodeModulePackages,
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../frontend/app-development',
  })
));

gulp.task('develop-designer-frontend', gulp.parallel(
  copyNodeModulePackages,
  setupWatchers,
  run('npm run webpack-watch', {
    cwd: '../frontend/app-development',
  })
));

gulp.task('develop-dashboard', gulp.parallel(
  copyNodeModulePackages,
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../frontend/dashboard',
  })
));

gulp.task('build-ux-editor', gulp.series(
  run('npm run build', {
    cwd: '../frontend/ux-editor',
  }),
  'copy-files'
));

gulp.task('install-react-app-dependencies', gulp.series(
  run('lerna bootstrap --hoist --ci', {
    cwd: '../Frontend',
  })
));

gulp.task('default', gulp.series([
  run('npm run build', {
    cwd: '../frontend/app-development',
  }),
  run('npm run build', {
    cwd: '../frontend/dashboard',
  }),
  'copy-files'
]));
