import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Prisma, PrismaClient, type PostFormat, type PostStatus, type SocialPlatform } from "@prisma/client";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = Fastify({ logger: true, trustProxy: process.env.TRUST_PROXY === "true", bodyLimit: 12 * 1024 * 1024 });
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const appOrigin = new URL(process.env.APP_ORIGIN ?? "http://localhost:5173").origin;
const frontendDist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const sessionCookieName = "orbit_session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
}

interface PostInput {
  title: string;
  caption: string;
  platform: SocialPlatform;
  format: PostFormat;
  status: PostStatus;
  scheduledAt: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolveKey, reject) => {
    scryptCallback(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolveKey(key);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  return `scrypt$32768$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, cost, saltHex, keyHex] = encoded.split("$");
  if (algorithm !== "scrypt" || cost !== "32768" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || expectedKey.length !== 64) return false;

  const actualKey = await derivePasswordKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeMs / 1000,
  });
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
    },
  });
  return token;
}

async function getAuthenticatedUser(request: FastifyRequest): Promise<AuthenticatedUser | null> {
  const token = request.cookies[sessionCookieName];
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { workspace: true } } },
  });
  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  if (!session.user.workspace) {
    throw new Error("Authenticated user has no workspace");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    workspaceId: session.user.workspace.id,
  };
}

async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request);
  if (user) return user;

  reply.clearCookie(sessionCookieName, { path: "/" });
  reply.code(401).send({
    error: { code: "UNAUTHENTICATED", message: "Faça login para continuar." },
  });
  return null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function parseScheduledAt(value: string | null): Date | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const postSelect = {
  id: true,
  title: true,
  caption: true,
  mediaName: true,
  mediaMimeType: true,
  platform: true,
  format: true,
  status: true,
  scheduledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PostSelect;

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
const maxMediaBytes = 8 * 1024 * 1024;

const postBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "platform", "format", "status", "scheduledAt"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 160 },
    caption: { type: "string", maxLength: 5000 },
    platform: { type: "string", enum: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "OTHER"] },
    format: { type: "string", enum: ["POST", "STORY", "REEL", "VIDEO", "CAROUSEL", "SHORT", "OTHER"] },
    status: { type: "string", enum: ["DRAFT", "SCHEDULED", "PUBLISHED"] },
    scheduledAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
  },
} as const;

function isPostInput(value: unknown): value is PostInput {
  if (!value || typeof value !== "object") return false;
  const post = value as Record<string, unknown>;
  return (
    typeof post.title === "string" &&
    typeof post.caption === "string" &&
    typeof post.platform === "string" &&
    typeof post.format === "string" &&
    typeof post.status === "string" &&
    (typeof post.scheduledAt === "string" || post.scheduledAt === null)
  );
}

function sendInvalidPost(reply: FastifyReply) {
  return reply.code(400).send({
    error: { code: "INVALID_POST", message: "Informe os dados válidos da publicação." },
  });
}

function validateSchedule(reply: FastifyReply, status: PostStatus, scheduledAt: Date | null): boolean {
  if (status !== "SCHEDULED") return true;
  if (scheduledAt && scheduledAt > new Date()) return true;
  reply.code(400).send({
    error: { code: "INVALID_SCHEDULE", message: "O horário agendado precisa estar no futuro." },
  });
  return false;
}

await app.register(cookie);
await app.register(cors, { origin: appOrigin, credentials: true });
await app.register(rateLimit, { global: false });

app.addHook("onRequest", (request, reply, done) => {
  if (
    request.url.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    request.headers.origin !== appOrigin
  ) {
    reply.code(403).send({
      error: { code: "INVALID_ORIGIN", message: "Origem da requisição não permitida." },
    });
    return;
  }
  done();
});

app.addHook("onReady", async () => {
  await prisma.$connect();
});
app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { success: true, service: "zailom-orbit", status: "healthy" };
});

app.post<{
  Body: { name: string; email: string; password: string };
}>(
  "/api/auth/register",
  {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          email: { type: "string", minLength: 3, maxLength: 254, format: "email" },
          password: { type: "string", minLength: 10, maxLength: 128 },
        },
      },
    },
  },
  async (request, reply) => {
    const name = request.body.name.trim();
    const email = request.body.email.trim().toLowerCase();
    if (name.length < 2) {
      return reply.code(400).send({
        error: { code: "INVALID_NAME", message: "Informe um nome com pelo menos 2 caracteres." },
      });
    }

    try {
      const passwordHash = await hashPassword(request.body.password);
      const token = randomBytes(32).toString("base64url");
      const user = await prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            name,
            email,
            passwordHash,
            workspace: { create: { name: "Meu workspace" } },
          },
        });
        await transaction.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
        await transaction.session.create({
          data: {
            tokenHash: hashToken(token),
            userId: createdUser.id,
            expiresAt: new Date(Date.now() + sessionLifetimeMs),
          },
        });
        return createdUser;
      });
      setSessionCookie(reply, token);
      return reply.code(201).send({
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({
          error: { code: "EMAIL_IN_USE", message: "Já existe uma conta com este e-mail." },
        });
      }
      throw error;
    }
  },
);

app.post<{
  Body: { email: string; password: string };
}>(
  "/api/auth/login",
  {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", minLength: 3, maxLength: 254, format: "email" },
          password: { type: "string", minLength: 1, maxLength: 128 },
        },
      },
    },
  },
  async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { email: request.body.email.trim().toLowerCase() },
    });
    if (!user || !(await verifyPassword(request.body.password, user.passwordHash))) {
      return reply.code(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." },
      });
    }

    const token = await createSession(user.id);
    setSessionCookie(reply, token);
    return reply.send({ user: { id: user.id, name: user.name, email: user.email } });
  },
);

app.get("/api/auth/me", async (request, reply) => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    reply.clearCookie(sessionCookieName, { path: "/" });
    return reply.code(401).send({
      error: { code: "UNAUTHENTICATED", message: "Faça login para continuar." },
    });
  }
  return reply.send({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/logout", async (request, reply) => {
  const token = request.cookies[sessionCookieName];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  reply.clearCookie(sessionCookieName, { path: "/" });
  return reply.code(204).send();
});

app.get("/api/posts", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const query = request.query as { from?: string; to?: string };
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime())) ||
    (from && to && from > to)
  ) {
    return reply.code(400).send({
      error: { code: "INVALID_DATE_RANGE", message: "Informe um intervalo de datas válido." },
    });
  }

  return prisma.post.findMany({
    select: postSelect,
    where: {
      workspaceId: user.workspaceId,
      ...(from || to
        ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });
});

app.post<{ Body: PostInput }>(
  "/api/posts",
  { schema: { body: postBodySchema } },
  async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isPostInput(request.body)) return sendInvalidPost(reply);
    if (!request.body.title.trim()) return sendInvalidPost(reply);

    const scheduledAt = parseScheduledAt(request.body.scheduledAt);
    if (request.body.scheduledAt !== null && !scheduledAt) return sendInvalidPost(reply);
    if (!validateSchedule(reply, request.body.status, scheduledAt)) return;

    return reply.code(201).send(
      await prisma.post.create({
        data: {
          title: request.body.title.trim(),
          caption: request.body.caption.trim(),
          platform: request.body.platform,
          format: request.body.format,
          status: request.body.status,
          scheduledAt,
          workspaceId: user.workspaceId,
        },
        select: postSelect,
      }),
    );
  },
);

app.patch<{ Params: { id: string }; Body: PostInput }>(
  "/api/posts/:id",
  { schema: { body: postBodySchema } },
  async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isPostInput(request.body)) return sendInvalidPost(reply);
    if (!request.body.title.trim()) return sendInvalidPost(reply);

    const scheduledAt = parseScheduledAt(request.body.scheduledAt);
    if (request.body.scheduledAt !== null && !scheduledAt) return sendInvalidPost(reply);
    if (!validateSchedule(reply, request.body.status, scheduledAt)) return;

    const result = await prisma.post.updateMany({
      where: { id: request.params.id, workspaceId: user.workspaceId },
      data: {
        title: request.body.title.trim(),
        caption: request.body.caption.trim(),
        platform: request.body.platform,
        format: request.body.format,
        status: request.body.status,
        scheduledAt,
      },
    });
    if (result.count === 0) {
      return reply.code(404).send({
        error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." },
      });
    }
    return prisma.post.findFirst({
      where: { id: request.params.id, workspaceId: user.workspaceId },
      select: postSelect,
    });
  },
);

app.post<{
  Params: { id: string };
  Body: { fileName: string; mimeType: string; dataBase64: string };
}>("/api/posts/:id/media", {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["fileName", "mimeType", "dataBase64"],
      properties: {
        fileName: { type: "string", minLength: 1, maxLength: 180 },
        mimeType: { type: "string", enum: [...allowedMediaTypes] },
        dataBase64: { type: "string", minLength: 1, maxLength: 11_184_812 },
      },
    },
  },
}, async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const { fileName, mimeType, dataBase64 } = request.body;
  if (!allowedMediaTypes.has(mimeType) || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) {
    return reply.code(400).send({
      error: { code: "INVALID_MEDIA", message: "Envie uma imagem ou vídeo em formato permitido." },
    });
  }

  const media = Buffer.from(dataBase64, "base64");
  if (media.length === 0 || media.length > maxMediaBytes || media.toString("base64") !== dataBase64) {
    return reply.code(413).send({
      error: { code: "MEDIA_TOO_LARGE", message: "O arquivo deve ter no máximo 8 MB." },
    });
  }

  const result = await prisma.post.updateMany({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    data: { mediaName: fileName.trim(), mediaMimeType: mimeType, mediaData: media },
  });
  if (result.count === 0) {
    return reply.code(404).send({
      error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." },
    });
  }
  return reply.code(204).send();
});

app.get<{ Params: { id: string } }>("/api/posts/:id/media", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const post = await prisma.post.findFirst({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    select: { mediaData: true, mediaMimeType: true, mediaName: true },
  });
  if (!post?.mediaData || !post.mediaMimeType) {
    return reply.code(404).send({
      error: { code: "MEDIA_NOT_FOUND", message: "Esta publicação não possui mídia." },
    });
  }

  reply.header("Content-Type", post.mediaMimeType);
  reply.header("Content-Length", post.mediaData.length);
  reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(post.mediaName ?? "orbit-media")}"`);
  reply.header("Cache-Control", "private, no-store");
  reply.header("X-Content-Type-Options", "nosniff");
  return reply.send(Buffer.from(post.mediaData));
});

app.delete<{ Params: { id: string } }>("/api/posts/:id/media", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const result = await prisma.post.updateMany({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    data: { mediaName: null, mediaMimeType: null, mediaData: null },
  });
  if (result.count === 0) {
    return reply.code(404).send({
      error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." },
    });
  }
  return reply.code(204).send();
});

app.delete<{ Params: { id: string } }>("/api/posts/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const result = await prisma.post.deleteMany({
    where: { id: request.params.id, workspaceId: user.workspaceId },
  });
  if (result.count === 0) {
    return reply.code(404).send({
      error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." },
    });
  }
  return reply.code(204).send();
});

if (existsSync(frontendDist)) {
  await app.register(fastifyStatic, {
    root: frontendDist,
    prefix: "/",
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method === "GET" && !request.url.startsWith("/api/")) {
      return reply.sendFile("index.html");
    }

    return reply.code(404).send({
      success: false,
      error: "NOT_FOUND",
      message: "Rota não encontrada.",
    });
  });
}

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
