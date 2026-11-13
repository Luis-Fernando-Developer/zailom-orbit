# Zailom Orbit

Plataforma para planejar e gerenciar conteúdo de redes sociais. O MVP já persiste rascunhos e agendamentos no PostgreSQL; o envio automático e as integrações de anúncios ainda não estão habilitados.

## Estrutura

- `frontend/`: aplicação web React + TypeScript + Vite.
- `backend/`: API independente em Node.js + TypeScript.

## Requisitos

- Node.js 22+
- npm 10+

## Desenvolvimento

1. Instale PostgreSQL 16 e crie um banco chamado `orbit`.
2. Copie `.env.example` para `.env` e ajuste a senha, `DATABASE_URL` e `APP_ORIGIN` para o ambiente local.
3. Instale as dependências na raiz:

```bash
npm install
```

4. Aplique as migrações:

```bash
npm run prisma:migrate --workspace @zailom-orbit/backend
```

5. Inicie o backend e o frontend em terminais separados:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

O frontend usa `http://localhost:3001` como API durante o desenvolvimento. A API valida a origem configurada em `APP_ORIGIN`.

## Persistência e autenticação

- PostgreSQL é gerenciado por Prisma. Novas alterações de esquema devem ser versionadas como migrações.
- Cadastro e login criam uma sessão em cookie `HttpOnly`; as senhas são armazenadas com hash scrypt e as rotas de publicações exigem sessão.
- Cada usuário recebe um workspace próprio. As publicações são isoladas por workspace.
- `POST /api/posts`, `GET /api/posts`, `PATCH /api/posts/:id` e `DELETE /api/posts/:id` gerenciam rascunhos e agendamentos. Agendar não publica automaticamente em uma rede.
- Cadastro ainda não inclui confirmação de e-mail nem recuperação de senha; esses fluxos devem ser definidos antes de abrir o cadastro ao público.
- A página de Marketing permite criar rascunhos demonstrativos apenas em memória. Ela não cria campanhas reais nem se conecta às plataformas de anúncios.

## Docker Compose

O Compose provisiona o PostgreSQL, espera o banco ficar saudável, aplica migrações ao iniciar a API e persiste os dados no volume `orbit_postgres_data`. Copie `.env.example` para `.env`, configure uma senha longa composta por caracteres seguros para URL e confirme que a rede externa `zailomOrbit_net` (usada pelo Traefik) já existe antes de iniciar:

```bash
docker compose up --build -d
```

O valor `APP_ORIGIN` precisa ser exatamente a origem do frontend publicado (por exemplo, `https://orbit.zailom.com`). O Compose habilita `TRUST_PROXY` porque o serviço recebe tráfego pelo Traefik; mantenha essa opção ligada apenas quando a API estiver atrás de um proxy confiável.

## Diretrizes

- O frontend é uma SPA administrativa.
- A API é independente do frontend; nesta etapa, as rotas de escrita só aceitam requisições da origem do frontend configurada em `APP_ORIGIN`. Integrações server-to-server futuras devem receber um mecanismo de credenciais próprio.
- Integrações com plataformas sociais devem usar APIs oficiais e respeitar permissões, políticas e limites de cada plataforma.
- Segredos e tokens nunca devem ser versionados.
- A experiência visual deve priorizar a abertura cinematográfica da marca: a logo se desloca do centro para o topo da sidebar e revela o painel principal.
