import * as vscode from "vscode";
import { GenericViewProvider } from "./generic";

export class SearchViewProvider extends GenericViewProvider {
  constructor(context: vscode.ExtensionContext) {
    super(context, "search");
  }
}
