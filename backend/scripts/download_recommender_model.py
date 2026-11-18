"""Download the configured sentence embedding model into the shared volume."""

import os
from pathlib import Path
import sys

from huggingface_hub import snapshot_download


def main() -> None:
    model_id = os.environ.get(
        "RECOMMENDER_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2"
    )
    model_path = Path(os.environ.get("RECOMMENDER_MODEL_PATH", "/models/all-MiniLM-L6-v2"))
    model_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Preparing recommendation model {model_id} at {model_path}", flush=True)
    try:
        snapshot_download(
            repo_id=model_id,
            local_dir=model_path,
            allow_patterns=[
                "1_Pooling/config.json",
                "config.json",
                "config_sentence_transformers.json",
                "modules.json",
                "model.safetensors",
                "pytorch_model.bin",
                "sentence_bert_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.txt",
            ],
        )
    except Exception as error:
        # The API and the rest of the development stack should remain usable
        # while the model host is temporarily unavailable.  Hugging Face Hub
        # resumes partial files on the next `docker compose up`.
        print(
            f"Model download did not finish: {error}. "
            "The app can start without semantic discovery; retry with docker compose up.",
            file=sys.stderr,
            flush=True,
        )
        return
    print("Recommendation model is ready.", flush=True)


if __name__ == "__main__":
    main()
