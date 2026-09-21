# LivrUSP
Book reading and publishing application for the Software Engineering Laboratory.

To run the development environment, install Docker Engine with Docker Compose
plugin 2.20 or later, or use Docker Desktop. That Compose version is required
because the root file uses `include`.

From the `proj-lab-eng-soft` root directory, run:

```bash
docker compose up --build
```

The root file includes `infra/docker-compose.dev.yml` and uses `infra/.env.dev`
to provide configuration variables.

| Service | Local address |
| --- | --- |
| Frontend Next.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| API documentation | http://localhost:8000/docs |
| PostgreSQL 16 | localhost:5432 |

The backend uses Python 3.14 and starts the `app` application in
`backend/app/main.py`. Dependencies are installed from
`backend/requirements.txt`; a local `.venv` is not required to run containers.
Changes in `backend/app` automatically restart the API, and the frontend runs
with `next dev`.

Compose waits for PostgreSQL before starting the backend and waits for the API
before starting the frontend. Database data persists in the `pgdata-dev` volume.
This configuration is for local development.

The backend receives `DATABASE_URL`, with the database at `db:5432`, and the
Next.js server receives `BACKEND_URL=http://backend:8000`. These names work
inside the Docker network; use `localhost:8000` in the browser to access the
API. The backend uses SQLAlchemy and one PostgreSQL session per request.

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
docker compose up --build --renew-anon-volumes
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
