"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainCommand = void 0;
const commander_1 = require("commander");
const package_json_1 = __importDefault(require("../package.json"));
const parseHumanByteSizeIntoNumber_1 = require("./parseHumanByteSizeIntoNumber");
function mainCommand(indexAction) {
    const command = new commander_1.Command();
    command
        .name('scip-typescript')
        .version(package_json_1.default.version)
        .description('SCIP indexer for TypeScript and JavaScript\nFor usage examples, see https://github.com/sourcegraph/scip-typescript/blob/main/README.md');
    command
        .command('index')
        .option('--cwd <path>', 'the working directory', process.cwd())
        .option('--pnpm-workspaces', 'whether to index all pnpm workspaces', false)
        .option('--yarn-workspaces', 'whether to index all yarn workspaces', false)
        .option('--yarn-berry-workspaces', '(deprecated) use --yarn-workspaces instead', false)
        .option('--infer-tsconfig', "whether to infer the tsconfig.json file, if it's missing", false)
        .option('--output <path>', 'path to the output file', 'index.scip')
        .option('--progress-bar', 'whether to enable a rich progress bar')
        .option('--no-progress-bar', 'whether to disable the rich progress bar')
        .option('--no-global-caches', 'whether to disable global caches between TypeScript projects')
        .option('--max-file-byte-size <value>', 'skip files that have a larger byte size than the provided value. Supported formats: 1kb, 1mb, 1gb.', '1mb')
        .argument('[projects...]')
        .action((parsedProjects, parsedOptions) => {
        var _a;
        const options = parsedOptions;
        // Parse and validate human-provided --max-file-byte-size value
        options.maxFileByteSizeNumber = (0, parseHumanByteSizeIntoNumber_1.parseHumanByteSizeIntoNumber)((_a = options.maxFileByteSize) !== null && _a !== void 0 ? _a : '1mb');
        if (isNaN(options.maxFileByteSizeNumber)) {
            console.error(`invalid byte size '${options.maxFileByteSize}'. To fix this problem, change the value of the flag --max-file-byte-size to use a valid byte size format: 1kb, 1mb, 1gb.`);
            process.exitCode = 1;
            return;
        }
        indexAction(parsedProjects, options);
    });
    return command;
}
exports.mainCommand = mainCommand;
