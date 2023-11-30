from typing import List
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sentry_sdk
from pydantic import BaseModel

from modal import Image, Stub, asgi_app, Function

web_app = FastAPI()
stub = Stub("api")

image = Image.debian_slim().pip_install(["sentry-sdk[fastapi]==1.38.0", "pydantic==2.5.2"])

sentry_sdk.init(
    dsn="https://5778b258c3b19d7b1a11f8ca575bc494@o4506308721115136.ingest.sentry.io/4506308722688000",
    enable_tracing=True,
)

class EmbeddingRequest(BaseModel):
    code: str

class EmbeddingResponse(BaseModel):
    embedding: List[float]

@web_app.post("/embedding")
async def embedding(request: Request):
    generate_embedding = Function.lookup("embeddings", "Model.generate")
    body = await request.json()

    # Validate the body
    embedding_request = EmbeddingRequest(**body)

    # Call the function
    embedding = generate_embedding.remote(embedding_request.code)

    # Return the response
    return JSONResponse(
        EmbeddingResponse(embedding=embedding).model_dump_json()
    )


@web_app.post("/documentation")
async def documentation(request: Request):
    body = await request.json()
    return JSONResponse({"done": True})

@web_app.get('/status')
async def status():
    return JSONResponse({"status": "ok"})

@web_app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0


@stub.function(image=image)
@asgi_app()
def fastapi_app():
    return web_app
