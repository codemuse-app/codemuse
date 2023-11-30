import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import * as fs from "fs";

export const getInstallationId = (context: vscode.ExtensionContext) => {
  const installationId = context.globalState.get<string>(
    "codemuse:installationId"
  );

  if (installationId) {
    return installationId;
  }

  const permanentStoragePath = join(
    context.globalStorageUri.fsPath,
    ".installationid"
  );

  let uuid = uuidv4();

  if (fs.existsSync(permanentStoragePath)) {
    uuid = fs.readFileSync(permanentStoragePath, "utf-8");
  }

  context.globalState.update("codemuse:installationId", uuid);

  // Create the directory if it doesn't exist
  if (!fs.existsSync(context.globalStorageUri.fsPath)) {
    fs.mkdirSync(context.globalStorageUri.fsPath);
  }

  // Write to permanent storage
  fs.writeFileSync(permanentStoragePath, uuid);

  return uuid;
};
