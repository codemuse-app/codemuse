from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from modal import Image, Stub, asgi_app, Function

web_app = FastAPI()
stub = Stub()

image = Image.debian_slim()


@web_app.post("/embedding")
async def embedding(request: Request):
    generate_embeddings = Function.lookup("embeddings", "Model.generate")
    body = await request.json()
    return JSONResponse({"done": True})


@web_app.post("/documentation")
async def documentation(request: Request):
    body = await request.json()
    return JSONResponse({"done": True})


@stub.function(image=image)
@asgi_app()
def fastapi_app():
    return web_app
