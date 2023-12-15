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
const fs = __importStar(require("fs"));
const path_1 = require("path");
const path = __importStar(require("path"));
const process = __importStar(require("process"));
const Diff = __importStar(require("diff"));
const uvu_1 = require("uvu");
const Input_1 = require("./Input");
const main_1 = require("./main");
const scip = __importStar(require("./scip"));
const SnapshotTesting_1 = require("./SnapshotTesting");
function isUpdateSnapshot() {
    return process.argv.includes('--update-snapshots');
}
const snapshotNodeModules = (0, path_1.join)(process.cwd(), 'snapshots', 'node_modules');
if (!fs.existsSync(snapshotNodeModules)) {
    throw new Error(`no such file: ${snapshotNodeModules} (to fix this problem, run 'yarn install' in the snapshots/ directory)`);
}
const inputDirectory = (0, path_1.join)(process.cwd(), 'snapshots', 'input');
const outputDirectory = (0, path_1.join)(process.cwd(), 'snapshots', 'output');
const snapshotDirectories = fs.readdirSync(inputDirectory);
const isUpdate = isUpdateSnapshot();
if (isUpdate && fs.existsSync(outputDirectory)) {
    fs.rmSync(outputDirectory, { recursive: true });
}
for (const snapshotDirectory of snapshotDirectories) {
    // Uncomment below if you want to skip certain tests for local development.
    // if (!snapshotDirectory.includes('syntax')) {
    //   continue
    // }
    const inputRoot = (0, path_1.join)(inputDirectory, snapshotDirectory);
    const outputRoot = (0, path_1.join)(outputDirectory, snapshotDirectory);
    if (!fs.statSync(inputRoot).isDirectory()) {
        continue;
    }
    (0, uvu_1.test)(snapshotDirectory, () => {
        var _a;
        const packageJsonPath = path.join(inputRoot, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());
        const tsconfigJsonPath = path.join(inputRoot, 'tsconfig.json');
        const inferTsconfig = !fs.existsSync(tsconfigJsonPath);
        const output = path.join(inputRoot, 'index.scip');
        (0, main_1.indexCommand)([], {
            cwd: inputRoot,
            inferTsconfig,
            output,
            yarnWorkspaces: Boolean(packageJson.workspaces),
            yarnBerryWorkspaces: false,
            pnpmWorkspaces: Boolean((_a = packageJson.packageManager) === null || _a === void 0 ? void 0 : _a.includes('pnpm')),
            progressBar: false,
            indexedProjects: new Set(),
            globalCaches: true,
        });
        if (inferTsconfig) {
            fs.rmSync(tsconfigJsonPath);
        }
        const index = scip.scip.Index.deserializeBinary(fs.readFileSync(path.join(inputRoot, 'index.scip')));
        fs.mkdirSync(outputRoot, { recursive: true });
        fs.renameSync(output, path.join(outputRoot, 'index.scip'));
        if (index.documents.length === 0) {
            throw new Error('empty LSIF index');
        }
        for (const document of index.documents) {
            const inputPath = path.join(inputRoot, document.relative_path);
            const relativeToInputDirectory = path.relative(inputDirectory, inputPath);
            const outputPath = path.resolve(outputDirectory, relativeToInputDirectory);
            const expected = fs.existsSync(outputPath)
                ? fs.readFileSync(outputPath).toString()
                : '';
            const input = Input_1.Input.fromFile(inputPath);
            const obtained = (0, SnapshotTesting_1.formatSnapshot)(input, document);
            if (obtained === expected) {
                // Test passed
                continue;
            }
            if (isUpdate) {
                // Update the snapshot test to reflect the new behavior
                fs.mkdirSync(path.dirname(outputPath), {
                    recursive: true,
                });
                fs.writeFileSync(outputPath, obtained);
                console.log(`updated snapshot: ${outputPath}`);
            }
            else {
                // Fail the test with a diff error message
                const patch = Diff.createTwoFilesPatch(outputPath, outputPath, expected, obtained, '(what the snapshot tests expect)', "(what the current code produces). Run the command 'npm run update-snapshots' to accept the new behavior.");
                throw new Error(patch);
            }
        }
    });
}
uvu_1.test.run();
