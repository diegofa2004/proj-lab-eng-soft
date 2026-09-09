FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

FROM base AS development
CMD ["python", "-m", "uvicorn", "app.Main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
CMD ["python", "-m", "uvicorn", "app.Main:app", "--host", "0.0.0.0", "--port", "8000"]
