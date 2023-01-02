const gulp = require('gulp');
const run = require('gulp-run-command').default;
const del = require('del');
const path = require('path');

// When specifying options, you need to add all options to avoid lint errors.
// This can be removed if/when https://github.com/Klathmon/gulp-run-command/pull/11 is released
const defaultGulpRunOptions = {
  quiet: false,
  ignoreErrors: false,
  timeout: undefined,
  env: {},
};

const cleanGlobs = [
  'wwwroot/designer/css/lib/**/*.css',
  'wwwroot/designer/js/lib/**/*.js',
  'wwwroot/designer/css/font-awesome/*.css',
  'wwwroot/designer/js/lib/**',
  'wwwroot/designer/css/lib/**',
  'wwwroot/designer/css/bootstrap*.css',
  'wwwroot/designer/css/font/fontawesome*.*',
];
const FRONTEND_FOLDER = path.resolve(__dirname,"..","..","..","frontend");
const jsServDevFile = path.join(FRONTEND_FOLDER, 'dist/app-development/app-development.js');
const jsServDevModuleFile1 = path.join(FRONTEND_FOLDER, 'dist/app-development/1.app-development.js');
const jsServDevModuleFile2 = path.join(FRONTEND_FOLDER, 'dist/app-development/2.app-development.js');
const jsServDevModuleFile3 = path.join(FRONTEND_FOLDER, 'dist/app-development/3.app-development.js');
const jsServDevModuleFile4 = path.join(FRONTEND_FOLDER, 'dist/app-development/4.app-development.js');
const jsServDevMonacoWorker1 = path.join(FRONTEND_FOLDER, 'dist/app-development/editor.worker.js');
const jsServDevMonacoWorker2 = path.join(FRONTEND_FOLDER, 'dist/app-development/ts.worker.js');
const jsDashboardFile = path.join(FRONTEND_FOLDER, 'dist/dashboard/dashboard.js');
const cssServDevFile = path.join(FRONTEND_FOLDER, 'dist/app-development/app-development.css');
const cssDashboardFile = path.join(FRONTEND_FOLDER, 'dist/dashboard/dashboard.css');
const langNoFile = path.join(FRONTEND_FOLDER, 'dist/language/nb.json');
const langEnFile = path.join(FRONTEND_FOLDER, 'dist/language/en.json');

const jslibDest = 'wwwroot/designer/js/lib/';
const copyGlobs = [
  {
    src: 'node_modules/bootstrap/dist/css/bootstrap*.css',
    dest: 'wwwroot/designer/css/',
  },
  {
    src: 'node_modules/jquery-ui-dist/*.js',
    dest: 'wwwroot/designer/js/lib/jquery-ui/',
  },
  {
    src: 'node_modules/bootstrap/dist/js/bootstrap*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/json-editor/dist/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/select2/dist/js/select2.full.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/select2/dist/css/select2.css',
    dest: 'wwwroot/designer/css/lib',
  },
  {
    src: 'node_modules/jquery/dist/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/requirejs/require.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/underscore/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/requirejs-text/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/js-beautify/js/lib/beautify*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/sightglass/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/rivets/dist/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/jquery-validation-unobtrusive/dist/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/jquery-validation/dist/*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/popper.js/dist/umd/*.*.js',
    dest: jslibDest,
  },
  {
    src: 'node_modules/monaco-editor/min/**/*.*',
    dest: 'wwwroot/designer/js/lib/monaco-editor',
  },
  {
    src: 'node_modules/bootstrap-list-filter/bootstrap-list-filter.min.js',
    dest: jslibDest,
  },
];

function copyNodeModulePackages(cb) {
  copyGlobs.forEach((copyGlob) => gulp.src(copyGlob.src).pipe(gulp.dest(copyGlob.dest)));
  cb();
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

const APP_DEVELOPMENT_ROOT = './wwwroot/designer/frontend/app-development';
const DASHBOARD_ROOT = './wwwroot/designer/frontend/dashboard';
const LANG_ROOT = './wwwroot/designer/frontend/lang';

function copyDashboardJs() {
  setTimeout(function () {
    gulp.src(jsDashboardFile).pipe(gulp.dest(DASHBOARD_ROOT));
  }, 1000);
  return;
}

function copyServDevJs() {
  setTimeout(function () {
    gulp.src(jsServDevFile).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevModuleFile1).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevModuleFile2).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevModuleFile3).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevModuleFile4).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevMonacoWorker1).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
    gulp.src(jsServDevMonacoWorker2).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
  }, 1000);
  return;
}

function copyDashboardCss() {
  setTimeout(function () {
    gulp.src(cssDashboardFile).pipe(gulp.dest(DASHBOARD_ROOT));
  }, 1000);
  return;
}

function copyServDevCss() {
  setTimeout(function () {
    gulp.src(cssServDevFile).pipe(gulp.dest(APP_DEVELOPMENT_ROOT));
  }, 1000);
  return;
}

function copyLangFiles(cb) {
  gulp.src(langNoFile).pipe(gulp.dest(LANG_ROOT));
  gulp.src(langEnFile).pipe(gulp.dest(LANG_ROOT));
  setTimeout(cb, 1000);
  return;
}

gulp.task('build', gulp.series([copyNodeModulePackages]));

gulp.task('copy-files', gulp.series(copyNodeModulePackages, copyReactJs, copyReactCss, copyLangFiles));


gulp.task(
  'develop-designer-backend',
  gulp.parallel(
    copyNodeModulePackages,
    run('dotnet run'),
    run('yarn run start', {
      ...defaultGulpRunOptions,
      cwd: path.join(FRONTEND_FOLDER,'app-development'),
    }),
    run('yarn run start', {
      ...defaultGulpRunOptions,
      cwd: path.join(FRONTEND_FOLDER,'dashboard'),
    }),
  ),
);

gulp.task(
  'develop-designer-frontend',
  gulp.parallel(
    copyNodeModulePackages,
    run('yarn run start', {
      ...defaultGulpRunOptions,
      cwd: path.join(FRONTEND_FOLDER,'app-development'),
    }),
    run('yarn run start', {
      ...defaultGulpRunOptions,
      cwd: path.join(FRONTEND_FOLDER,'dashboard'),
    }),
  ),
);

gulp.task(
  'develop-dashboard',
  gulp.parallel(
    copyNodeModulePackages,
    run('dotnet run'),
    run('yarn run start', {
      ...defaultGulpRunOptions,
      cwd: path.join(FRONTEND_FOLDER,'dashboard'),
    }),
  ),
);

gulp.task(
  'install-react-app-dependencies',
  gulp.series(
    run('yarn --immutable', {
      ...defaultGulpRunOptions,
      cwd: FRONTEND_FOLDER,
    }),
  ),
);

gulp.task(
  'default',
  gulp.series([
    run('yarn run build', {
      ...defaultGulpRunOptions,
      cwd: FRONTEND_FOLDER,
    }),
    'copy-files',
  ]),
);
