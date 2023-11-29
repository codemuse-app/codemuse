import asyncio
import os
from typing import List
from modal import Image, Secret, Stub, method, web_endpoint

import utils

MODEL_DIR = "/model"
BASE_MODEL = "Hum-Works/lodestone-base-4096-v1"

def download_model_to_folder():
    from huggingface_hub import snapshot_download

    os.makedirs(MODEL_DIR, exist_ok=True)

    snapshot_download(
        BASE_MODEL,
        local_dir=MODEL_DIR,
        token=os.environ["HUGGINGFACE_TOKEN"],
    )

image = (
    Image.from_registry(
       "nvidia/cuda:12.1.0-cudnn8-devel-ubuntu22.04",
        add_python="3.9"
    )
    .apt_install("git")
    .pip_install(
        "torch==2.1.0+cu121", index_url="https://download.pytorch.org/whl"
    )
    .pip_install(["hf_transfer", "sentry-sdk"])
    # Pinned to 10/16/23
    .pip_install(
        "sentence-transformers @ git+https://github.com/Hum-Works/sentence-transformers.git@4595d69ca0e1ab1bd19064a54d48905b4dbff335"
    )
    .pip_install("einops")
    # Use the barebones hf-transfer package for maximum download speeds. No progress bar, but expect 700MB/s.
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "TOKENIZERS_PARALLELISM": "true"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("huggingface"),
        timeout=60 * 20,
    )
    .run_commands('pip uninstall -y triton triton-python')
    .pip_install('triton==2.0.0.dev20221202')
)

stub = Stub("example-embeddings", image=image)

@stub.cls(gpu="T4", secret=Secret.from_name("huggingface"), container_idle_timeout=30, allow_concurrent_inputs=10)
class Model:
    def __enter__(self):
        from sentence_transformers import SentenceTransformer

        # Load the model. Tip: MPT models may require `trust_remote_code=true`.
        self.model = SentenceTransformer(MODEL_DIR, trust_remote_code=True, revision='v1.0.0')

        # Create a queue and a batch size
        self.queue = asyncio.Queue()
        self.batch_size = 10

        async def process_batches():
            while True:
                # Collect a batch of inputs
                batch = [await self.queue.get() for _ in range(self.batch_size)]

                # Process the batch
                results = self.model.encode([item[0] for item in batch], batch_size=self.batch_size)

                # Set the results for each item in the batch
                for item, result in zip(batch, results):
                    item[1].set_result(result)

        # Start the background task
        self.task = asyncio.create_task(process_batches())

    @method()
    async def generate(self, elements: List[str]) -> List[float]:
        # Create a Future for the result
        result = asyncio.Future()

        # Add the elements and the Future to the queue
        await self.queue.put((elements, result))

        # Wait for the result
        return await result

@stub.function()
@utils.with_sentry
@web_endpoint(method="POST", label='generate-embedding')
def get_embedding(snippet: dict):
   # The snippet should contain a single key, "code" which is a string of code. Otherwise, raise an error.
    if len(snippet) != 1 or "code" not in snippet:
        raise ValueError("Snippet must contain a single key, 'code'.")

    model = Model()
    return {
       "embedding": model.generate.remote([snippet["code"]])[0].tolist()
    }

@stub.local_entrypoint()
def main():
    model = Model()
    questions = [
        # Coding questions
        "Implement a Python function to compute the Fibonacci numbers.",
    ]
    result = model.generate.remote(questions)[0]
    return result
