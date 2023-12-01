import * as vscode from "vscode";

export const goTo = async (
  path: string,
  range?: [number, number, number, number]
) => {
  const workspaceUri = vscode.workspace.workspaceFolders![0].uri.fsPath;

  const uri = vscode.Uri.file(workspaceUri + "/" + path);

  // Open the document
  const doc = await vscode.workspace.openTextDocument(uri);

  const editor = await vscode.window.showTextDocument(doc);

  if (!range) {
    return;
  }

  const vscodeRange = new vscode.Range(
    new vscode.Position(range[0], range[1]),
    new vscode.Position(range[2], range[3])
  );

  editor.revealRange(vscodeRange);

  editor.selection = new vscode.Selection(vscodeRange.start, vscodeRange.end);
};
