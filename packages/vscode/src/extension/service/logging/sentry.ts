import * as Sentry from "@sentry/browser";

/**
 * The following methods are supported:
 * - with(name: str, fn: fn): void - Runs a function in a new span
 * - now(name: str): Span - Starts a new span, ending the previous one with the same parent span
 * - start(name: str): Span - Starts a new span
 * - end(): void - Ends the current span
 */
