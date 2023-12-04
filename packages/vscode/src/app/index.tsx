import * as React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";

import { Search } from "./views/search";

Sentry.init({
  dsn: "https://6ec7abf2f59c9bb9cd7c8679a248cc8f@o4506308721115136.ingest.sentry.io/4506321118035968",
  integrations: [new Sentry.Replay()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: 1.0,

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/codemuse-app/],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// use window.machineId as user id for sentry
declare global {
  interface Window {
    machineId: string;
  }
}

Sentry.setUser({ id: window.machineId });

try {
  const root = document.getElementById("root-search");
  if (root) {
    createRoot(root).render(<Search />);
  }
} catch (e) {}
