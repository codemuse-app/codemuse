import asyncio
import os
from typing import List
from modal import Image, Secret, Stub, method
import time

import utils

MODEL_DIR = "/model"
BASE_MODEL = "sentence-transformers/all-mpnet-base-v2"

def download_model_to_folder():
    from huggingface_hub import snapshot_download

    os.makedirs(MODEL_DIR, exist_ok=True)

    snapshot_download(
        BASE_MODEL,
        local_dir=MODEL_DIR,
        token=os.environ["HUGGINGFACE_TOKEN"],
    )

def model_init():
    from sentence_transformers import SentenceTransformer

    # Load the model. Tip: MPT models may rdequire `trust_remote_code=true`.
    model = SentenceTransformer(
        MODEL_DIR,
        # trust_remote_code=True,
        # revision='v1.0.0'
    )

    return model

image = (
    Image.from_registry(
       "nvidia/cuda:12.1.0-cudnn8-devel-ubuntu22.04",
        add_python="3.9"
    )
    .apt_install("git")
    .pip_install(
        "torch==2.1.0+cu121", index_url="https://download.pytorch.org/whl"
    )
    .pip_install(["hf_transfer", "sentry-sdk", "posthog"])
    # Pinned to 10/16/23
    # .pip_install(
    #     "sentence-transformers @ git+https://github.com/Hum-Works/sentence-transformers.git@4595d69ca0e1ab1bd19064a54d48905b4dbff335"
    # )
    .pip_install("sentence-transformers")
    .pip_install("einops")
    # Use the barebones hf-transfer package for maximum download speeds. No progress bar, but expect 700MB/s.
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("huggingface"),
        timeout=60 * 20,
    )
    .run_commands('pip uninstall -y triton triton-python')
    .pip_install('triton==2.0.0.dev20221202')
    .run_function(model_init)
)

stub = Stub("embeddings", image=image)

BATCH_SIZE = 50
TIMEOUT = 0.5

@stub.cls(gpu="T4", secret=Secret.from_name("huggingface"), container_idle_timeout=60, allow_concurrent_inputs= 10 * BATCH_SIZE, concurrency_limit=5)
class Model:
    def __enter__(self):
        # Load the model. Tip: MPT models may rdequire `trust_remote_code=true`.
        self.model = model_init()

        # Create a queue and a batch size
        self.queue = asyncio.Queue()
        self.batch_size = BATCH_SIZE

        # Start the background task
        self.task = asyncio.create_task(self.process_batches())

        self.processed = 0
        self.minute = time.time()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.task.cancel()

    async def process_batches(self):
        while True:
            # Show average throughput (items/sec)
            if time.time() - self.minute >= 10:
                print(f"Throughput: {self.processed / 10:.2f} items/sec")
                self.processed = 0
                self.minute = time.time()

            # Collect a batch of inputs
            batch = []
            start_time = time.time()

            for _ in range(self.batch_size):
                try:
                    timeout = TIMEOUT - (time.time() - start_time)

                    if timeout <= 0:
                        timeout = 0

                    item = await asyncio.wait_for(self.queue.get(), timeout=timeout)

                    if item is None:
                        break

                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            if len(batch) == 0:
                continue

            # Process the batch
            results = self.model.encode([item[0] for item in batch]).tolist()

            self.processed += len(batch)

            # Set the results for each item in the batch
            for item, result in zip(batch, results):
                item[1].set_result(result)

    @method(keep_warm=1)
    @utils.with_sentry
    async def generate(self, element: str) -> List[float]:
        # Create a Future for the result
        result = asyncio.Future()

        # Add the element and the Future to the queue
        await self.queue.put((element, result))

        # Wait for the result
        return await result
