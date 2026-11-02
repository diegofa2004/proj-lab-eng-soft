# LivrUSP · API para o frontend

FastAPI, PostgreSQL e arquivos PDF persistentes. Execute os comandos na pasta que contém compose.yaml. Requer Docker com Compose v2 e Python 3 para gerar a chave local.

## Iniciar

```sh
cp .env.example .env
python3 - <<'PY'
from pathlib import Path
from secrets import token_hex
p = Path(".env")
p.write_text(p.read_text().replace("JWT_SECRET_KEY=\n", "JWT_SECRET_KEY="+token_hex(32)+"\n")
             .replace("DEMO_BILLING=false", "DEMO_BILLING=true"))
PY
docker compose up --build -d
docker compose logs -f api
```

Quando o Uvicorn estiver pronto, saia dos logs com Ctrl+C e carregue os exemplos.

```sh
docker compose exec api python -m app.seed
curl http://localhost:8000/health
```

Abra [Swagger](http://localhost:8000/docs). A carga de exemplo inclui um livro de duas páginas com PDF, autor e gênero, avatar, nível e plano. Pode ser repetida. Registre um usuário em `POST /register`. Para testar administração com uma **segunda conta local**, registre-a e execute `docker compose exec api python -m app.seed --grant-admin SEU_USERNAME`. O cadastro público sempre cria um leitor. Os volumes preservam banco e PDFs ao reiniciar.

## Conectar React/Vite

Defina `VITE_API_URL=http://localhost:8000/v2` no projeto frontend. Copie `frontend-kit/client.ts` e `schema.d.ts` para a mesma pasta em src. O contrato do kit usa caminhos relativos a /v2. O endpoint /openapi.json descreve as duas versões da API. As rotas da tabela abaixo são relativas a /v2. O JSON usa os nomes em português das entidades; as rotas de autenticação mantêm os nomes originais em inglês. Datas são ISO 8601 e valores monetários são decimais serializados como strings.

```ts
import { livrusp } from "./client";
let token: string | null = null;
const api = livrusp(import.meta.env.VITE_API_URL, () => token);
const session = await api.login({ username: "leitor", password: "sua-senha" });
token = session.access_token;
const perfil = await api.profile();
const livros = await api.books();
```

O exemplo mantém a sessão em memória. No logout, descarte o token. Quando a API devolver 401, peça novo login. Use `is_admin`, `is_premium` e `pode_publicar` de `/me/profile` para decidir quais controles mostrar. O servidor também verifica as permissões. O campo `detail` contém uma mensagem ou, em erros de validação 422, uma lista de erros por campo. 403 indica falta de permissão ou conta bloqueada, 404 recurso indisponível, 409 conflito. As listas retornam arrays; catálogo e tabelas administrativas aceitam limit e offset.

| Tela | Chamadas principais | Comportamento |
|---|---|---|
| Conta e perfil | POST /register, POST /login, GET /me, GET/PATCH /me/profile, GET /profiles/{id}, GET /assets e /levels | Login retorna access_token. PATCH altera só os campos enviados. Use null para remover avatar ou ícone. |
| Catálogo e detalhe | GET /books, /books/{id}, /authors, /genres | Busca q por título ou autor, filtros genre e author por ID, paginação a partir de offset=0. O detalhe inclui autores, gêneros e estatísticas. |
| Leitor | GET /books/{id}/content | PDF binário. Visitantes podem ler obras publicadas. Para associar o acesso à conta, envie Bearer e use um blob. Revogue a URL de objeto ao fechar o leitor. |
| Estante e favoritos | GET /me/lists, PUT/DELETE /me/lists/{tipo}/{book_id} | Tipos favorito e ler_depois. PUT é idempotente. |
| Notas privadas | GET/POST /me/notes, PATCH/DELETE /me/notes/{id} | Filtre com book_id. Só o dono pode ler ou alterar as notas. |
| Avaliações | GET /books/{id}/reviews, PUT/DELETE /books/{id}/review | Uma avaliação por usuário e livro, entre 1 e 5. A avaliação moderada fica oculta. |
| Progresso e sessão | GET /me/progress, PUT /me/progress/{book_id}, POST /me/sessions/{book_id}, GET /me/sessions, PUT /me/sessions/{session_id}/end | Envie o total **cumulativo** de páginas distintas e a última posição. Abrir uma sessão devolve a sessão ainda aberta para aquele livro. Encerrar usa segundos ativos, limitados ao tempo decorrido. |
| Painel e pontos | GET /me/dashboard e /me/points | Ao atingir a última página na contagem distinta, o servidor concede 1 ponto uma única vez por livro. O exemplo libera publicação também aos 5 pontos. |
| Publicação | GET /me/books, POST /books, PUT /books/{id}/content, PUT /books/{id} | Crie rascunho, envie PDF via multipart (campo file, máximo 20 MiB), depois envie **todos** os metadados com status_publicacao=publicado. PUT substitui as listas de autores e gêneros. Use arquivado para retirar do catálogo. |
| Premium | GET /plans e /billing/config, POST /me/checkout, GET /me/subscriptions e /me/payments, DELETE /me/subscriptions/{id} | Em demo, envie apenas id_plano. Preço, moeda, duração e confirmação vêm do servidor. Repetir a compra do plano ativo devolve o mesmo pagamento. Cancelamento encerra o acesso imediatamente. |
| Administração | GET /admin/users, /admin/books, /admin/reviews, /admin/actions, /admin/dashboard; POST /admin/actions | Bloquear/desbloquear livros e leitores, moderar avaliações e consultar métricas. Alteração e registro de moderação ocorrem na mesma transação. |
| Referências | POST/PATCH /admin/authors, /admin/genres, /admin/assets, /admin/levels, /admin/plans | POST na coleção e PATCH em /{id}. Desative planos com ativo=false. GET /admin/plans inclui os inativos. |

### Limites e decisões do projeto

O modo de pagamento **é uma simulação local**. Nenhum cartão é solicitado ou cobrado. Com DEMO_BILLING=false, o checkout responde 503 até que um provedor real e a confirmação de pagamento no servidor sejam implementados. O frontend deve consultar /billing/config para mostrar o estado correto. Os PDFs ficam no volume books com nome baseado no ID. Para obras de uma instalação anterior, importe os arquivos pelo endpoint de upload. Para consultar cadastros de autores e gêneros ao criar uma publicação, use os endpoints de referências; o administrador cadastra novos nomes. A política de pontos e o preço da carga inicial são exemplos de produto.

### Banco existente e testes

Faça backup antes de migrar um banco existente. A revisão 0002 move usuários da 0001 preservando IDs e hashes; emails são normalizados. Conflitos após normalização fazem a transação falhar para revisão manual. O downgrade destrutivo foi desativado. Se a antiga 0002 já foi aplicada e removeu dados, recupere-os de um backup. O Compose cria uma base local; para trabalhar com outro PostgreSQL ajuste DATABASE_URL e as origens CORS.

A suíte rápida usa SQLite apenas para autenticação. A integração usa uma **base PostgreSQL de testes já migrada** e cria usuários e registros nela. Com Python 3.12 e um ambiente virtual:

```sh
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -q tests
# Em uma base dedicada: export DATABASE_URL, JWT_SECRET_KEY e DEMO_BILLING=true
python -m alembic upgrade head
python -m pytest -q integration
```

Para atualizar o kit, exporte somente as rotas sob /v2 de /openapi.json, remova o prefixo /v2 dos caminhos e use /v2 como URL base. Gere os tipos com `npx openapi-typescript frontend-kit/openapi.json -o frontend-kit/schema.d.ts`.
