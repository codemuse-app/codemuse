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
exports.inferTsconfig = exports.noJsConfig = exports.allowJsConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * To limit the risk of making the `inferTsconfig` run for a very long time, we
 * stop the file traversal after visiting this number of files.
 */
const maximumFileTraversalCount = 1000;
/** The TS config we use to index JavaScript files. */
exports.allowJsConfig = '{"compilerOptions":{"allowJs":true}}';
/** The TS config we use to index only TypeScript files. */
exports.noJsConfig = '{}';
/**
 * Returns the configuration that should be used for tsconfig.json in the provided path.
 *
 * If the directory contains at least one `*.{ts,tsx}` file then the config will be empty (`{}`).
 * If the directory doesn't contains one `*.{ts,tsx}` file then the config will
 */
function inferTsconfig(projectPath) {
    let hasTypeScriptFile = false;
    let hasJavaScriptFile = false;
    let visitedFileCount = 0;
    const visitPath = (directory) => {
        if (directory.endsWith('.ts') || directory.endsWith('.tsx')) {
            hasTypeScriptFile = true;
            return { stop: true };
        }
        if (directory.endsWith('.js') || directory.endsWith('.jsx')) {
            hasJavaScriptFile = true;
        }
        if (!fs.statSync(directory).isDirectory()) {
            return { stop: false };
        }
        for (const child of fs.readdirSync(directory)) {
            visitedFileCount++;
            if (visitedFileCount > maximumFileTraversalCount) {
                return { stop: true };
            }
            const fullPath = path.resolve(directory, child);
            const recursiveWalk = visitPath(fullPath);
            if (recursiveWalk.stop) {
                return recursiveWalk;
            }
        }
        return { stop: false };
    };
    visitPath(projectPath);
    if (hasTypeScriptFile || !hasJavaScriptFile) {
        return exports.noJsConfig;
    }
    return exports.allowJsConfig;
}
exports.inferTsconfig = inferTsconfig;
