import os

from modal import Image, Secret, Stub, method, web_endpoint

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
    .pip_install(["hf_transfer"])
    # Pinned to 10/16/23
    .pip_install(
        "sentence-transformers @ git+https://github.com/Hum-Works/sentence-transformers.git@4595d69ca0e1ab1bd19064a54d48905b4dbff335"
    )
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
)

stub = Stub("example-embeddings", image=image)

@stub.cls(gpu="T4", secret=Secret.from_name("huggingface"))
class Model:
    def __enter__(self):
      from sentence_transformers import SentenceTransformer

        # Load the model. Tip: MPT models may require `trust_remote_code=true`.
      self.model = SentenceTransformer(MODEL_DIR, trust_remote_code=True, revision='v1.0.0')

    @method()
    def generate(self, user_questions):
      return self.model.encode(user_questions)

@stub.function()
@web_endpoint(label='generate')
def get_embedding(snippet: str):
   model = Model()
   return model.generate(snippet)

@stub.local_entrypoint()
def main():
    model = Model()
    questions = [
        # Coding questions
        "Implement a Python function to compute the Fibonacci numbers.",
    ]
    result = model.generate.remote(questions)
    print(result)
