import asyncio
import os
from typing import List
from modal import Image, Secret, Stub, method, web_endpoint
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

@stub.cls(gpu="T4", secret=Secret.from_name("huggingface"), container_idle_timeout=60, allow_concurrent_inputs= 10 * BATCH_SIZE, concurrency_limit=1)
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
            # Detect if a minute has passed, and print the processed count then reset it
            if time.time() - self.minute >= 60:
                print(f"Processed {self.processed} in the last minute")
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

    @method()
    async def generate(self, element: str) -> List[float]:
        # Create a Future for the result
        result = asyncio.Future()

        print("Adding to queue")

        # Add the element and the Future to the queue
        await self.queue.put((element, result))

        # Wait for the result
        return await result

@stub.function(concurrency_limit=10)
@utils.with_sentry
@web_endpoint(method="POST", label='generate-embedding')
def get_embedding(snippet: dict):
   # The snippet should contain a single key, "code" which is a string of code. Otherwise, raise an error.
    if len(snippet) != 1 or "code" not in snippet:
        raise ValueError("Snippet must contain a single key, 'code'.")

    model = Model()
    return {
       "embedding": model.generate.remote(snippet["code"])
    }

from concurrent.futures import ThreadPoolExecutor

@stub.local_entrypoint()
def main():
    model = Model()

    code_snippets = [
        "print('Hello, World!')",
        "for i in range(10):\n    print(i)",
        "def greet(name):\n    return f'Hello, name!'",
        "import math\nprint(math.pi)",
        "numbers = [1, 2, 3, 4, 5]\nprint(sum(numbers))",
        "with open('file.txt', 'r') as f:\n    print(f.read())",
        "try:\n    x = 1 / 0\nexcept ZeroDivisionError:\n    print('Cannot divide by zero')",
        "class MyClass:\n    def __init__(self, name):\n        self.name = name",
        "import requests\nresponse = requests.get('https://www.example.com')",
        "import os\nprint(os.getcwd())",
        "import sys\nprint(sys.version)",
        "import datetime\nprint(datetime.datetime.now())",
        "list_comprehension = [i * 2 for i in range(10)]",
        "dictionary = {'key': 'value'}\nprint(dictionary['key'])",
        "def recursive_function(n):\n    if n == 0:\n        return 1\n    else:\n        return n * recursive_function(n-1)",
        "import random\nprint(random.randint(1, 10))",
        "string = 'Hello, World!'\nprint(string.split(','))",
        "import json\njson_string = json.dumps({'key': 'value'})",
        "from functools import reduce\nnumbers = [1, 2, 3, 4, 5]\nproduct = reduce((lambda x, y: x * y), numbers)",
        "import numpy as np\narray = np.array([1, 2, 3, 4, 5])\nprint(array.mean())"
    ]

    with ThreadPoolExecutor(max_workers=20) as executor:
        tasks = [executor.submit(model.generate.remote, snippet) for snippet in code_snippets]
        results = [task.result() for task in tasks]

    for result in results:
        print(result)

    return results
