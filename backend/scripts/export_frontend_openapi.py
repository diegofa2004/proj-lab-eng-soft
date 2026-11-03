"""Export the v2 API contract consumed by the frontend kit."""

import json
from pathlib import Path

from app.main import app


def referenced_schemas(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "$ref" and isinstance(item, str) and item.startswith("#/components/schemas/"):
                yield item.rsplit("/", 1)[-1]
            else:
                yield from referenced_schemas(item)
    elif isinstance(value, list):
        for item in value:
            yield from referenced_schemas(item)


def main() -> None:
    source = app.openapi()
    paths = {
        path.removeprefix("/v2"): operation
        for path, operation in source["paths"].items()
        if path.startswith("/v2/")
    }
    all_schemas = source["components"]["schemas"]
    needed = set(referenced_schemas(paths))
    queue = list(needed)
    while queue:
        name = queue.pop()
        for dependency in referenced_schemas(all_schemas[name]):
            if dependency not in needed:
                needed.add(dependency)
                queue.append(dependency)
    document = {
        "openapi": source["openapi"],
        "info": source["info"],
        "servers": [{"url": "/v2"}],
        "paths": paths,
        "components": {
            "schemas": {name: all_schemas[name] for name in sorted(needed)},
            **(
                {"securitySchemes": source["components"]["securitySchemes"]}
                if "securitySchemes" in source["components"]
                else {}
            ),
        },
    }
    target = Path(__file__).resolve().parents[1] / "frontend-kit/openapi.json"
    target.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
