# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json ./
COPY package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci

COPY frontend ./frontend
COPY backend ./backend
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/backend/prisma ./backend/prisma
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist

USER node
EXPOSE 3001
CMD ["npm", "--prefix", "backend", "run", "start"]
