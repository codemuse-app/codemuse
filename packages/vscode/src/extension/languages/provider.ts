import { createHash } from "crypto";
import { existsSync, mkdirSync } from "fs";
import * as vscode from "vscode";
import { SupportedLanguage } from "../service/graph/types";

export abstract class LanguageProvider {
  abstract languageId: SupportedLanguage;
  protected context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get the path to the storage directory for the given workspace folder.
   * @param cwd The path to the workspace folder. This is used to differentiate between different workspace folders.
   * @returns The path to the storage directory for the given workspace folder.
   */
  protected getStoragePath(cwd: string) {
    const repositoryHash = createHash("sha256")
      .update(cwd)
      .digest("hex")
      .slice(0, 16);

    const storagePath =
      this.context!.storageUri!.fsPath + "/" + repositoryHash + "";

    if (!existsSync(storagePath)) {
      mkdirSync(storagePath, { recursive: true });
    }

    return storagePath;
  }

  /**
   * Detect if the language provider should be run on the given workspace folder.
   * @returns Whether the language provider should be run on the given workspace folder.
   * @todo This could return a sublist of the workspace folders that should be run.
   */
  abstract detect(): Promise<boolean>;

  /**
   * Run the language provider on the given workspace folder. This builds the index file to the storage directory.
   * @param cwd The path to the workspace folder.
   * @returns The location of the scip index file.
   */
  abstract run(cwd: string): Promise<string>;
}
