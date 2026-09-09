# proj-lab-eng-soft
Book reading and publishing app designed for the Software Engineering Lab. Class

Para executar o ambiente de desenvolvimento, instale o Docker Engine com o
plugin Docker Compose 2.20 ou superior (ou use o Docker Desktop). A versão do
Compose é necessária por causa do `include` usado no arquivo da raiz.

Na raiz de `proj-lab-eng-soft`, execute:

```bash
docker compose up --build
```

O arquivo da raiz carrega `infra/docker-compose.dev.yml` e usa `infra/.env.dev`
para preencher as variáveis de configuração.

| Serviço | Endereço local |
| --- | --- |
| Frontend Next.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| Documentação da API | http://localhost:8000/docs |
| PostgreSQL 16 | localhost:5432 |

O backend usa Python 3.14 e inicia a aplicação `app` de `backend/app/Main.py`.
As dependências são instaladas a partir de `backend/requirements.txt`; o `.venv`
local não é necessário para executar os contêineres. Alterações em `backend/app`
reiniciam a API automaticamente, e o frontend roda com `next dev`.

O Compose aguarda o PostgreSQL ficar disponível antes de iniciar o backend, e
aguarda a API responder antes de iniciar o frontend. O banco persiste os dados
no volume `pgdata-dev`. Esta configuração é para desenvolvimento local.

O backend recebe `DATABASE_URL`, com o banco no endereço `db:5432`, e o servidor
Next.js recebe `BACKEND_URL=http://backend:8000`. Esses nomes funcionam dentro da
rede do Docker; no navegador, use `localhost:8000` para acessar a API. A aplicação
ainda precisa implementar a conexão com o banco e as chamadas do frontend à API.

Para acompanhar os logs do backend:

```bash
docker compose logs -f backend
```

Depois de alterar as dependências, reconstrua as imagens e renove os volumes
anônimos de dependências do frontend (o volume nomeado do PostgreSQL é mantido):

```bash
docker compose up --build --renew-anon-volumes
```

Para parar e remover os contêineres, preservando os dados do banco:

```bash
docker compose down
```

O Dockerfile do backend também tem um estágio `production`, que inicia a API sem
recarga automática. Para construir e executar somente essa imagem:

```bash
docker build --target production -t proj-lab-eng-soft-backend ./backend
docker run --rm -p 127.0.0.1:8000:8000 proj-lab-eng-soft-backend
```

Referências: [FastAPI com Docker](https://fastapi.tiangolo.com/deployment/docker/),
[include do Compose](https://docs.docker.com/reference/compose-file/include/) e
[ordem de inicialização](https://docs.docker.com/compose/how-tos/startup-order/).
