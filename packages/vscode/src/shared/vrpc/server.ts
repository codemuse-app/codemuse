import type { Router, Message, RouterPart } from "./index";
import { nanoid } from "nanoid";
import * as vscode from "vscode";

export const serve = <T extends Router>(
  router: T,
  webview: vscode.Webview
): Promise<T> => {
  // Detect if the router has a "ready" procedure, if it does, raise an error
  if (router.ready) {
    throw new Error("Router cannot have a ready procedure");
  }

  const clientId = nanoid();

  const html = webview.html;

  // Add a script tag right before the <body> opening tag that contains the clientId
  webview.html = html.replace(
    "<body",
    `<script>window.__vrpcClientId = "${clientId}";</script><body`
  );

  let readynessPromiseResolve: ((router: T) => void) | undefined;

  const readynessPromise = new Promise<T>((resolve) => {
    readynessPromiseResolve = resolve;
  });

  webview.onDidReceiveMessage(async (e) => {
    if (!e.type || e.type !== "vrpc") {
      return;
    }

    if (e.key === "ready" && readynessPromiseResolve) {
      readynessPromiseResolve(router);
      return;
    }

    const message = e as unknown as Message;

    // Check if the message key exists in the router. The key may be nested, so we need to traverse the router
    const key = message.key.split(".");
    let current: Router = router;
    let target: RouterPart | undefined;

    for (const k of key) {
      if (!current[k]) {
        return;
      } else if (typeof current[k] === "object") {
        current = current[k] as Router;
      } else {
        target = current[k] as RouterPart;
        break;
      }
    }

    if (!target) {
      throw new Error("Target not found");
    }

    //TODO: ts error ?
    //@ts-ignore
    const value = await target(...message.params);

    webview.postMessage({
      type: "vrpc",
      registryId: message.registryId,
      value,
    });
  });

  return readynessPromise;
};
