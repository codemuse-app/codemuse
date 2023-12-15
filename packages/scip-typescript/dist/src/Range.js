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
exports.Range = void 0;
const ts = __importStar(require("typescript"));
const Position_1 = require("./Position");
class Range {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    compare(other) {
        const byStart = this.start.compare(other.start);
        if (byStart !== 0) {
            return byStart;
        }
        return this.end.compare(other.end);
    }
    toLsif() {
        if (this.isSingleLine()) {
            return [this.start.line, this.start.character, this.end.character];
        }
        return [
            this.start.line,
            this.start.character,
            this.end.line,
            this.end.character,
        ];
    }
    static fromLsif(range) {
        const endLine = range.length === 3 ? range[0] : range[2];
        const endCharacter = range.length === 3 ? range[2] : range[3];
        return new Range(new Position_1.Position(range[0], range[1]), new Position_1.Position(endLine, endCharacter));
    }
    static fromNode(node) {
        var _a;
        const sourceFile = node.getSourceFile();
        const rangeNode = ts.isConstructorDeclaration(node)
            ? (_a = node.getFirstToken()) !== null && _a !== void 0 ? _a : node
            : node;
        const start = sourceFile.getLineAndCharacterOfPosition(rangeNode.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(rangeNode.getEnd());
        return new Range(new Position_1.Position(start.line, start.character), new Position_1.Position(end.line, end.character));
    }
    isSingleLine() {
        return this.start.line === this.end.line;
    }
}
exports.Range = Range;
