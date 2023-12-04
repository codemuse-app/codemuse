import * as Sentry from "@sentry/browser";

import { router as vrpcRouter, procedure } from "../../shared/vrpc";
import { goTo } from "../commands";
import { Index } from "../service";
import { capture } from "../service/logging/posthog";

export const router = vrpcRouter({
  helloWorld: procedure((name: string) => `Hello ${name}!`),
  query: procedure((text: string) => {
    capture("query");

    return Sentry.startSpan(
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
});

export type RouterType = typeof router;
