import * as vscode from "vscode";
import { execFile } from "child_process";
import { resolve } from "path";
import { promisify } from "util";
import { execSync } from "child_process";
import * as path from "path";

import { LanguageProvider } from "../provider";
import { writeFileSync } from "fs";

const execFileAsync = promisify(execFile);

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
    // Detect the presence of the python extension, if it is installed use its global python path (for the workspace)

    let pythonExtension;

    try {
      pythonExtension = vscode.extensions.getExtension("ms-python.python");
    } catch (e) {
      // Ignore
      console.error(e);
    }

    if (pythonExtension) {
      const pythonPath =
        await pythonExtension.exports.settings.getExecutionDetails(
          vscode.Uri.file("")
        );

      if (pythonPath?.execCommand?.length > 0) {
        return pythonPath.execCommand[0];
      }
    }

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
      }).trim();

      return pythonPath;
    }

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

      return pythonPath;
    }

    // If poetry is not installed, try calling python
    const pythonPath = execSync("which python", {
      encoding: "utf-8",
      cwd,
    }).trim();

    // If python is installed, use it to get the python path
    if (pythonPath) {
      return pythonPath;
    } else {
      // If python is not installed, throw an error
      throw new Error("Python is not installed");
    }
  }

  private async createEnvironment(cwd: string) {
    const pythonPath = await this.getPythonPath(cwd);

    const packages = JSON.parse(
      execSync(pythonPath + " -m pip list --format=json", {
        encoding: "utf-8",
        cwd,
        env: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PIPENV_IGNORE_VIRTUALENVS: "1",
        },
      }).trim()
    ) as {
      name: string;
      version: string;
    }[];

    const files = execSync(
      pythonPath +
        " -m pip show --files " +
        packages.map((pkg) => pkg.name).join(" "),
      {
        encoding: "utf-8",
        cwd,
        env: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PIPENV_IGNORE_VIRTUALENVS: "1",
        },
        maxBuffer: 1024 * 1024 * 1024, // 1GB
      }
    )
      .toString()
      .trim()
      .split("\n---")
      .filter((output) => output.trim().length > 0)
      .map((output) => PythonPackage.fromPipShow(output));

    // Write the JSON file
    const storagePath = this.getStoragePath(cwd) + "/environment.json";

    writeFileSync(storagePath, JSON.stringify(files));

    return storagePath;
  }

  async run(cwd: string) {
    const path = resolve(__dirname + "../../../bin/scip-python/index.js");

    console.log(path);

    const environmentLocation = await this.createEnvironment(cwd);
    const pythonPath = await this.getPythonPath(cwd);

    let storagePath = this.getStoragePath(cwd);

    storagePath += "/python.scip";

    const result = await execFileAsync(
      `node`,
      [
        path,
        "index",
        cwd,
        "--environment",
        environmentLocation,
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

    console.log(result.stdout);
    console.log(result.stderr);

    return storagePath;
  }

  async detect() {
    const hasPythonFiles = await vscode.workspace.findFiles(
      "**/*.{py,pyi}",
      "**/node_modules/**"
    );

    return hasPythonFiles.length > 0;
  }
}
