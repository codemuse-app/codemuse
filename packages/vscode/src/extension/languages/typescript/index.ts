import * as vscode from "vscode";
import { execFile } from "child_process";
import { resolve } from "path";
import { writeFileSync, existsSync, rmSync } from "fs";
import { promisify } from "util";

import { LanguageProvider } from "../provider";

const execFileAsync = promisify(execFile);

export class Typescript extends LanguageProvider {
  languageId = "typescript" as const;

  async run(cwd: string) {
    const path = resolve(
      __dirname + "../../../bin/scip-typescript/dist/src/main.js"
    );

    console.log(path);

    // Check if the path contains a tsconfig.json file. If it doesn't, write {"compilerOptions":{"allowJs":true}}
    const tsconfigPath = resolve(cwd, "tsconfig.json");

    let cleanUpTsconfig = false;

    if (!existsSync(tsconfigPath)) {
      cleanUpTsconfig = true;

      const files = await vscode.workspace.findFiles(
        "**/*.{js,jsx,ts,tsx}",
        "**/node_modules/**"
      );

      writeFileSync(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              allowJs: true,
            },
            include: files.map((file) => file.path),
          },
          null,
          2
        )
      );
    }

    let storagePath = this.getStoragePath(cwd);

    storagePath += "/ts.scip";

    const result = await execFileAsync(
      `node`,
      [path, "index", "--infer-tsconfig", "--output", storagePath],
      {
        cwd,
      }
    );

    if (cleanUpTsconfig) {
      rmSync(tsconfigPath);
    }

    console.log(result.stdout);
    console.log(result.stderr);

    return storagePath;
  }

  async detect() {
    // Check if the workspace has any .js, .jsx, .ts, or .tsx files
    const hasJsFiles = await vscode.workspace.findFiles(
      "**/*.{js,jsx,ts,tsx}",
      "**/node_modules/**"
    );

    return hasJsFiles.length > 0;
  }
}
