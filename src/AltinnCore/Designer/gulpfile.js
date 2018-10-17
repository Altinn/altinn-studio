const gulp = require('gulp');
const run = require('gulp-run-command').default;
const chokidar = require('chokidar');
const del = require('del');

const cleanGlobs = [
  "wwwroot/designer/css/lib/**/*.css",
  "wwwroot/designer/js/lib/**/*.js",
  "wwwroot/designer/css/font-awesome/*.css",
  "wwwroot/designer/js/lib/**",
  "wwwroot/designer/css/lib/**",
  "wwwroot/designer/css/bootstrap*.css",
  "wwwroot/designer/css/font/fontawesome*.*"
];

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


let jsWatcher = null;
let cssWatcher = null;

function copyNodeModulePackages(cb) {
  copyGlobs.map(copyGlob => gulp.src(copyGlob.src).pipe(gulp.dest(copyGlob.dest)));
  cb();
}

function cleanNodeModulePackages() {
  return del(cleanGlobs);
}

function copyReactJs() {
  return gulp.src('../../react-apps/ux-editor/dist/react-app.js').pipe(gulp.dest('./wwwroot/designer/js/formbuilder/'));
}

function copyReactCss() {
  return gulp.src('../../react-apps/ux-editor/dist/react-app.css').pipe(gulp.dest('./wwwroot/designer/css/'));
}

function deleteReactJs() {
  return del('wwwroot/designer/js/formbuilder/react-app.js');
}

function deleteReactCss() {
  return del('wwwroot/designer/css/react-app.css');
}

function setupWatchers(cb) {
  jsWatcher = chokidar.watch('../../react-apps/ux-editor/dist/react-app.js');
  cssWatcher = chokidar.watch('../../react-apps/ux-editor/dist/react-app.css');
  jsWatcher.on('ready', copyReactJs);
  jsWatcher.on('change', copyReactJs);
  cssWatcher.on('ready', copyReactCss);
  cssWatcher.on('change', copyReactCss);
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
  deleteReactCss,
  deleteReactJs,
  cleanNodeModulePackages,
  run('npm run clean', {
    cwd: '../../react-apps/ux-editor',
  })
));

gulp.task('develop', gulp.series(
  copyNodeModulePackages,
  setupWatchers,
  run('dotnet run'),
  run('npm run webpack-watch', {
    cwd: '../../react-apps/ux-editor',
  }),
));

gulp.task('install-react-app-dependencies', gulp.series(
  run('npm install', {
    cwd: '../../react-apps/ux-editor',
  })
));

gulp.task('default', gulp.series([
  run('npm run build', {
    cwd: '../../react-apps/ux-editor',
  }),
  'copy-files'
]));