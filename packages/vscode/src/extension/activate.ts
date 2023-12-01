import * as vscode from "vscode";

import { Status } from "./status";
import { Index } from "./service/index";
import { SearchViewProvider } from "./views/search";
import { getInstallationId } from "./track";
import { CodeMuseCodeLens } from "./codelense";

import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://6ec7abf2f59c9bb9cd7c8679a248cc8f@o4506308721115136.ingest.sentry.io/4506321118035968",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.BrowserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

export const activate = async (context: vscode.ExtensionContext) => {
  // Sentry set the installation ID
  Sentry.setUser({ id: getInstallationId(context) });

  Index.initialize(context);

  Status.getInstance();

  // Create a command called "CodeMuse: Index Workspace" that will run the index
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.index", async () => {
      Sentry.withScope(async (scope) => {
        scope.setTransactionName("codemuse.index");
        await Index.getInstance().run();
      });
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
          // TODO: switch to true
          retainContextWhenHidden: false,
        },
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.openSidebar", () => {
      searchViewProvider.show();
    })
  );

  context.subscriptions.push(
    // Command to trigger an error in Sentry
    vscode.commands.registerCommand("codemuse.error", () => {
      throw new Error("This is an error");
    })
  );

  // Attach the CodeLens provider
  let selector: vscode.DocumentSelector = {
    scheme: "file",
    language: "python",
  };
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, new CodeMuseCodeLens())
  );

  // Run the index command on startup
  vscode.commands.executeCommand("codemuse.index");
};

export const deactivate = () => {
  Status.getInstance().dispose();
};
