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
exports.Input = void 0;
const fs = __importStar(require("fs"));
class Input {
    constructor(path, text) {
        this.path = path;
        this.text = text;
        this.lines = text.split('\n');
    }
    static fromFile(path) {
        return new Input(path, fs.readFileSync(path).toString());
    }
    /**
     * For debugingg purposes, formats the source file with carets ^ to underline
     * the range. For example, when given the range enclosing the `hello`
     * identifier.
     * ```
     * src/hello.ts:LINE:CHARACTER
     * const hello = 42
     *       ^^^^^
     * ```
     *
     * @param range the range to highlight
     * @param diagnostic optional message to include with the formatted string
     */
    format(range, diagnostic) {
        const line = this.lines[range.start.line];
        const indent = ' '.repeat(range.start.character);
        const length = range.isSingleLine()
            ? range.end.character - range.start.character
            : line.length - range.start.character;
        const carets = length < 0 ? '<negative length>' : '^'.repeat(length);
        const multilineSuffix = !range.isSingleLine()
            ? ` ${range.end.line}:${range.end.character}`
            : '';
        const message = diagnostic ? ' ' + diagnostic : '';
        return `${this.path}:${range.start.line}:${range.start.character}${message}\n${line}\n${indent}${carets}${multilineSuffix}`;
    }
    log(range) {
        console.log(this.format(range));
    }
}
exports.Input = Input;
