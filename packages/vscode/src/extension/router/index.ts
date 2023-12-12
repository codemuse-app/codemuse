import * as Sentry from "@sentry/browser";
import * as vscode from "vscode";

import { router as vrpcRouter, procedure } from "../../shared/vrpc";
import { goTo } from "../commands";
import { Index } from "../service";
import { capture } from "../service/logging/posthog";

export const router = vrpcRouter({
  helloWorld: procedure((name: string) => `Hello ${name}!`),
  query: procedure(async (text: string) => {
    capture("query");

    return await Sentry.startSpan(
      {
        op: "function",
        name: "query",
      },
      () => {
        return Index.getInstance().query(text);
      }
    );
  }),
  goTo: procedure(goTo),
  index: procedure(() => {
    vscode.commands.executeCommand("codemuse.index");
  }),
  getNumberOfNodes: procedure(() => {
    return Index.getInstance().getNumberOfNodes();
  }),
});

export type RouterType = typeof router;
