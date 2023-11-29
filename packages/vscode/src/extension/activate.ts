import * as vscode from "vscode";

import { Status } from "./status";
import { Index } from "./service/index";

export const activate = async (context: vscode.ExtensionContext) => {
  Status.getInstance();
  Index.setContext(context);

  // Create a command called "CodeMuse: Index Workspace" that will run the index
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.index", () => {
      Index.getInstance(context).run(context);
    })
  );

  // Run the index command on startup
  vscode.commands.executeCommand("codemuse.index");
};

export const deactivate = () => {
  Status.getInstance().dispose();
};
