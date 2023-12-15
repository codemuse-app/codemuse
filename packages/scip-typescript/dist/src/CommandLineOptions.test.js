"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const uvu_1 = require("uvu");
const assert = __importStar(require("uvu/assert"));
const CommandLineOptions_1 = require("./CommandLineOptions");
function checkIndexParser(args, expectedOptions, expectedProjects) {
    (0, uvu_1.test)(args.join(' '), () => {
        let isAssertionTriggered = false;
        const actualArguments = ['node', 'scip-typescript.js', 'index', ...args];
        (0, CommandLineOptions_1.mainCommand)((projects, options) => {
            assert.equal(options, { ...options, ...expectedOptions });
            if (expectedProjects) {
                assert.equal(projects, expectedProjects);
            }
            isAssertionTriggered = true;
        }).parse(actualArguments);
        assert.ok(isAssertionTriggered);
    });
}
// defaults
checkIndexParser([], {
    cwd: process.cwd(),
    inferTsconfig: false,
    output: 'index.scip',
    yarnWorkspaces: false,
});
checkIndexParser(['--cwd', 'qux'], { cwd: 'qux' });
checkIndexParser(['--yarn-workspaces'], { yarnWorkspaces: true });
checkIndexParser(['--pnpm-workspaces'], { pnpmWorkspaces: true });
checkIndexParser(['--infer-tsconfig'], { inferTsconfig: true });
checkIndexParser(['--no-progress-bar'], { progressBar: false });
checkIndexParser(['--progress-bar'], { progressBar: true });
checkIndexParser(['--no-global-caches'], { globalCaches: false });
