import type { Router } from "./index";
import type { WebviewApi } from "vscode-webview";
import { nanoid } from "nanoid";
import { keyProxy } from "./proxy";

// The router interface needs to have async calls for all procedures, except for subscriptions
type ClientRouter<T extends Router> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<R>
    : T[K] extends Router
      ? ClientRouter<T[K]>
      : T[K] extends { subscribe: (f: infer P) => void }
        ? T[K]
        : never;
} & {
  ready: () => Promise<void>;
};

export const createClient = <T extends Router>(
  vscode: WebviewApi<unknown>
): ClientRouter<T> => {
  // @ts-expect-error
  const clientId = window.__vrpcClientId || nanoid();

  const registry: {
    [key: string]: {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    };
  } = {};

  window.addEventListener("message", (message) => {
    if (!message.data || message.data.type !== "vrpc") {
      return;
    }

    const registryId = message.data.registryId;

    // Check if the key is in the registry
    if (!registry[registryId]) {
      return;
    }

    // Resolve the promise
    registry[registryId].resolve(message.data.value);
  });

  const client = keyProxy((keys) => {
    const key = keys.join(".");

    return (...params: any) => {
      const messageId = nanoid();
      const registryId = `${clientId}-${key}-${messageId}`;

      const message = {
        type: "vrpc",
        registryId,
        clientId,
        key,
        params,
      };

      return new Promise((resolve, reject) => {
        vscode.postMessage(message);

        registry[registryId] = {
          resolve,
          reject,
        };
      });
    };
  });

  return client as ClientRouter<T>;
};
