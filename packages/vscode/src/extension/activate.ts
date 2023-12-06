import * as vscode from "vscode";
import * as Sentry from "@sentry/browser";

import { Status } from "./status";
import { Index } from "./service/index";
import { SearchViewProvider } from "./views/search";
import { CodeMuseCodeLens } from "./codelense";
import { capture } from "./service/logging/posthog";
import { getSymbolName } from "../shared/utils";

import * as fs from "fs";

// import { telemetryLogger } from "./service/logging";

export const highlight = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    // Use the current color theme's token color for the foreground
    backgroundColor: new vscode.ThemeColor(
      "editor.findMatchHighlightBackground"
    ),
  },
  dark: {
    // Use the current color theme's token color for the foreground
    backgroundColor: new vscode.ThemeColor(
      "editor.findMatchHighlightBackground"
    ),
  },
});

Sentry.addTracingExtensions();

Sentry.init({
  dsn: "https://6ec7abf2f59c9bb9cd7c8679a248cc8f@o4506308721115136.ingest.sentry.io/4506321118035968",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.BrowserProfilingIntegration(),
  ],
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["codemuse-app--api-asgi.modal.run"],
});

export const activate = async (context: vscode.ExtensionContext) => {
  Sentry.setUser({
    id: vscode.env.machineId,
  });

  // create a new comment controller
  let commentController = vscode.comments.createCommentController(
    "commentController",
    "CodeMuse"
  );

  //context.subscriptions.push(telemetryLogger);
  const transaction = Sentry.startTransaction({
    name: "activate",
    op: "function",
  });

  Index.initialize(context);

  Status.getInstance();

  // Create a command called "CodeMuse: Delete Index" that will delete the files in the folder located at: context!.storageUri!.fsPath (codemuse folder for each workspace)
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.deleteIndex", async () => {
      capture("deleteIndex");
      const dir = context.storageUri!.fsPath;
      fs.rmSync(dir, { recursive: true, force: true });
    })
  );

  // Create a command called "CodeMuse: Index Workspace" that will run the index
  context.subscriptions.push(
    vscode.commands.registerCommand("codemuse.index", async () => {
      capture("index");

      await Sentry.startSpan(
        {
          op: "function",
          name: "index",
        },
        async () => {
          await Index.getInstance().run();
        }
      );
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
      capture("openSidebar");

      searchViewProvider.show();
    })
  );

  context.subscriptions.push(
    // Command to trigger an error in Sentry
    vscode.commands.registerCommand("codemuse.error", () => {
      throw new Error("This is an error");
    })
  );

  const openThreads = new Map();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.askCodeMuseDoc",
      async (record, range: vscode.Range) => {
        if (!record.documentation) {
          return;
        }

        // If there is already a thread open for this symbol, dispose of it
        const existingThread = openThreads.get(record.symbol);

        if (existingThread) {
          existingThread.dispose();
          openThreads.delete(record.symbol);
          return;
        }

        // Now create the new comment thread
        const contents = new vscode.MarkdownString(record.documentation);
        contents.supportHtml = true;

        const commentThread = commentController.createCommentThread(
          vscode.Uri.file(record.file),
          range,
          [
            {
              body: contents,
              author: { name: "CodeMuse" },
              label: "",
              mode: vscode.CommentMode.Preview,
              timestamp: new Date(),
            },
          ]
        );

        commentThread.canReply = false;
        commentThread.label =
          "Explanation of " + getSymbolName(record.symbol).name;
        commentThread.collapsibleState =
          vscode.CommentThreadCollapsibleState.Expanded;

        // Add the new thread to the tracking array
        context.subscriptions.push(commentThread);

        // Push the thread to the openThreads map (using the record.symbol as the key)
        openThreads.set(record.symbol, commentThread);

        // Get the active editor
        const uri = vscode.Uri.file(record.file);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Calculate a new range that is a few lines below the original range
        const lineCount = editor.document.lineCount;
        const newBottomLine = Math.min(range.end.line + 5, lineCount - 1);
        const newRange = new vscode.Range(range.end, new vscode.Position(newBottomLine, 0));

        // Scroll the editor to this new range
        editor.revealRange(newRange, vscode.TextEditorRevealType.InCenter); // change this if you want to modify the position of the scroll

        commentThread.collapsibleState =
          vscode.CommentThreadCollapsibleState.Expanded;

        // Modify the selection change disposable
        const selectionChangeDisposable =
          vscode.window.onDidChangeTextEditorSelection(() => {
            commentThread.dispose();
            selectionChangeDisposable.dispose();
          });

        context.subscriptions.push(selectionChangeDisposable);
      }
    )
  );

  // // command to display documentation of CodeLens
  // context.subscriptions.push(
  //   vscode.commands.registerCommand(
  //     "extension.askCodeMuseDoc",
  //     (record, range: vscode.Range) => {
  //       const record_info = getSymbolName(record.symbol);
  //       const activeEditor = vscode.window.activeTextEditor;
  //       if (!activeEditor) {
  //         return; // No editor is focused
  //       }

  //       if (!record.documentation) {
  //         return;
  //       }

  //       const contents = new vscode.MarkdownString();
  //       contents.supportHtml = true;
  //       contents.value = record.documentation;

  //       // Inside your registerCommand callback
  //       const commentThread = commentController.createCommentThread(
  //         activeEditor.document.uri,
  //         range,
  //         [
  //           {
  //             body: contents,
  //             author: { name: "CodeMuse" },
  //             label: "",
  //             mode: vscode.CommentMode.Preview,
  //             timestamp: new Date(),
  //           },
  //         ]
  //       );

  //       commentThread.canReply = false;
  //       commentThread.label = "Explanation of " + record_info.name;
  //       commentThread.collapsibleState =
  //         vscode.CommentThreadCollapsibleState.Expanded;

  //       context.subscriptions.push(commentThread);

  //       commentThread.collapsibleState =
  //         vscode.CommentThreadCollapsibleState.Expanded;

  //       // Dispose of the comment thread when the selection is changed
  //       const selectionChangeDisposable =
  //         vscode.window.onDidChangeTextEditorSelection(() => {
  //           commentThread.dispose();
  //           selectionChangeDisposable.dispose();
  //         });

  //       context.subscriptions.push(selectionChangeDisposable);
  //     }
  //   )
  // );

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

  capture("activate");
  transaction.finish();
};

export const deactivate = () => {
  Status.getInstance().dispose();
};
