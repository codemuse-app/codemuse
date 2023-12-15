import * as vscode from "vscode";
import { execFile } from "child_process";
import { resolve } from "path";
import { writeFileSync, existsSync, rmSync, readFileSync, rm } from "fs";
import { promisify } from "util";
import * as Sentry from "@sentry/browser";

import { LanguageProvider } from "../provider";

const execFileAsync = promisify(execFile);

export class Typescript extends LanguageProvider {
  languageId = "typescript" as const;

  async run(cwd: string) {
    const path = resolve(
      __dirname + "../../../bin/scip-typescript/dist/main.js"
    );

    console.log(path);

    const files = await vscode.workspace.findFiles(
      "**/*.{js,jsx,ts,tsx}",
      "**/node_modules/**"
    );

    // Check if the path contains a tsconfig.json file. If it doesn't, write {"compilerOptions":{"allowJs":true}}
    const tsconfigPath = resolve(cwd, "tsconfig.json");
    const tsBackupPath = resolve(cwd, "tsconfig.json.codemusebackup");

    let existingTsConfig = {
      compilerOptions: {
        allowJs: true,
      },
      include: [],
      exclude: [],
    };

    let cleanUpTsconfig = false;

    try {
      const existingContents = readFileSync(tsconfigPath);
      existingTsConfig = JSON.parse(existingContents.toString());
    } catch (e) {}

    const targetTsConfig = {
      ...existingTsConfig,
      // TODO: issue with extending other configs??
      extends: undefined,
      include: [
        ...(existingTsConfig.include || []),
        files.map((file) => file.path),
      ].flat(),
      exclude: [...(existingTsConfig.exclude || []), "**/node_modules/**"],
    };

    let storagePath = this.getStoragePath(cwd);
    storagePath += "/ts.scip";

    try {
      if (existsSync(tsconfigPath)) {
        writeFileSync(tsBackupPath, readFileSync(tsconfigPath));
        rmSync(tsconfigPath);

        cleanUpTsconfig = true;
      }

      writeFileSync(tsconfigPath, JSON.stringify(targetTsConfig, null, 2));

      const result = await execFileAsync(
        `node`,
        [path, "index", "--output", storagePath],
        {
          cwd,
        }
      );

      console.log(result.stdout);
      console.log(result.stderr);
    } catch (e) {
      console.error(e);

      Sentry.captureException(e);
    } finally {
      if (cleanUpTsconfig) {
        rmSync(tsconfigPath);
        writeFileSync(tsconfigPath, readFileSync(tsBackupPath));
        rmSync(tsBackupPath);
      } else {
        rmSync(tsBackupPath);
      }
    }

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
