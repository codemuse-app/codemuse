from typing import List
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sentry_sdk
from pydantic import BaseModel
from contextlib import asynccontextmanager

from modal import Image, Stub, asgi_app, Function

image = Image.debian_slim().pip_install(["sentry-sdk[fastapi]==1.38.0", "pydantic==2.5.2"])

sentry_sdk.init(
    dsn="https://5778b258c3b19d7b1a11f8ca575bc494@o4506308721115136.ingest.sentry.io/4506308722688000",
    enable_tracing=True,
)

api_functions = {}

stub = Stub("api")

web_app = FastAPI()

class ExtensionRequest(BaseModel):
    # VSCode extension machine ID
    machineId: str

class EmbeddingRequest(ExtensionRequest):
    code: str

class EmbeddingResponse(BaseModel):
    embedding: List[float]

@web_app.post("/embedding")
async def embedding(request: Request):
    body = await request.json()

    # Validate the body
    embedding_request = EmbeddingRequest(**body)

    # Set the sentry user to the installation ID
    sentry_sdk.set_user({"id": embedding_request.machineId})

    # Call the function
    embedding = await api_functions["generate_embedding"].remote.aio(embedding_request.code)

    # Return the response
    return EmbeddingResponse(embedding=embedding)

class DocumentationRequest(ExtensionRequest):
    code: str

class DocumentationResponse(BaseModel):
    documentation: str

@web_app.post("/documentation")
async def documentation(request: Request):
    body = await request.json()

    # Validate the body
    documentation_request = DocumentationRequest(**body)

    # Set the sentry user to the installation ID
    sentry_sdk.set_user({"id": documentation_request.machineId})

    # Call the function
    documentation = ''

    async for chunk in api_functions["generate_documentation"].remote_gen.aio(documentation_request.code):
        documentation += chunk

    # Return the response
    return DocumentationResponse(documentation=documentation)


@web_app.get('/status')
async def status():
    return JSONResponse({"status": "ok"})

@web_app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0

@stub.cls(image=image, concurrency_limit=100, keep_warm=1, allow_concurrent_inputs=50)
class Api:
    def __enter__(self):
        api_functions["generate_embedding"] = Function.lookup("embeddings", "Model.generate")
        api_functions["generate_documentation"] = Function.lookup("documentation", "Model.generate")

    @asgi_app()
    def asgi(self):
        return web_app
