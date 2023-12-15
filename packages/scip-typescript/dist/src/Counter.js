"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
class Counter {
    constructor() {
        this.n = -1;
    }
    next() {
        this.n++;
        return this.n;
    }
}
exports.Counter = Counter;
