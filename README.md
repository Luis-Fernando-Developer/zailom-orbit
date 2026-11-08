# Zailom Orbit

Plataforma de gerenciamento de redes sociais e automações, começando pela integração com Instagram.

## Estrutura

- `frontend/`: aplicação web React + TypeScript + Vite.
- `backend/`: API independente em Node.js + TypeScript.

## Requisitos

- Node.js 22+
- npm 10+

## Desenvolvimento

Instale as dependências na raiz:

```bash
npm install
```

Inicie o frontend:

```bash
npm run dev:frontend
```

Inicie a API:

```bash
npm run dev:backend
```

## Diretrizes

- O frontend é uma SPA administrativa.
- A API é independente do frontend e deverá servir também a integrações externas.
- Integrações com plataformas sociais devem usar APIs oficiais e respeitar permissões, políticas e limites de cada plataforma.
- Segredos e tokens nunca devem ser versionados.
- A experiência visual deve priorizar a abertura cinematográfica da marca: a logo se desloca do centro para o topo da sidebar e revela o painel principal.
