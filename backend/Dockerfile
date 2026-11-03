FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

EXPOSE 8000

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
