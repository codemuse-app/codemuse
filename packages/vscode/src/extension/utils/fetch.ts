import {
  BAGGAGE_HEADER_NAME,
  dynamicSamplingContextToSentryBaggageHeader,
  generateSentryTraceHeader,
} from "@sentry/utils";
import { getDynamicSamplingContextFromClient } from "@sentry/core";
import * as Sentry from "@sentry/browser";

export const apiFetch = (
  input: RequestInfo | URL,
  info?: RequestInit | undefined
) => {
  const scope = Sentry.getCurrentHub().getScope();

  const span = scope?.getSpan();

  const client = Sentry.getCurrentHub().getClient();

  if (!client || !scope || !span) {
    return fetch(input, info);
  }

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

  const sentryHeaders = {
    "sentry-trace": sentryTraceHeader,
    [BAGGAGE_HEADER_NAME]: sentryBaggageHeader,
  };

  //@ts-ignore
  return fetch(input, {
    ...info,
    headers: {
      ...info?.headers,
      ...sentryHeaders,
    },
  });
};
