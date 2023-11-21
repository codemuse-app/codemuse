import * as vscode from "vscode";

import * as Languages from "../languages";
import { Status } from "../status";

export class Index {
  private static instance: Index;
  private languages: Languages.LanguageProvider[] = [];

  constructor() {}

  static setContext(context: vscode.ExtensionContext) {
    Index.getInstance().languages = [
      // new Languages.Typescript(context),
      new Languages.Python(context),
    ];
  }

  static getInstance() {
    if (!Index.instance) {
      Index.instance = new Index();
    }

    return Index.instance;
  }

  async run() {
    const instance = Index.getInstance();

    // Show a notification with progress bar
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "CodeMuse is indexing your workspace.",
        cancellable: false,
      },
      async (progress) => {
        for (const workspace of vscode.workspace.workspaceFolders!) {
          for (const language of instance.languages) {
            const done = Status.getInstance().loading(
              `Indexing ${language.languageId}`
            );

            if (await language.detect()) {
              progress.report({
                message: `Indexing ${language.languageId}`,
              });

              await language.run(workspace.uri.fsPath);

              progress.report({
                message: `Indexing ${language.languageId} complete`,
              });
            } else {
              console.log("Did not detect language");
            }

            done();
          }
        }
      }
    );
  }
}
