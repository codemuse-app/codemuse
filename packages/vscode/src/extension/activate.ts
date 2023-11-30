import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";

import { Status } from "./status";
import { Index } from "./service/index";
import { SearchViewProvider } from "./views/search";

export const activate = async (context: vscode.ExtensionContext) => {
  const insallationId = context.globalState.get<string>(
    "codemuse:installationId"
  );

  if (!insallationId) {
    const uuid = uuidv4();
    context.globalState.update("codemuse:installationId", uuid);
  }

  Status.getInstance();
  new Index(context);

  // Create a command called "CodeMuse: Index Workspace" that will run the index
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.index", () => {
      Index.getInstance().run(context);
    })
  );

  // Attach the search view
  const searchViewProvider = new SearchViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "codemuse.sidebar",
      searchViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.openSidebar", () => {
      searchViewProvider.show();
    })
  );

  // Run the index command on startup
  vscode.commands.executeCommand("codemuse.index");
};

export const deactivate = () => {
  Status.getInstance().dispose();
};
