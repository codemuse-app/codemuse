#!/usr/bin/env node
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
exports.indexCommand = exports.main = void 0;
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const os_1 = require("os");
const path = __importStar(require("path"));
const url = __importStar(require("url"));
const ts = __importStar(require("typescript"));
const package_json_1 = __importDefault(require("../package.json"));
const CommandLineOptions_1 = require("./CommandLineOptions");
const inferTsconfig_1 = require("./inferTsconfig");
const ProjectIndexer_1 = require("./ProjectIndexer");
const scip = __importStar(require("./scip"));
function main() {
    (0, CommandLineOptions_1.mainCommand)((projects, options) => indexCommand(projects, options)).parse(process.argv);
    return;
}
exports.main = main;
function indexCommand(projects, options) {
    if (options.yarnWorkspaces) {
        projects.push(...listYarnWorkspaces(options.cwd, 'tryYarn1'));
    }
    else if (options.yarnBerryWorkspaces) {
        projects.push(...listYarnWorkspaces(options.cwd, 'yarn2Plus'));
    }
    else if (options.pnpmWorkspaces) {
        projects.push(...listPnpmWorkspaces(options.cwd));
    }
    else if (projects.length === 0) {
        projects.push(options.cwd);
    }
    options.cwd = makeAbsolutePath(process.cwd(), options.cwd);
    options.output = makeAbsolutePath(options.cwd, options.output);
    if (!options.indexedProjects) {
        options.indexedProjects = new Set();
    }
    const output = fs.openSync(options.output, 'w');
    let documentCount = 0;
    const writeIndex = (index) => {
        documentCount += index.documents.length;
        fs.writeSync(output, index.serializeBinary());
    };
    const cache = {
        sources: new Map(),
        parsedCommandLines: new Map(),
    };
    try {
        writeIndex(new scip.scip.Index({
            metadata: new scip.scip.Metadata({
                project_root: url.pathToFileURL(options.cwd).toString(),
                text_document_encoding: scip.scip.TextEncoding.UTF8,
                tool_info: new scip.scip.ToolInfo({
                    name: 'scip-typescript',
                    version: package_json_1.default.version,
                    arguments: [],
                }),
            }),
        }));
        // NOTE: we may want index these projects in parallel in the future.
        // We need to be careful about which order we index the projects because
        // they can have dependencies.
        for (const projectRoot of projects) {
            const projectDisplayName = projectRoot === '.' ? options.cwd : projectRoot;
            indexSingleProject({
                ...options,
                projectRoot,
                projectDisplayName,
                writeIndex,
            }, cache);
        }
    }
    finally {
        fs.close(output);
        if (documentCount > 0) {
            console.log(`done ${options.output}`);
        }
        else {
            process.exitCode = 1;
            fs.rmSync(options.output);
            const prettyProjects = JSON.stringify(projects);
            console.log(`error: no files got indexed. To fix this problem, make sure that the TypeScript projects ${prettyProjects} contain input files or reference other projects.`);
        }
    }
}
exports.indexCommand = indexCommand;
function makeAbsolutePath(cwd, relativeOrAbsolutePath) {
    if (path.isAbsolute(relativeOrAbsolutePath)) {
        return relativeOrAbsolutePath;
    }
    return path.resolve(cwd, relativeOrAbsolutePath);
}
function indexSingleProject(options, cache) {
    if (options.indexedProjects.has(options.projectRoot)) {
        return;
    }
    options.indexedProjects.add(options.projectRoot);
    let config = ts.parseCommandLine(['-p', options.projectRoot], (relativePath) => path.resolve(options.projectRoot, relativePath));
    let tsconfigFileName;
    if (config.options.project) {
        const projectPath = path.resolve(config.options.project);
        if (ts.sys.directoryExists(projectPath)) {
            tsconfigFileName = path.join(projectPath, 'tsconfig.json');
        }
        else {
            tsconfigFileName = projectPath;
        }
        if (!ts.sys.fileExists(tsconfigFileName)) {
            if (options.inferTsconfig) {
                fs.writeFileSync(tsconfigFileName, (0, inferTsconfig_1.inferTsconfig)(projectPath));
            }
            else {
                console.error(`- ${options.projectDisplayName} (missing tsconfig.json)`);
                return;
            }
        }
        const loadedConfig = loadConfigFile(tsconfigFileName);
        if (loadedConfig !== undefined) {
            config = loadedConfig;
        }
    }
    for (const projectReference of config.projectReferences || []) {
        indexSingleProject({
            ...options,
            projectRoot: projectReference.path,
            projectDisplayName: projectReference.path,
        }, cache);
    }
    if (config.fileNames.length > 0) {
        new ProjectIndexer_1.ProjectIndexer(config, options, cache).index();
    }
}
if (require.main === module) {
    main();
}
function loadConfigFile(file) {
    const absolute = path.resolve(file);
    const readResult = ts.readConfigFile(absolute, path => ts.sys.readFile(path));
    if (readResult.error) {
        throw new Error(ts.formatDiagnostics([readResult.error], ts.createCompilerHost({})));
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = readResult.config;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (config.compilerOptions !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        config.compilerOptions = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...config.compilerOptions,
            ...defaultCompilerOptions(file),
        };
    }
    const basePath = path.dirname(absolute);
    const result = ts.parseJsonConfigFileContent(config, ts.sys, basePath);
    const errors = [];
    for (const error of result.errors) {
        if (error.code === 18003) {
            // Ignore errors about missing 'input' fields, example:
            // > TS18003: No inputs were found in config file 'tsconfig.json'. Specified 'include' paths were '[]' and 'exclude' paths were '["out","node_modules","dist"]'.
            // The reason we ignore this error here is because we report the same
            // error at a higher-level.  It's common to hit on a single TypeScript
            // project with no sources when using the --yarnWorkspaces option.
            // Instead of failing fast at that single project, we only report this
            // error if all projects have no files.
            continue;
        }
        errors.push(error);
    }
    if (errors.length > 0) {
        console.log(ts.formatDiagnostics(errors, ts.createCompilerHost({})));
        return undefined;
    }
    return result;
}
function defaultCompilerOptions(configFileName) {
    const options = 
    // Not a typo, jsconfig.json is a thing https://sourcegraph.com/search?q=context:global+file:jsconfig.json&patternType=literal
    configFileName && path.basename(configFileName) === 'jsconfig.json'
        ? {
            allowJs: true,
            maxNodeModuleJsDepth: 2,
            allowSyntheticDefaultImports: true,
            skipLibCheck: true,
            noEmit: true,
        }
        : {};
    return options;
}
function listPnpmWorkspaces(directory) {
    /**
     * Returns the list of projects formatted as:
     * '/Users/user/sourcegraph/client/web:@sourcegraph/web@1.10.1:PRIVATE',
     *
     * See https://pnpm.io/id/cli/list#--depth-number
     */
    const output = child_process.execSync('pnpm ls -r --depth -1 --long --parseable', {
        cwd: directory,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5, // 5MB
    });
    return output
        .split(os_1.EOL)
        .filter(project => project.includes(':'))
        .map(project => project.split(':')[0]);
}
function listYarnWorkspaces(directory, yarnVersion) {
    const runYarn = (cmd) => child_process.execSync(cmd, {
        cwd: directory,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5, // 5MB
    });
    const result = [];
    const yarn1WorkspaceInfo = () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const json = JSON.parse(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        JSON.parse(runYarn('yarn --silent --json workspaces info')).data);
        for (const key of Object.keys(json)) {
            const location = 'location';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (json[key][location] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                result.push(path.join(directory, json[key][location]));
            }
        }
    };
    const yarn2PlusWorkspaceInfo = () => {
        const jsonLines = runYarn('yarn --json workspaces list').split(/\r?\n|\r|\n/g);
        for (let line of jsonLines) {
            line = line.trim();
            if (line.length === 0) {
                continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const json = JSON.parse(line);
            if ('location' in json) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                result.push(path.join(directory, json.location));
            }
        }
    };
    if (yarnVersion === 'tryYarn1') {
        try {
            yarn2PlusWorkspaceInfo();
        }
        catch {
            yarn1WorkspaceInfo();
        }
    }
    else {
        yarn2PlusWorkspaceInfo();
    }
    return result;
}
