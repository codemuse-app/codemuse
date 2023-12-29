import { execFile } from "child_process";
import { join, resolve } from "path";
import { promisify } from "util";
import { execSync } from "child_process";
import * as path from "path";
import * as Sentry from "@sentry/browser";

import { LanguageProvider } from "../provider";
import { writeFile } from "fs";
import { isBundled } from "../../../shared/utils";
import { glob } from "glob";
import { norm } from "../../utils/path";

const execFileAsync = promisify(execFile);
const writeFileAsync = promisify(writeFile);

const validExtensions = new Set([".py", ".pyi"]);

class PythonPackage {
  constructor(
    public name: string,
    public version: string,
    public files: string[]
  ) {}

  static fromPipShow(output: string): PythonPackage {
    let name = "";
    let version = "";
    let files: string[] = [];

    let gettingFiles = false;
    for (let line of output.split("\n")) {
      line = line.trim();
      if (!line) {
        continue;
      }

      let split = line.split(":", 2).map((x) => x.trim());
      if (split.length === 2) {
        switch (split[0]) {
          case "Name":
            name = split[1];
            break;
          // @ts-expect-error fallthrough
          case "Version":
            version = split[1];
          case "Files":
            gettingFiles = true;
        }
      } else {
        if (!gettingFiles) {
          throw new Error("Unexpected output from pip show");
        }

        // Skip cached or out of project rfiles
        if (line.startsWith("..") || line.includes("__pycache__")) {
          continue;
        }

        // Only include extensions that we care about
        if (!validExtensions.has(path.extname(line))) {
          continue;
        }

        files.push(line);
      }
    }

    return new PythonPackage(name, version, files);
  }
}

export class Python extends LanguageProvider {
  languageId = "python" as const;

  private async getPythonPath(cwd: string) {
    const getPythonSpan = Sentry.getActiveSpan()?.startChild({
      op: "function",
      name: "getPythonPath",
    });

    // Detect the presence of the python extension, if it is installed use its global python path (for the workspace)

    let pythonExtension;
    let vscode;

    try {
      vscode = await import("vscode");
      pythonExtension = vscode.extensions.getExtension("ms-python.python");
    } catch (e) {
      // Ignore
      console.error(e);
    }

    if (vscode && pythonExtension) {
      try {
        const pythonPath =
          await pythonExtension.exports.settings.getExecutionDetails(
            vscode.Uri.file("")
          );

        if (pythonPath?.execCommand?.length > 0) {
          getPythonSpan?.finish();
          return pythonPath.execCommand[0];
        }
      } catch (e) {
        console.error(e);
      }
    }

    try {
      // If the python extension is not installed, try calling pipenv
      const pipenvPath = execSync("which pipenv", {
        encoding: "utf-8",
        cwd,
      }).trim();

      // If pipenv is installed, use it to get the python path
      if (pipenvPath) {
        const pythonPath = execSync(`${pipenvPath} --py`, {
          encoding: "utf-8",
          cwd,
        })
          .trim()
          .replace("\n", "");

        getPythonSpan?.finish();

        return pythonPath;
      }
    } catch (e) {}

    try {
      // If pipenv is not installed, try calling poetry
      const poetryPath = execSync("which poetry", {
        encoding: "utf-8",
        cwd,
      }).trim();

      // If poetry is installed, use it to get the python path
      if (poetryPath) {
        const pythonPath = execSync(`${poetryPath} run which python`, {
          encoding: "utf-8",
          cwd,
        }).trim();

        getPythonSpan?.finish();

        return pythonPath;
      }
    } catch (e) {}

    try {
      const pythonPath = execSync("which python", {
        encoding: "utf-8",
        cwd,
      }).trim();

      getPythonSpan?.finish();

      return pythonPath;
    } catch (e) {}

    try {
      // Try with python3
      const pythonPath = execSync("which python3", {
        encoding: "utf-8",
        cwd,
      }).trim();

      getPythonSpan?.finish();

      return pythonPath;
    } catch (e) {}

    getPythonSpan?.finish();

    // If python is not installed, throw an error
    throw new Error("Python is not installed");
  }

  private async createEnvironment(cwd: string) {
    const createEnvironmentSpan = Sentry.getActiveSpan()?.startChild({
      op: "function",
      name: "createEnvironment",
    });

    const pythonPath = await this.getPythonPath(cwd);

    const packageList = await execFileAsync(
      pythonPath,
      ["-m", "pip", "list", "--format=json"],
      {
        encoding: "utf-8",
        cwd,
        env: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PIPENV_IGNORE_VIRTUALENVS: "1",
        },
        maxBuffer: 1024 * 1024 * 1024,
      }
    );

    packageList.stderr && console.error(packageList.stderr);

    const packages = JSON.parse(packageList.stdout) as {
      name: string;
      version: string;
    }[];

    const packageFileContents = await execFileAsync(
      pythonPath,
      ["-m", "pip", "show", "--files", ...packages.map((pkg) => pkg.name)],
      {
        encoding: "utf-8",
        cwd,
        env: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PIPENV_IGNORE_VIRTUALENVS: "1",
        },
        maxBuffer: 1024 * 1024 * 1024,
      }
    );

    packageFileContents.stderr && console.error(packageFileContents.stderr);

    const files = packageFileContents.stdout
      .toString()
      .trim()
      .split("\n---")
      .filter((output) => output.trim().length > 0)
      .map((output) => PythonPackage.fromPipShow(output));

    // Write the JSON file
    const storagePath = this.getStoragePath(cwd) + "/environment.json";

    await writeFileAsync(storagePath, JSON.stringify(files));

    createEnvironmentSpan?.finish();

    return storagePath;
  }

  async run(cwd: string) {
    const path = resolve(
      __dirname +
        (isBundled()
          ? "../../../bin/scip-python/index.js"
          : "../../../../../bin/scip-python/index.js")
    );

    console.log(path);

    const environmentLocation = await this.createEnvironment(cwd);
    const pythonPath = await this.getPythonPath(cwd);

    let storagePath = this.getStoragePath(cwd);

    storagePath += "/python.scip";

    let result = undefined;

    try {
      result = await execFileAsync(
        `node`,
        [
          norm(path),
          "index",
          cwd,
          "--environment",
          norm(environmentLocation),
          "--cwd",
          cwd,
          "--output",
          storagePath,
          "--project-name",
          cwd.split("/").pop() ?? "",
          "--project-version",
          "indexer",
        ],
        {
          env: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            PATH: pythonPath + ":" + process.env.PATH,
          },
          cwd,
        }
      );
    } catch (err) {
      // @ts-ignore
      err.stderr && Sentry.captureMessage(err.stderr);
      // @ts-ignore
      err.stdout && Sentry.captureMessage(err.stdout);

      Sentry.captureException(err);

      console.log(result?.stdout);
      console.error(result?.stderr);

      return undefined;
    }
    console.log(result?.stdout);
    console.error(result?.stderr);

    return result ? storagePath : undefined;
  }

  async detect(path: string) {
    // List all the files in the path, recursively
    const files = await glob(norm(join(path, "**/*.{py,pyi}")), {
      ignore: [],
    });

    return files.length > 0;
  }
}
