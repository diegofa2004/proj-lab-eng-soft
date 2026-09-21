# Contribution guide

Each feature should be small, have one owner, and be developed in its own branch.
Before opening a pull request, update your branch from the main branch and run
the quality commands in the README.

## Backend

A new entity normally follows this flow:

```text
models/book.py             SQLAlchemy table
schemas/book.py            input and output contracts
api/endpoints/books.py     HTTP routes
api/router.py              router registration
alembic/versions/          database migration
tests/test_books.py        API scenarios
```

Use `User` as the complete example: the model describes the table, Pydantic
schemas define the contract, endpoints handle HTTP, and tests exercise routes.

### Routes and responses

- Use English plural resource names: `/books`, `/authors`.
- Declare `response_model` on every route that returns data.
- Never return internal fields, such as password hashes.
- Use `201` for creation, `204` for deletion without a body, `404` for a missing resource, `409` for conflicts, and `422` for invalid data.
- HTTP errors must use `HTTPException` and a short `detail` message.
- Routes requiring a session receive `current_user: User = Depends(get_current_user)`.

### Database and migrations

Do not use `Base.metadata.create_all()` in the application. Every table, column,
index, or constraint change requires a versioned Alembic migration.

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose exec backend alembic upgrade head
```

Review the generated migration: autogeneration is a starting point, not a full
automatic review. A migration must have safe `upgrade()` and `downgrade()`
operations. Do not edit a migration already merged into the main branch; create
another one.

### Tests

For each endpoint, cover at least one successful case and every applicable
validation, missing-resource, conflict, or authorization case. Tests use a
temporary SQLite database and override only the application's database session.

## Frontend

```text
app/books/page.tsx              page
app/books/[id]/page.tsx         dynamic page
app/api/books/route.ts          Route Handler that calls the backend
components/books/book-form.tsx  reusable component
```

Pages and interface text are written in English. Browser calls must go to
`/api/*`; Route Handlers use `BACKEND_URL` to call FastAPI within the Docker
network. Do not expose tokens to browser JavaScript: the session uses the
HTTP-only cookie defined in `app/lib/session.ts`.

## Pull request checklist

- The feature has models, schemas, routes, migrations, and tests where needed.
- The migration was reviewed and is included in the pull request.
- No secret, personal `.env`, hash, or password is in the code.
- Interface text is in English.
- Ruff, pytest, lint, and TypeScript pass.
