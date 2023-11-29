import * as vscode from "vscode";

export class GenericViewProvider implements vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private view?: vscode.WebviewView;

  public viewId: string;

  /**
   * @param context The extension context
   * @param viewId The ID of the view. This will be used to generate the root element ID in the form of `root-${viewId}`. It cannot contain spaces.
   */
  constructor(context: vscode.ExtensionContext, viewId: string) {
    // Check that the viewId does not contain spaces
    if (viewId.indexOf(" ") !== -1) {
      throw new Error("viewId cannot contain spaces");
    }

    this.context = context;
    this.viewId = viewId;
  }

  public show() {
    if (this.view) {
      this.view.show();
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = vscode.Uri.joinPath(
      this.context.extensionUri,
      "dist",
      "app",
      "index.js"
    );

    const scriptHref = webview.asWebviewUri(scriptUri);

    const html = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>CodeMuse</title>
        </head>
        <body>
          <div id="root-${this.viewId}"></div>
          <script src="${scriptHref}"></script>
        </body>
      </html>`;

    return html;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
  }
}
