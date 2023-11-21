// @ts-check
// This gulpfile will copy the @sourcegraph/scip-typescript package to the vscode extension so that it can be used.

const gulp = require('gulp');
const fs = require('fs');

const clearBinFolder = () => {
  if (fs.existsSync('./bin')) {
    fs.rmdirSync('./bin', { recursive: true });
  }

  fs.mkdirSync('./bin');

  return Promise.resolve();
};

const copyScipTypescript = () => {
  // Find the package.json
  const scipTypescriptPath = require.resolve('@sourcegraph/scip-typescript/package.json');

  // Copy all the files in the parent directory of the scip-typescript package, including subdirectories
  return gulp.src(`${scipTypescriptPath}/../**/*`).pipe(gulp.dest('./bin/scip-typescript'));
};

const copyScipPython = () => {
  // Find the package.json
  const scipPythonPath = require.resolve('@sourcegraph/scip-python/package.json');

  // Copy all the files in the parent directory of the scip-python package, including subdirectories
  return gulp.src(`${scipPythonPath}/../**/*`).pipe(gulp.dest('./bin/scip-python'));
};

const copyExternalLibs = gulp.parallel(copyScipTypescript, copyScipPython);

module.exports = {
  default: gulp.series(clearBinFolder, copyExternalLibs)
};
