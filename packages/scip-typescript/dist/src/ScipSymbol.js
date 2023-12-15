"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScipSymbol = void 0;
const Descriptor_1 = require("./Descriptor");
class ScipSymbol {
    constructor(value) {
        this.value = value;
    }
    isEmpty() {
        return this.value === '';
    }
    isLocal() {
        return this.value.startsWith('local ');
    }
    static local(counter) {
        return new ScipSymbol(`local ${counter}`);
    }
    static empty() {
        return new ScipSymbol('');
    }
    static package(name, version) {
        return new ScipSymbol(`scip-typescript npm ${name} ${version} `);
    }
    static anonymousPackage() {
        return ScipSymbol.package('.', '.');
    }
    static global(owner, descriptor) {
        return new ScipSymbol(owner.value + (0, Descriptor_1.descriptorString)(descriptor));
    }
}
exports.ScipSymbol = ScipSymbol;
