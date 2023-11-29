const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({ files: '**/test/**/*.test.ts' });