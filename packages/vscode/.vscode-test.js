const { defineConfig } = require('@vscode/test-cli');

process.env.VSCODE_EXECUTABLE_PATH = '../vscode/.vscode-test/vscode-darwin-arm64-1.84.2/Visual Studio Code.app';

module.exports = defineConfig({ files: 'out/**/test/**/*.test.js' });
