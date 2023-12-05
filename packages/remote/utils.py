import functools
import sentry_sdk

sentry_sdk.init(
    dsn="https://5778b258c3b19d7b1a11f8ca575bc494@o4506308721115136.ingest.sentry.io/4506308722688000",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile 100%
    # of sampled transactions.
    # We recommend adjusting this value in production.
    profiles_sample_rate=1.0,
    enable_tracing=True
)

def with_sentry(fn):
    @functools.wraps(fn)
    async def fn_wrapped(*args, **kwargs):
        # Extract the sentry_trace_headers from kwargs, if it exists
        sentry_trace_headers = kwargs.pop('sentry_trace_headers', None)

        try:
            if sentry_trace_headers:
                sentry_sdk.continue_trace(sentry_trace_headers)

            with sentry_sdk.start_transaction(op="function", name=fn.__name__):
                # Call the function without the sentry_trace_headers argument
                return await fn(*args, **kwargs)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise exc

    return fn_wrapped

def with_sentry_generator(fn):
    @functools.wraps(fn)
    async def fn_wrapped(*args, **kwargs):
        # Extract the sentry_trace_headers from kwargs, if it exists
        sentry_trace_headers = kwargs.pop('sentry_trace_headers', None)

        try:
            if sentry_trace_headers:
                sentry_sdk.continue_trace(sentry_trace_headers)

            with sentry_sdk.start_transaction(op="function", name=fn.__name__):
                # Call the function without the sentry_trace_headers argument
                async for item in fn(*args, **kwargs):
                    yield item
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise exc

    return fn_wrapped

def get_sentry_trace_headers():
    headers = {}
    headers["sentry-trace"] = sentry_sdk.get_traceparent()
    headers["baggage"] = sentry_sdk.get_baggage()

    return headers
