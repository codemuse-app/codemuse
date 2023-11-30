import functools
import sentry_sdk
from posthog import Posthog

posthog = Posthog('phc_DgRmIFV3DxfEZ2PT968d9hwS9vNme86Cvm2Ic4KUqT0', host='https://app.posthog.com')

sentry_sdk.init(
    dsn="https://5778b258c3b19d7b1a11f8ca575bc494@o4506308721115136.ingest.sentry.io/4506308722688000",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile 100%
    # of sampled transactions.
    # We recommend adjusting this value in production.
    profiles_sample_rate=1.0,
)

def with_sentry(fn):
    @functools.wraps(fn)
    async def fn_wrapped(*args, **kwargs):
        try:
            await fn(*args, **kwargs)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise exc

    return fn_wrapped
