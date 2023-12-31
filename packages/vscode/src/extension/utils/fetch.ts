import {
  BAGGAGE_HEADER_NAME,
  dynamicSamplingContextToSentryBaggageHeader,
  generateSentryTraceHeader,
} from "@sentry/utils";
import { getDynamicSamplingContextFromClient } from "@sentry/core";
import * as Sentry from "@sentry/browser";

const CODEMUSE_DOMAINS = [
  "https://app.codemuse.app/",
  "https://codemuse-app--api-api-asgi.modal.run/",
  "http://localhost:3000/",
];

export const apiFetch = (
  input: RequestInfo | URL,
  token: string,
  info?: RequestInit | undefined
) => {
  const scope = Sentry.getCurrentHub().getScope();

  const span = scope?.getSpan();

  const client = Sentry.getCurrentHub().getClient();

  const isCodemuseDomain = CODEMUSE_DOMAINS.some((domain) =>
    input.toString().startsWith(domain)
  );

  if (!isCodemuseDomain) {
    return fetch(input, info);
  }

  let sentryHeaders = {};

  if (client && scope && span) {
    const transaction = span && span.transaction;

    const { traceId, sampled, dsc } = Sentry.getCurrentHub()
      .getScope()
      .getPropagationContext();

    const sentryTraceHeader = span
      ? span.toTraceparent()
      : generateSentryTraceHeader(traceId, undefined, sampled);
    const dynamicSamplingContext = transaction
      ? transaction.getDynamicSamplingContext()
      : dsc
        ? dsc
        : getDynamicSamplingContextFromClient(traceId, client, scope);

    const sentryBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(
      dynamicSamplingContext
    );

    sentryHeaders = {
      "sentry-trace": sentryTraceHeader,
      [BAGGAGE_HEADER_NAME]: sentryBaggageHeader,
    };
  }

  return (async () => {
    return await fetch(input.toString(), {
      ...info,
      // @ts-ignore
      headers: {
        ...info?.headers,
        ...sentryHeaders,
        Authorization: `Bearer ${token}`,
      },
    });
  })();
};
