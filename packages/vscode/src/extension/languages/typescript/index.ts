import { execFile } from "child_process";
import { join, normalize, resolve } from "path";
import { writeFileSync, existsSync, rmSync, readFileSync, rm } from "fs";
import { promisify } from "util";
import * as Sentry from "@sentry/browser";

import { LanguageProvider } from "../provider";
import { isBundled } from "../../../shared/utils";
import { glob } from "glob";
import { norm } from "../../utils/path";

const execFileAsync = promisify(execFile);

export class Typescript extends LanguageProvider {
  languageId = "typescript" as const;

  async run(cwd: string) {
    const path = resolve(
      __dirname +
        (isBundled()
          ? "../../../bin/scip-typescript/dist/main.js"
          : "../../../../../bin/scip-typescript/dist/main.js")
    );

    const files = await this.getParsableFiles(cwd);

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
      compilerOptions: { allowJs: true },
      include: [
        // ...(existingTsConfig.include || []),
        files,
      ].flat().map((file) => normalize(file)),
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
        [norm(path), "index", "--output", storagePath],
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

  private async getParsableFiles(path: string) {
    // List all the files in the path, recursively
    const files = await glob(norm(join(path, "**/*.{ts,tsx,js,jsx}")), {
      ignore: ["**/node_modules/**", "**/dist/**", "**/bin/**"],
    });

    return files;
  }

  async detect(path: string) {
    // Check if the workspace has any .js, .jsx, .ts, or .tsx files
    const hasJsFiles = await this.getParsableFiles(path);

    return hasJsFiles.length > 0;
  }
}
