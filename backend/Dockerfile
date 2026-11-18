FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts

EXPOSE 8000

# Keep model download independent from the API image.  In particular, the
# downloader only needs the Hub client and must not pull PyTorch into backend.
FROM python:3.12-slim AS model-downloader
WORKDIR /app
RUN python -m pip install --no-cache-dir huggingface-hub==0.36.0
COPY scripts/download_recommender_model.py ./download_recommender_model.py
CMD ["python", "download_recommender_model.py"]

FROM base AS development
COPY requirements-dev.txt ./
COPY pyproject.toml ./
COPY tests ./tests
COPY integration ./integration
COPY dev-entrypoint.sh ./
RUN python -m pip install --no-cache-dir -r requirements-dev.txt
CMD ["sh", "./dev-entrypoint.sh"]

FROM base AS production
CMD ["sh", "-c", "alembic upgrade head && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
