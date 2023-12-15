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
exports.ProjectIndexer = void 0;
const path = __importStar(require("path"));
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const progress_1 = __importDefault(require("progress"));
const ts = __importStar(require("typescript"));
const FileIndexer_1 = require("./FileIndexer");
const Input_1 = require("./Input");
const Packages_1 = require("./Packages");
const scip = __importStar(require("./scip"));
function createCompilerHost(cache, compilerOptions, projectOptions) {
    const host = ts.createCompilerHost(compilerOptions);
    if (!projectOptions.globalCaches) {
        return host;
    }
    const hostCopy = { ...host };
    host.getParsedCommandLine = (fileName) => {
        if (!hostCopy.getParsedCommandLine) {
            return undefined;
        }
        const fromCache = cache.parsedCommandLines.get(fileName);
        if (fromCache !== undefined) {
            return fromCache;
        }
        const result = hostCopy.getParsedCommandLine(fileName);
        if (result !== undefined) {
            // Don't cache undefined results even if they could be cached
            // theoretically. The big performance gains from this cache come from
            // caching non-undefined results.
            cache.parsedCommandLines.set(fileName, result);
        }
        return result;
    };
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        const fromCache = cache.sources.get(fileName);
        if (fromCache !== undefined) {
            const [sourceFile, cachedLanguageVersion] = fromCache;
            if (isSameLanguageVersion(languageVersion, cachedLanguageVersion)) {
                return sourceFile;
            }
        }
        const result = hostCopy.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (result !== undefined) {
            // Don't cache undefined results even if they could be cached
            // theoretically. The big performance gains from this cache come from
            // caching non-undefined results.
            cache.sources.set(fileName, [result, languageVersion]);
        }
        return result;
    };
    return host;
}
class ProjectIndexer {
    constructor(config, options, cache) {
        this.config = config;
        this.options = options;
        this.symbolCache = new Map();
        this.hasConstructor = new Map();
        const host = createCompilerHost(cache, config.options, options);
        this.program = ts.createProgram(config.fileNames, config.options, host);
        this.checker = this.program.getTypeChecker();
        this.packages = new Packages_1.Packages(options.projectRoot);
    }
    index() {
        const startTimestamp = Date.now();
        const sourceFiles = this.program.getSourceFiles();
        const filesToIndex = [];
        // Visit every sourceFile in the program
        for (const sourceFile of sourceFiles) {
            const includes = this.config.fileNames.includes(sourceFile.fileName);
            if (!includes) {
                continue;
            }
            filesToIndex.push(sourceFile);
        }
        if (filesToIndex.length === 0) {
            throw new Error(`no indexable files in project '${this.options.projectDisplayName}'`);
        }
        const jobs = !this.options.progressBar
            ? undefined
            : new progress_1.default(`  ${this.options.projectDisplayName} [:bar] :current/:total :title`, {
                total: filesToIndex.length,
                renderThrottle: 100,
                incomplete: '_',
                complete: '#',
                width: 20,
                clear: true,
                stream: process.stderr,
            });
        let lastWrite = startTimestamp;
        for (const [index, sourceFile] of filesToIndex.entries()) {
            const title = path.relative(this.options.cwd, sourceFile.fileName);
            jobs === null || jobs === void 0 ? void 0 : jobs.tick({ title });
            if (!this.options.progressBar) {
                const now = Date.now();
                const elapsed = now - lastWrite;
                if (elapsed > 1000 && index > 2) {
                    lastWrite = now;
                    process.stdout.write('.');
                }
            }
            const document = new scip.scip.Document({
                relative_path: path.relative(this.options.cwd, sourceFile.fileName),
                occurrences: [],
            });
            const input = new Input_1.Input(sourceFile.fileName, sourceFile.getText());
            const visitor = new FileIndexer_1.FileIndexer(this.checker, this.options, input, document, this.symbolCache, this.hasConstructor, this.packages, sourceFile);
            try {
                visitor.index();
            }
            catch (error) {
                console.error(`unexpected error indexing project root '${this.options.cwd}'`, error);
            }
            if (visitor.document.occurrences.length > 0) {
                this.options.writeIndex(new scip.scip.Index({
                    documents: [visitor.document],
                }));
            }
        }
        jobs === null || jobs === void 0 ? void 0 : jobs.terminate();
        const elapsed = Date.now() - startTimestamp;
        if (!this.options.progressBar && lastWrite > startTimestamp) {
            process.stdout.write('\n');
        }
        console.log(`+ ${this.options.projectDisplayName} (${(0, pretty_ms_1.default)(elapsed)})`);
    }
}
exports.ProjectIndexer = ProjectIndexer;
function isSameLanguageVersion(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
        return a === b;
    }
    if (typeof a === 'number' || typeof b === 'number') {
        // Different shape: one is ts.ScriptTarget, the other is
        // ts.CreateSourceFileOptions
        return false;
    }
    return (a.languageVersion === b.languageVersion &&
        a.impliedNodeFormat === b.impliedNodeFormat
    // Ignore setExternalModuleIndicator even if that increases the risk of a
    // false positive. A local experiment revealed that we never get a cache hit
    // if we compare setExternalModuleIndicator since it's function with a
    // unique reference on every `CompilerHost.getSourceFile` callback.
    );
}
