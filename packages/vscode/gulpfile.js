// @ts-check
// This gulpfile will copy the @sourcegraph/scip-typescript package to the vscode extension so that it can be used.

const gulp = require('gulp');
const fs = require('fs');
const path = require('path');

const clearBinFolder = () => {
  if (fs.existsSync('./bin')) {
    fs.rmdirSync('./bin', { recursive: true });
  }

  fs.mkdirSync('./bin');

  return Promise.resolve();
};

const copyScipTypescript = () => {
  // Find the package.json
  const scipTypescriptPath = path.resolve('../scip-typescript/');

  // Copy all the files in the parent directory of the scip-typescript package, including subdirectories
  return Promise.all([
    gulp.src(`${scipTypescriptPath}/dist/**/*`).pipe(gulp.dest('./bin/scip-typescript/dist')),
    gulp.src(`${scipTypescriptPath}/package.json`).pipe(gulp.dest('./bin/scip-typescript/'))
  ]);
};

const copyScipPython = () => {
  // Find the package.json
  const scipPythonPath = path.resolve('../scip-python/packages/pyright-scip/');

  // Copy all the files in the parent directory of the scip-python package, including subdirectories
  return Promise.all([
    gulp.src(`${scipPythonPath}/dist/**/*`).pipe(gulp.dest('./bin/scip-python/dist')),
    gulp.src(`${scipPythonPath}/index.js`).pipe(gulp.dest('./bin/scip-python/'))]);
};

const copyExternalLibs = gulp.parallel(
  copyScipTypescript,
  copyScipPython
);

module.exports = {
  default: gulp.series(clearBinFolder, copyExternalLibs)
};
