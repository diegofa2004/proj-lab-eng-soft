# Auditoria de backend e PostgreSQL — 2026-11-03

Base analisada: `main` em `3cc148a`. Os problemas de API foram reproduzidos em bancos PostgreSQL temporários, apagados após os testes. No banco de desenvolvimento real foram feitas apenas consultas de leitura. Este documento registra os achados confirmados para acompanhamento; não indica que todos já foram corrigidos.

## Estado do banco real

- O schema `plataforma` contém 19 tabelas, 111 colunas, 6 views e 5 triggers. A comparação realizada não encontrou diferenças de colunas, nulidade, chaves estrangeiras ou checks em relação aos modelos examinados.
- A versão Alembic registrada é `20261013_0002`. Ainda existe `public.users`, com 1 usuário que não corresponde por e-mail nem por nome a `plataforma.usuario` (4 usuários). A migração atual copia e remove `public.users`; a causa do estado atual não foi determinada.
- No momento da inspeção, não havia livros publicados nem progresso de leitura no banco real. Logo, os defeitos de leitura abaixo foram reproduzidos em bancos temporários, sem afirmar que já afetaram dados reais.

## Problemas confirmados

### Banco e migrações

1. `public.users` permanece no banco real com 1 usuário sem correspondência na tabela atual. Ver `backend/alembic/versions/20261013_0002_create_plataforma.py`.
2. `alembic check` acusa tabelas de `plataforma` como novas e `public.users` como removida: `backend/alembic/env.py` não configura `include_schemas=True`.
3. A migração `0002` falha se a tabela legada contiver e-mails distintos apenas por caixa: a normalização com `lower(trim(email))` colide com `UNIQUE(email)` na nova tabela. Reproduzido com dados sintéticos.
4. A migração `0002` falha se um e-mail legado tiver de 255 a 320 caracteres: `0001` aceita 320, enquanto a nova coluna aceita 254. Reproduzido.
5. Há 24 índices de desempenho criados por SQL na migração `0002` que não estão declarados no ORM. Isso compromete a comparação/autogeração futura de migrações após corrigir o escopo de schemas.

### Validação e integridade da API

6. Nota com texto composto só de espaços passa no Pydantic e falha no check do banco. `POST /users/me/notes` retorna 500; `POST /v2/me/notes`, 409. Ver `app/schemas/nota_pessoal.py`.
7. Schemas `PATCH` aceitam `null` para campos obrigatórios. Reproduzido: `texto: null` em nota retorna 500 na API antiga e 409 na v2; `titulo: null` em livro retorna 500; `nome: null` em autor retorna 409. O mesmo padrão aparece em gênero, nível, plano e asset.
8. Avaliação com texto só de espaços é rejeitada pelo banco, mas a API antiga retorna 409 com a mensagem incorreta "You have already reviewed this book"; a v2 retorna 409 genérico. Ver `app/api/books.py` e `app/api/endpoints/reading.py`.
9. `paginas_distintas_lidas: null` em `PATCH /books/{id}/progress` provoca 500 por comparação de `None` com inteiro.
10. `total_paginas: 2147483648` passa na validação do `PATCH /admin/books/{id}` e provoca 500 por exceder o `INTEGER` do PostgreSQL.
11. `LivroCreate` exige `id_publicador` quando o cliente informa `origem=usuario`, mas `POST /books` ignora os dois valores e grava o usuário autenticado e `origem=usuario`. Um pedido com `origem=catalogo` foi aceito e gravado como `usuario`.

### Leitura, conteúdo e pontos

12. `PATCH /books/{id}/progress` aceita `concluido_em` com zero páginas. O dashboard conta um livro concluído sem ponto correspondente.
13. `PUT /v2/me/progress/{id}` concede ponto ao receber o total de páginas, mesmo sem qualquer acesso ao PDF. Reproduzido com zero registros em `acesso_livro`.
14. Após receber ponto, a API antiga permite limpar `concluido_em`; a v2 tenta conceder o mesmo ponto de novo e retorna 409, deixando conclusão e recompensa inconsistentes.
15. `PATCH /admin/books/{id}` permite reduzir `total_paginas` abaixo de progressos já gravados. Reproduzido com livro de 1 página e progresso de 2.
16. `POST /books` publica livro com caminho de PDF inexistente. A publicação retornou 201 e `GET /v2/books/{id}/content` retornou 404.
17. O upload v2 confere apenas o prefixo `%PDF-`. Um arquivo de 28 bytes que não era um PDF válido foi aceito, publicado e servido com 200.
18. `GET /books/{id}/read` cria um evento de acesso por chamada, embora só retorne metadados. Duas chamadas sem buscar o conteúdo geraram dois acessos.

### Administração e métricas

19. `POST /admin/users/{id}/block` permite que o administrador bloqueie a própria conta; depois recebe 403. A rota v2 protege contas administrativas, mas a rota antiga não.
20. `POST /users/me/inactivity?days=100` permite que o usuário escolha uma penalidade de 100 pontos. `ultima_atividade` não é atualizada pelas rotas examinadas; o teste levou o saldo de 1 a -99.
21. Na busca antiga, `sort=rating` ordena por data de publicação e `sort=popularity` por data de criação, sem usar avaliação ou acessos.

## JWT no Compose

O problema anterior de startup por segredo JWT foi corrigido depois desta auditoria: o Compose de desenvolvimento deixou de exigir `infra/.env.local`, gera um segredo aleatório em volume persistente no primeiro início e permite que processos de `docker compose exec` leiam a mesma chave. O valor do segredo não é registrado neste documento.
