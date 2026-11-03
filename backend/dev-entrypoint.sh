#!/bin/sh
set -eu

if [ -z "${JWT_SECRET_KEY:-}" ]; then
    secret_file=/run/livrusp-dev/jwt-secret
    if [ ! -s "$secret_file" ]; then
        umask 077
        python -c 'import secrets; print(secrets.token_hex(32))' > "$secret_file"
    fi
    JWT_SECRET_KEY=$(cat "$secret_file")
    export JWT_SECRET_KEY
fi

alembic upgrade head
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
