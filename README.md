# LivrUSP
Book reading and publishing application for the Software Engineering Laboratory.

To run the development environment, install Docker Engine with Docker Compose
plugin 2.20 or later, or use Docker Desktop. That Compose version is required
because the root file uses `include`.

From the `proj-lab-eng-soft` root directory, run:

```bash
./scripts/dev-up.sh
```

Use this script instead of running `docker compose up` directly. It requests
the shared database password without displaying or storing it, exports the
connection only for that Compose session, and then starts the stack. To run in
the background, pass `-d`:

```bash
./scripts/dev-up.sh -d
```

The root file includes `infra/docker-compose.dev.yml`. On first startup, the
backend generates a private JWT key in the `jwt-secret-dev` Docker volume.
The key survives container restarts and `docker compose down`; no local env
file or manual setup is needed. To override it, set `JWT_SECRET_KEY` in your
shell before running Compose.

| Service | Local address |
| --- | --- |
| Frontend Next.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| API documentation | http://localhost:8000/docs |
| PostgreSQL compartilhado | 143.107.102.29:65432 |

The backend uses Python 3.14 and starts the `app` application in
`backend/app/main.py`. Dependencies are installed from
`backend/requirements.txt`; a local `.venv` is not required to run containers.
Changes in `backend/app` automatically restart the API, and the frontend runs
with `next dev`.

Compose connects the backend to the PostgreSQL compartilhado before starting the
frontend. This configuration is for local development against the shared
database.

## Administrator dashboard

The public sign-up always creates a reader account. To use the administrator
dashboard locally, register a separate account and explicitly promote it:

```bash
docker compose exec backend python -m app.seed --grant-admin YOUR_USERNAME
```

Sign in with that account to open `/admin`. The dashboard can search users and
books, inspect a user's comments, suspend or restore non-administrator accounts,
remove comments, and hide or restore books in the public catalog. Book removal
is reversible: it does not delete EPUB files or reading history. The API checks
administrator privileges for every action; hiding the dashboard from readers
is not the security boundary.

The development launcher asks for the shared PostgreSQL password without
echoing or storing it. The host, port, user and database are configured in
`infra/.env.dev`. The Next.js server receives `BACKEND_URL=http://backend:8000`.
Use `localhost:8000` in the browser to access the API. The backend uses
SQLAlchemy and one PostgreSQL session per request.

## Database

Alembic controls the schema. Pending migrations run automatically when the
backend starts through Docker. To generate a migration after changing a
SQLAlchemy model:

```bash
docker compose exec backend alembic revision --autogenerate -m "create books"
```

Review the generated file in `backend/alembic/versions/`. To apply migrations:

```bash
docker compose exec backend alembic upgrade head
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the new-feature skeleton, API
conventions, and pull request checklist.

To follow backend logs:

```bash
docker compose logs -f backend
```

After changing dependencies, rebuild images and renew the frontend anonymous
dependency volumes. The named PostgreSQL volume is preserved:

```bash
./scripts/dev-up.sh --renew-anon-volumes
```

To stop and remove containers while preserving database data:

```bash
docker compose down
```

The backend Dockerfile also has a `production` stage that starts the API without
automatic reload. To build and run only that image:

```bash
docker build --target production -t proj-lab-eng-soft-backend ./backend
docker run --rm -p 127.0.0.1:8000:8000 proj-lab-eng-soft-backend
```

References: [FastAPI with Docker](https://fastapi.tiangolo.com/deployment/docker/),
[Compose include](https://docs.docker.com/reference/compose-file/include/), and
[startup order](https://docs.docker.com/compose/how-tos/startup-order/).
