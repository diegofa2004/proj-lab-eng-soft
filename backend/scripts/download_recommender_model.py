"""Download the configured sentence embedding model into the shared volume."""

import os
from pathlib import Path

from huggingface_hub import snapshot_download


def main() -> None:
    model_id = os.environ.get(
        "RECOMMENDER_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2"
    )
    model_path = Path(os.environ.get("RECOMMENDER_MODEL_PATH", "/models/all-MiniLM-L6-v2"))
    model_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Preparing recommendation model {model_id} at {model_path}", flush=True)
    snapshot_download(repo_id=model_id, local_dir=model_path)
    print("Recommendation model is ready.", flush=True)


if __name__ == "__main__":
    main()
