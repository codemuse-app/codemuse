import { createClient } from "../vrpc/client";
import { RouterType } from "../extension/router";

const vscode = acquireVsCodeApi();

export const client = createClient<RouterType>(vscode);
