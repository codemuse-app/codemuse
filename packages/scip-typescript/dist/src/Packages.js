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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Packages = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const Descriptor_1 = require("./Descriptor");
const ScipSymbol_1 = require("./ScipSymbol");
class Packages {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.cache = new Map();
    }
    symbol(filePath) {
        if (path_1.default.normalize(filePath) !== filePath) {
            throw new Error(`unexpected error: path.normalize('${filePath}') !== ${filePath}`);
        }
        const fromCache = this.cache.get(filePath);
        if (fromCache) {
            return fromCache;
        }
        const packageJsonPath = path_1.default.join(filePath, 'package.json');
        try {
            if (fs.existsSync(packageJsonPath) &&
                fs.lstatSync(packageJsonPath).isFile()) {
                const packageJsonText = fs.readFileSync(packageJsonPath).toString();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const packageJson = JSON.parse(packageJsonText);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const name = packageJson.name;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const version = packageJson.version;
                if (typeof name === 'string' && typeof version === 'string') {
                    return this.cached(filePath, ScipSymbol_1.ScipSymbol.package(name, version));
                }
                if (typeof name === 'string') {
                    // The version field is missing so we fallback to `"HEAD"`
                    return this.cached(filePath, ScipSymbol_1.ScipSymbol.package(name, 'HEAD'));
                }
                // Fallback to an anonymous package because we found a package.json but
                // were unable to parse the name and version.
                return this.cached(filePath, ScipSymbol_1.ScipSymbol.anonymousPackage());
            }
        }
        catch (error) {
            console.error(`error parsing ${packageJsonPath}`, error);
            return this.cached(filePath, ScipSymbol_1.ScipSymbol.anonymousPackage());
        }
        if (filePath === this.projectRoot) {
            // Don't look for package.json in a parent directory of the root.
            return this.cached(filePath, ScipSymbol_1.ScipSymbol.anonymousPackage());
        }
        const dirname = path_1.default.dirname(filePath);
        if (dirname === filePath) {
            // Avoid infinite recursion when `path.dirname(path) === path`
            return this.cached(filePath, ScipSymbol_1.ScipSymbol.anonymousPackage());
        }
        const owner = this.symbol(dirname);
        return this.cached(filePath, ScipSymbol_1.ScipSymbol.global(owner, (0, Descriptor_1.packageDescriptor)(path_1.default.basename(filePath))));
    }
    cached(filePath, sym) {
        this.cache.set(filePath, sym);
        return sym;
    }
}
exports.Packages = Packages;
