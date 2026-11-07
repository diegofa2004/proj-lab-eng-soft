# LivrUSP · API para o frontend

FastAPI, PostgreSQL e arquivos EPUB3 persistentes. Execute os comandos na pasta que contém compose.yaml. Requer Docker com Compose v2 e Python 3 para gerar a chave local.

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

Abra [Swagger](http://localhost:8000/docs). A carga de exemplo inclui um livro EPUB3, autor e gênero, avatar, nível e plano. Pode ser repetida. Registre um usuário em `POST /register`. Para testar administração com uma **segunda conta local**, registre-a e execute `docker compose exec api python -m app.seed --grant-admin SEU_USERNAME`. O cadastro público sempre cria um leitor. Os volumes preservam banco e EPUBs ao reiniciar.

### Importar Project Gutenberg em lote

O importador usa o catálogo do Gutendex para descobrir metadados e baixa somente o EPUB3 hospedado no Project Gutenberg. Ele cria autores, gêneros e vínculos, grava o arquivo no volume `books` e pode ser executado novamente sem duplicar os ebooks já importados. Informe um `User-Agent` identificável e mantenha uma taxa moderada de download.

```sh
# A partir da raiz do repositório (compose de desenvolvimento)
docker compose exec backend python -m scripts.import_gutenberg \
  --limit 100 --language en --delay 2 \
  --user-agent "LivrUSP catalog importer (contato: seu-email@exemplo.com)"
```

Comece com 10 livros para validar o catálogo. `--limit 1000` continuará por tantas páginas do catálogo quanto necessário, sempre um download por vez. O campo legado `total_paginas` é preenchido como uma posição inicial de progresso porque EPUB não possui uma contagem de páginas fixa; o leitor EPUB deverá fornecer posições reais depois.

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
| Leitor | GET /books/{id}/content | EPUB3 binário. Visitantes podem baixar ou abrir obras publicadas em um leitor compatível. Para associar o acesso à conta, envie Bearer e use um blob. Revogue a URL de objeto ao fechar o leitor. |
| Estante e favoritos | GET /me/lists, PUT/DELETE /me/lists/{tipo}/{book_id} | Tipos favorito e ler_depois. PUT é idempotente. |
| Notas privadas | GET/POST /me/notes, PATCH/DELETE /me/notes/{id} | Filtre com book_id. Só o dono pode ler ou alterar as notas. |
| Avaliações | GET /books/{id}/reviews, PUT/DELETE /books/{id}/review | Uma avaliação por usuário e livro, entre 1 e 5. A avaliação moderada fica oculta. |
| Progresso e sessão | GET /me/progress, PUT /me/progress/{book_id}, POST /me/sessions/{book_id}, GET /me/sessions, PUT /me/sessions/{session_id}/end | Abra o EPUB com Bearer antes de informar posições lidas. Envie o total **cumulativo** de posições distintas e a última posição. Abrir uma sessão devolve a sessão ainda aberta para aquele livro. Encerrar usa segundos ativos, limitados ao tempo decorrido. |
| Painel e pontos | GET /me/dashboard e /me/points | Ao atingir a última página na contagem distinta, o servidor concede 1 ponto uma única vez por livro. O exemplo libera publicação também aos 5 pontos. |
| Publicação | GET /me/books, POST /books, PUT /books/{id}/content, PUT /books/{id} | Crie rascunho, envie EPUB3 válido via multipart (campo file, máximo 50 MiB), depois envie **todos** os metadados com status_publicacao=publicado. `total_paginas` continua sendo a referência de progresso do catálogo. PUT substitui as listas de autores e gêneros. Use arquivado para retirar do catálogo. |
| Premium | GET /plans e /billing/config, POST /me/checkout, GET /me/subscriptions e /me/payments, DELETE /me/subscriptions/{id} | Em demo, envie apenas id_plano. Preço, moeda, duração e confirmação vêm do servidor. Repetir a compra do plano ativo devolve o mesmo pagamento. Cancelamento encerra o acesso imediatamente. |
| Administração | GET /admin/users, /admin/books, /admin/reviews, /admin/actions, /admin/dashboard; POST /admin/actions | Bloquear/desbloquear livros e leitores, moderar avaliações e consultar métricas. Alteração e registro de moderação ocorrem na mesma transação. |
| Referências | POST/PATCH /admin/authors, /admin/genres, /admin/assets, /admin/levels, /admin/plans | POST na coleção e PATCH em /{id}. Desative planos com ativo=false. GET /admin/plans inclui os inativos. |

### Limites e decisões do projeto

O modo de pagamento **é uma simulação local**. Nenhum cartão é solicitado ou cobrado. Com DEMO_BILLING=false, o checkout responde 503 até que um provedor real e a confirmação de pagamento no servidor sejam implementados. O frontend deve consultar /billing/config para mostrar o estado correto. Os EPUBs ficam no volume books com nome baseado no ID. O servidor valida a estrutura EPUB3 e limita o tamanho compactado a 50 MiB (e o descompactado a 250 MiB). Para consultar cadastros de autores e gêneros ao criar uma publicação, use os endpoints de referências; o administrador cadastra novos nomes. A política de pontos e o preço da carga inicial são exemplos de produto.

As rotas antigas continuam disponíveis. `POST /books` agora cria somente um rascunho e não aceita caminho de arquivo enviado pelo cliente; use o fluxo `/v2/books/{id}/content` e `/v2/books/{id}` para publicar. `GET /books/{id}/read` retorna metadados e não registra acesso. A penalidade por inatividade é calculada pelo servidor com base em `ultima_atividade` no primeiro acesso após um intervalo sem atividade; `POST /users/me/inactivity` não aceita mais `days`.

### Banco existente e testes

Faça backup antes de migrar um banco existente. A revisão 0002 importa usuários da 0001 com e-mails normalizados e hashes preservados, atribuindo novos IDs na tabela atual. Registros com e-mail longo, inválido ou conflitante ficam em `plataforma.usuario_legado_pendente` para revisão manual, sem interromper a migração. A revisão 0003 faz a mesma reconciliação em bancos que já tinham aplicado a versão antiga da 0002 e ainda mantinham `public.users`. A revisão 0004 restaura a unicidade de `nome_perfil` caso a restrição esteja ausente. Os downgrades destrutivos foram desativados. O Compose cria uma base local; para trabalhar com outro PostgreSQL ajuste DATABASE_URL e as origens CORS.

A suíte rápida usa SQLite apenas para autenticação. A integração usa uma **base PostgreSQL de testes já migrada** e cria usuários e registros nela. Com Python 3.12 e um ambiente virtual:

```sh
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -q tests
# Em uma base dedicada: export DATABASE_URL, JWT_SECRET_KEY e DEMO_BILLING=true
python -m alembic upgrade head
python -m pytest -q integration
```

Para atualizar o kit, execute `python -m scripts.export_frontend_openapi` com as variáveis da API configuradas e gere os tipos com `npx openapi-typescript@7.10.1 frontend-kit/openapi.json -o frontend-kit/schema.d.ts`.
