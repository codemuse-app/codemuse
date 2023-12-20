import os
from modal import Image, Secret, Stub, method
import sentry_sdk

import utils

MODEL_DIR = "/model"
BASE_MODEL = "codellama/CodeLlama-7b-Instruct-hf"
TOKENIZER_DIR = "/tokenizer"
TOKENIZER = "codellama/CodeLlama-7b-Instruct-hf"

def download_model_to_folder():
    from huggingface_hub import snapshot_download

    os.makedirs(MODEL_DIR, exist_ok=True)

    snapshot_download(
        BASE_MODEL,
        local_dir=MODEL_DIR,
        token=os.environ["HUGGINGFACE_TOKEN"],
    )

    snapshot_download(
        TOKENIZER,
        local_dir=TOKENIZER_DIR,
        token=os.environ["HUGGINGFACE_TOKEN"],
    )

    from transformers import CodeLlamaTokenizerFast
    CodeLlamaTokenizerFast.from_pretrained(TOKENIZER_DIR)

    return


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
    .pip_install(["hf-transfer", "sentry-sdk", "posthog", 'transformers[torch]'])
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("huggingface"),
        timeout=60 * 20,
    )
)

stub = Stub("documentation", image=image)

@stub.cls(gpu="A10G", secret=Secret.from_name("huggingface"), concurrency_limit=5, allow_concurrent_inputs=50, container_idle_timeout=60, timeout=60 * 20)
class Model:
    def __enter__(self):
        from vllm.engine.arg_utils import AsyncEngineArgs
        from vllm.engine.async_llm_engine import AsyncLLMEngine
        from transformers import CodeLlamaTokenizerFast

        engine_args = AsyncEngineArgs(model=MODEL_DIR, gpu_memory_utilization=0.95)
        self.llm = AsyncLLMEngine.from_engine_args(engine_args)
        self.tokenizer = CodeLlamaTokenizerFast.from_pretrained(TOKENIZER_DIR)
        self.template = """<s>[INST] <<SYS>>

{system}
<</SYS>>

```python
{code}
````

Briefly explain the above code. Focus on business aspects, and be as concise as possible. If possible, only use one short sentence.[/INST] """


    @method()
    @utils.with_sentry_generator
    async def generate(self, code: str):
        from vllm import SamplingParams
        from vllm.utils import random_uuid

        # --------------------
        # IMPORTANT
        # --------------------
        # This number has been determined empirically depending on the current prompt token count. If you change the prompt, you may need to change this number.
        # Changing the GPU may also change this number.
        MAX_CODE_TOKENS = 12000

        # Check if the input goes over the token limit of MAX_CODE_TOKENS. If it does, truncate it. Use vllm tokenizer to get the exact token count.
        # TODO: would it be smarter to take some part from the beginning and some part from the end?
        with sentry_sdk.start_span(op="tokenize"):
            if len(self.tokenizer.encode(code)) > MAX_CODE_TOKENS:
                code = self.tokenizer.decode(self.tokenizer.encode(code)[0:MAX_CODE_TOKENS])

        prompt = self.template.format(
            system="You are a skilled senior developer who is asked to explain the code to a new hire. You are synthetic, and you are trying to explain the code to a human. You focus on business aspects rather than framework details. You use simple english language, with declarative sentences. You do not talk about 'this code' or 'that snippet', but just explain straight to the point.",
            code=code
        )

        sampling_params = SamplingParams(
            temperature=0.0,
            top_p=1,
            max_tokens=800,
            presence_penalty=1.15,
        )
        request_id = random_uuid()
        results_generator = self.llm.generate(prompt, sampling_params, request_id)

        index = 0

        with sentry_sdk.start_span(op="generate"):
            async for request_output in results_generator:
                if "\ufffd" == request_output.outputs[0].text[-1]:
                    continue
                yield request_output.outputs[0].text[index:]
                index = len(request_output.outputs[0].text)
