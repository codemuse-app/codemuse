import os

from modal import Image, Secret, Stub, method, web_endpoint

MODEL_DIR = "/model"
BASE_MODEL = "codellama/CodeLlama-7b-Instruct-hf"

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
        "nvcr.io/nvidia/pytorch:23.10-py3"
    )
    .pip_install(
        "torch==2.1.0+cu121", index_url="https://download.pytorch.org/whl"
    )
    # Pinned to 10/16/23
    .pip_install(
        "vllm @ git+https://github.com/vllm-project/vllm.git@665cbcec4b963f6ab7b696f3d7e3393a7909003d"
    )
    # Use the barebones hf-transfer package for maximum download speeds. No progress bar, but expect 700MB/s.
    .pip_install("hf-transfer~=0.1")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("huggingface"),
        timeout=60 * 20,
    )
)

stub = Stub("example-vllm-inference", image=image)

@stub.cls(gpu="L4", secret=Secret.from_name("huggingface"), concurrency_limit=1)
class Model:
    def __enter__(self):
        from vllm import LLM

        # Load the model. Tip: MPT models may require `trust_remote_code=true`.
        self.llm = LLM(MODEL_DIR)
        self.template = """<s>[INST] <<SYS>>
{system}
<</SYS>>

{user} [/INST] """

    @method()
    def generate(self, user_questions):
        from vllm import SamplingParams

        print('Generating...')

        prompts = [
            self.template.format(system="", user=q) for q in user_questions
        ]

        print(prompts)

        sampling_params = SamplingParams(
            temperature=0.0,
            top_p=1,
            max_tokens=800,
            presence_penalty=1.15,
        )
        result = self.llm.generate(prompts, sampling_params)

        print(result)

        num_tokens = 0

        for output in result:
            num_tokens += len(output.outputs[0].token_ids)
            print(output.prompt, output.outputs[0].text, "\n\n", sep="")

        print(f"Generated {num_tokens} tokens")

        return result[0].outputs[0].text

# @stub.local_entrypoint()
# def main():
#     model = Model()
#     questions = [
#         # Coding questions
#         "Implement a Python function to compute the Fibonacci numbers.",
#     ]
#     model.generate.remote(questions)

@stub.function()
@web_endpoint(method="POST")
def generate_documentation(item: dict):
    code = item["code"]

    if not code:
        return "No code provided. Please provide a JSON object with a `code` key."

    prompt = f"""```python
{code}
```

Given the above code, write a short description of what the snippet does in simple language. You should describe as much of the specificities and business meaning rather than generic framework inforamtion. Keep it under three sentences.

Good example:

This function computes the price of aluminium given the current tonnage and delivery month.

Bad example:

This is a Django Viewset which has various methods."""

    return Model().generate.remote([prompt]).strip()
