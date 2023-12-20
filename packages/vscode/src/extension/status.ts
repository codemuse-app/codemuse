import * as vscode from "vscode";

export class Status {
  private static instance: Status;
  private statusBarItem: vscode.StatusBarItem;
  private queue: Map<string, string> = new Map();

  private constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -2 // to the left of the language picker
    );
    this.statusBarItem.command = "codemuse.index";
    this.statusBarItem.tooltip = "Index Workspace";
    this.statusBarItem.text = "CodeMuse";
    this.statusBarItem.show();
  }

  public static getInstance(): Status {
    if (!Status.instance) {
      Status.instance = new Status();
    }
    return Status.instance;
  }

  /**
   * Adds a task to the queue and returns a token that can be used to remove the task from the queue.
   */
  public loading(message: string) {
    const token = Math.random().toString();
    this.queue.set(token, message);
    this.update();

    return () => {
      this.queue.delete(token);
      this.update();
    };
  }

  private update() {
    if (this.queue.size === 0) {
      this.statusBarItem.text = "$(check) CodeMuse";
    } else {
      this.statusBarItem.text = "$(loading~spin) CodeMuse";
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
