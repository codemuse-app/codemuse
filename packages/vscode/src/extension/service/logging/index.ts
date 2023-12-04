import * as vscode from "vscode";
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://6ec7abf2f59c9bb9cd7c8679a248cc8f@o4506308721115136.ingest.sentry.io/4506321118035968",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.BrowserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  tracePropagationTargets: ["https://codemuse-app--api-asgi.modal.run/"],
});

const telemetrySender: vscode.TelemetrySender = {
  sendEventData(eventName, data) {
    Sentry.captureEvent({
      message: eventName,
      extra: data,
      user: {
        id: vscode.env.machineId,
      },
    });
  },
  sendErrorData(error, data) {
    Sentry.captureException(error, {
      extra: data,
      user: {
        id: vscode.env.machineId,
      },
    });
  },
  async flush() {
    await Sentry.flush(2000);
  },
};

vscode.env.createTelemetryLogger(telemetrySender);
