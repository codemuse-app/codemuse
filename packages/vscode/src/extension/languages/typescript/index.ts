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

    const files = await this.getParsableFiles();

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
      // ...existingTsConfig,
      // TODO: issue with extending other configs??
      // extends: undefined,
      include: [
        // ...(existingTsConfig.include || []),
        files,
      ].flat(),
      exclude: [
        "**/node_modules/**",
        //...(existingTsConfig.exclude || []),
      ],
    };

    let storagePath = this.getStoragePath(cwd);
    storagePath += "/ts.scip";

    try {
      if (existsSync(tsconfigPath)) {
        if (!existsSync(tsBackupPath)) {
          writeFileSync(tsBackupPath, readFileSync(tsconfigPath));
        }

        rmSync(tsconfigPath);

        cleanUpTsconfig = true;
      }

      writeFileSync(tsconfigPath, JSON.stringify(targetTsConfig, null, 2));

      const result = await execFileAsync(
        `node`,
        [
          "--max-old-space-size",
          "8192",
          path,
          "index",
          "--output",
          storagePath,
        ],
        {
          cwd,
        }
      );

      console.log(result.stdout);
      console.log(result.stderr);
    } catch (e) {
      console.error(e);

      // @ts-ignore
      if (e && e.stdout) {
        // @ts-ignore
        Sentry.captureMessage(e.stdout);
      }

      // @ts-ignore
      if (e && e.stderr) {
        // @ts-ignore
        Sentry.captureMessage(e.stderr);
      }

      Sentry.captureException(e);

      return undefined;
    } finally {
      if (cleanUpTsconfig) {
        rmSync(tsconfigPath);
        writeFileSync(tsconfigPath, readFileSync(tsBackupPath));
        rmSync(tsBackupPath);
      } else {
        rmSync(tsconfigPath);
      }
    }

    return storagePath;
  }

  private async getParsableFiles() {
    const files = await vscode.workspace.findFiles(
      "**/*.{js,jsx,ts,tsx,cjs,mjs}",
      "**/node_modules/**"
    );

    return files
      .map((file) => file.path)
      .filter(
        (path) => !path.includes("node_modules") && !path.includes("dist")
      );
  }

  async detect() {
    // Check if the workspace has any .js, .jsx, .ts, or .tsx files
    const hasJsFiles = await this.getParsableFiles();

    return hasJsFiles.length > 0;
  }
}
