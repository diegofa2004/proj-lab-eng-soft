#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  database_host="${POSTGRES_HOST:-143.107.102.29}"
  database_port="${POSTGRES_PORT:-65432}"
  database_user="${POSTGRES_USER:-admin_t3_g2}"
  database_name="${POSTGRES_DB:-t3_grupo_2}"

  if [[ ! -t 0 ]]; then
    echo "Set DATABASE_URL when running outside an interactive terminal." >&2
    exit 1
  fi

  echo "LivrUSP connects to the shared PostgreSQL server at ${database_host}:${database_port}."
  read -r -p "Shared database password: " database_password

  if [[ -z "${database_password}" ]]; then
    echo "A database password is required." >&2
    exit 1
  fi

  encoded_password="$(printf '%s' "${database_password}" | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""))')"
  unset database_password
  export DATABASE_URL="postgresql+psycopg2://${database_user}:${encoded_password}@${database_host}:${database_port}/${database_name}"
fi

exec docker compose up --build "$@"
