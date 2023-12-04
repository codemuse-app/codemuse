import { PostHog } from "posthog-node";
import * as vscode from "vscode";

const client = new PostHog("phc_DgRmIFV3DxfEZ2PT968d9hwS9vNme86Cvm2Ic4KUqT0", {
  host: "https://eu.posthog.com",
});

export const capture = (event: string, properties?: Record<string, any>) => {
  client.capture({
    event,
    distinctId: vscode.env.machineId,
    properties: {
      ...properties,
      $set: {
        ...properties?.$set,
        "vscode.version": process.env.VSCODE_VERSION,
        machineId: vscode.env.machineId,
      },
    },
  });

  client;
};

export const shutdown = async () => {
  await client.shutdownAsync();
};
