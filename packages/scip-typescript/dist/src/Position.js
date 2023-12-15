"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = void 0;
class Position {
    /**
     * @param line 0-based line number
     * @param character  0-based character (or column) number
     */
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
    compare(other) {
        if (this.line !== other.line) {
            return this.line - other.line;
        }
        return this.character - other.character;
    }
}
exports.Position = Position;
