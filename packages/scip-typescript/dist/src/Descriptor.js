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
exports.descriptorString = exports.typeParameterDescriptor = exports.parameterDescriptor = exports.methodDescriptor = exports.metaDescriptor = exports.termDescriptor = exports.typeDescriptor = exports.packageDescriptor = void 0;
const scip = __importStar(require("./scip"));
const Descriptor = scip.scip.Descriptor;
const Suffix = scip.scip.Descriptor.Suffix;
function packageDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Package });
}
exports.packageDescriptor = packageDescriptor;
function typeDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Type });
}
exports.typeDescriptor = typeDescriptor;
function termDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Term });
}
exports.termDescriptor = termDescriptor;
function metaDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Meta });
}
exports.metaDescriptor = metaDescriptor;
function methodDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Method });
}
exports.methodDescriptor = methodDescriptor;
function parameterDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.Parameter });
}
exports.parameterDescriptor = parameterDescriptor;
function typeParameterDescriptor(name) {
    return new Descriptor({ name, suffix: Suffix.TypeParameter });
}
exports.typeParameterDescriptor = typeParameterDescriptor;
function descriptorString(desc) {
    switch (desc.suffix) {
        case Suffix.Package:
            return escapedName(desc) + '/';
        case Suffix.Type:
            return escapedName(desc) + '#';
        case Suffix.Term:
            return escapedName(desc) + '.';
        case Suffix.Meta:
            return escapedName(desc) + ':';
        case Suffix.Method:
            return escapedName(desc) + '(' + (desc.disambiguator || '') + ').';
        case Suffix.Parameter:
            return '(' + escapedName(desc) + ')';
        case Suffix.TypeParameter:
            return '[' + escapedName(desc) + ']';
        default:
            throw new Error(`unknown descriptor suffix: ${desc.suffix}`);
    }
}
exports.descriptorString = descriptorString;
function escapedName(desc) {
    if (!desc.name) {
        return '';
    }
    if (isSimpleIdentifier(desc.name)) {
        return desc.name;
    }
    return '`' + desc.name.replace(/`/g, '``') + '`';
}
// Returns true if this name does not need to be backtick escaped
function isSimpleIdentifier(name) {
    return /^[\w$+-]+$/i.test(name);
}
