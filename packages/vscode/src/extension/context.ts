import * as vscode from "vscode";

/**
 * Singleton class that stores the vscode extension context
 */
export class Extension {
  private context: vscode.ExtensionContext;
  private static instance: Extension;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public initialize(context: vscode.ExtensionContext) {
    Extension.instance = new Extension(context);
  }

  private static ensureInitialized() {
    if (!Extension.instance) {
      throw new Error("Extension not initialized");
    }
  }

  private static getInstance(): Extension {
    Extension.ensureInitialized();

    return Extension.instance;
  }

  static getContext(): vscode.ExtensionContext {
    return Extension.getInstance().context;
  }
}
