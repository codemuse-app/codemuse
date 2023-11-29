import * as vscode from "vscode";

import { Status } from "./status";
import { Index } from "./service/index";
import { SearchViewProvider } from "./views/search";

export const activate = async (context: vscode.ExtensionContext) => {
  Status.getInstance();
  Index.setContext(context);

  // Create a command called "CodeMuse: Index Workspace" that will run the index
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.index", () => {
      Index.getInstance().run();
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
