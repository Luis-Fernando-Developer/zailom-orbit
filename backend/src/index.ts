import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Prisma, PrismaClient, type PostFormat, type PostStatus, type SocialPlatform } from "@prisma/client";
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, createCipheriv, createDecipheriv } from "node:crypto";
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
  mediaItems: {
    select: { id: true, fileName: true, mimeType: true, sortOrder: true, createdAt: true },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.PostSelect;

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
const maxMediaBytes = 8 * 1024 * 1024;

type MediaKind = "image" | "video";
const mediaRules: Record<SocialPlatform, Partial<Record<PostFormat, { mediaTypes: MediaKind[]; minMedia: number; maxMedia: number }>>> = {
  INSTAGRAM: {
    POST: { mediaTypes: ["image", "video"], minMedia: 1, maxMedia: 1 },
    CAROUSEL: { mediaTypes: ["image", "video"], minMedia: 2, maxMedia: 10 },
    REEL: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    STORY: { mediaTypes: ["image", "video"], minMedia: 1, maxMedia: 1 },
  },
  FACEBOOK: {
    POST: { mediaTypes: ["image", "video"], minMedia: 0, maxMedia: 1 },
    CAROUSEL: { mediaTypes: ["image", "video"], minMedia: 2, maxMedia: 10 },
    VIDEO: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    REEL: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    STORY: { mediaTypes: ["image", "video"], minMedia: 1, maxMedia: 1 },
  },
  TIKTOK: {
    POST: { mediaTypes: ["image"], minMedia: 1, maxMedia: 1 },
    VIDEO: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    CAROUSEL: { mediaTypes: ["image"], minMedia: 2, maxMedia: 35 },
  },
  YOUTUBE: {
    VIDEO: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    SHORT: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
  },
  LINKEDIN: {
    POST: { mediaTypes: ["image", "video"], minMedia: 0, maxMedia: 1 },
    VIDEO: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    CAROUSEL: { mediaTypes: ["image"], minMedia: 2, maxMedia: 20 },
  },
  OTHER: {
    POST: { mediaTypes: ["image", "video"], minMedia: 0, maxMedia: 1 },
    CAROUSEL: { mediaTypes: ["image", "video"], minMedia: 2, maxMedia: 10 },
    VIDEO: { mediaTypes: ["video"], minMedia: 1, maxMedia: 1 },
    STORY: { mediaTypes: ["image", "video"], minMedia: 1, maxMedia: 1 },
  },
};

function hasExpectedMediaSignature(media: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return media.length >= 3 && media[0] === 0xff && media[1] === 0xd8 && media[2] === 0xff;
    case "image/png":
      return media.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    case "image/webp":
      return media.length >= 12 && media.toString("ascii", 0, 4) === "RIFF" && media.toString("ascii", 8, 12) === "WEBP";
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(media.toString("ascii", 0, 6));
    case "video/mp4":
      return media.length >= 12 && media.toString("ascii", 4, 8) === "ftyp";
    case "video/webm":
      return media.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));
    default:
      return false;
  }
}

const postBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "caption", "platform", "format", "status", "scheduledAt"],
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


const instagramApiVersion = process.env.INSTAGRAM_API_VERSION ?? "v23.0";
const instagramRedirectUri = process.env.INSTAGRAM_REDIRECT_URI ?? "";
const instagramConfigId = process.env.INSTAGRAM_CONFIG_ID ?? "";
const instagramPublicApiUrl = (process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "");
const instagramTokenNeverExpiresAt = new Date("9999-12-31T23:59:59.999Z");

function instagramEncryptionKey(): Buffer {
  const value = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY precisa conter 64 caracteres hexadecimais.");
  return Buffer.from(value, "hex");
}

function encryptInstagramToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", instagramEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(".");
}

function decryptInstagramToken(value: string): string {
  const [ivHex, tagHex, encryptedHex] = value.split(".");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Token do Instagram inválido.");
  const decipher = createDecipheriv("aes-256-gcm", instagramEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

function instagramMediaSignature(postId: string, mediaId: string, expires: string): string {
  const secret = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ?? "";
  return createHmac("sha256", secret).update(`${postId}.${mediaId}.${expires}`).digest("hex");
}

async function instagramGraphRequest(path: string, params: URLSearchParams, method: "GET" | "POST" = "POST") {
  const url = new URL(`https://graph.facebook.com/${instagramApiVersion}/${path}`);
  if (method === "GET") url.search = params.toString();
  const response = await fetch(url, method === "POST" ? {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  } : undefined);
  const responseText = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = responseText ? JSON.parse(responseText) as Record<string, unknown> : {};
  } catch {
    throw new Error(`A API da Meta respondeu com HTTP ${response.status}, mas retornou uma resposta inválida: ${responseText.slice(0, 400) || "sem conteúdo"}`);
  }
  if (!response.ok || payload.error) {
    const error = payload.error as { message?: string; type?: string; code?: number; error_subcode?: number } | undefined;
    const details = error?.message ?? "A Meta não informou o motivo da falha.";
    const code = error?.code ? ` Código ${error.code}${error.error_subcode ? `/${error.error_subcode}` : ""}.` : "";
    throw new Error(`Meta Graph API (HTTP ${response.status}): ${details}${code}`);
  }
  return payload;
}

app.get("/api/instagram/status", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const account = await prisma.instagramAccount.findUnique({ where: { workspaceId: user.workspaceId } });
  if (!account) return { connected: false };
  return {
    connected: true,
    account: { username: account.username, instagramUserId: account.instagramUserId, tokenExpiresAt: account.tokenExpiresAt },
  };
});

app.get("/api/instagram/connect", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId || !instagramConfigId || !instagramRedirectUri) {
    return reply.code(503).send({ error: { code: "INSTAGRAM_NOT_CONFIGURED", message: "Configure INSTAGRAM_APP_ID, INSTAGRAM_CONFIG_ID e INSTAGRAM_REDIRECT_URI no ambiente do Orbit." } });
  }
  const state = randomBytes(32).toString("hex");
  await prisma.instagramOAuthState.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.instagramOAuthState.create({
    data: { state, userId: user.id, workspaceId: user.workspaceId, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  const authorize = new URL("https://www.facebook.com/dialog/oauth");
  authorize.searchParams.set("client_id", appId);
  authorize.searchParams.set("config_id", instagramConfigId);
  authorize.searchParams.set("redirect_uri", instagramRedirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("state", state);
  return reply.redirect(authorize.toString());
});

app.get<{ Querystring: { code?: string; state?: string; error?: string; error_reason?: string; error_description?: string } }>("/api/instagram/callback", async (request, reply) => {
  const { code, state, error: oauthError, error_description: errorDescription } = request.query;
  const failUrl = new URL("/", appOrigin);
  failUrl.searchParams.set("instagram", "error");
  if (oauthError || !code || !state) {
    failUrl.searchParams.set("reason", errorDescription ?? oauthError ?? "Autorização cancelada.");
    return reply.redirect(`${failUrl.toString()}#page-accounts`);
  }

  const savedState = await prisma.instagramOAuthState.findUnique({ where: { state } });
  await prisma.instagramOAuthState.deleteMany({ where: { state } });
  const callbackUser = await getAuthenticatedUser(request);
  if (!savedState || savedState.expiresAt <= new Date() || !callbackUser || callbackUser.id !== savedState.userId || callbackUser.workspaceId !== savedState.workspaceId) {
    failUrl.searchParams.set("reason", "A autorização expirou. Tente conectar novamente.");
    return reply.redirect(`${failUrl.toString()}#page-accounts`);
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appId || !appSecret || !instagramRedirectUri) throw new Error("Integração do Instagram não configurada no servidor.");

    const tokenUrl = new URL(`https://graph.facebook.com/${instagramApiVersion}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", instagramRedirectUri);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenPayload = await tokenResponse.json() as { access_token?: string; token_type?: string; expires_in?: number; error?: { message?: string } };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error?.message ?? "Não foi possível trocar o código de autorização por um token do Login Unificado.");
    }

    const accountsUrl = new URL(`https://graph.facebook.com/${instagramApiVersion}/me/assigned_instagram_accounts`);
    accountsUrl.searchParams.set("fields", "id,username");
    accountsUrl.searchParams.set("access_token", tokenPayload.access_token);
    const accountsResponse = await fetch(accountsUrl);
    const accountsPayload = await accountsResponse.json() as { data?: Array<{ id?: string; username?: string }>; error?: { message?: string } };
    if (!accountsResponse.ok || !accountsPayload.data?.length) {
      throw new Error(accountsPayload.error?.message ?? "Nenhuma conta profissional do Instagram foi compartilhada com o Zailom Orbit nessa configuração.");
    }
    if (accountsPayload.data.length !== 1) {
      throw new Error("A configuração compartilhou mais de uma conta do Instagram. Para esta versão do Orbit, selecione apenas uma conta na configuração da Meta.");
    }
    const instagramAccount = accountsPayload.data[0];
    const instagramUserId = instagramAccount.id;
    const instagramUsername = instagramAccount.username;
    if (!instagramUserId || !instagramUsername) {
      throw new Error("A Meta não retornou o ID e o nome de usuário da conta do Instagram.");
    }

    await prisma.instagramAccount.upsert({
      where: { workspaceId: savedState.workspaceId },
      create: {
        workspaceId: savedState.workspaceId,
        instagramUserId,
        username: instagramUsername,
        encryptedToken: encryptInstagramToken(tokenPayload.access_token),
        tokenExpiresAt: instagramTokenNeverExpiresAt,
      },
      update: {
        instagramUserId,
        username: instagramUsername,
        encryptedToken: encryptInstagramToken(tokenPayload.access_token),
        tokenExpiresAt: instagramTokenNeverExpiresAt,
      },
    });
    const successUrl = new URL("/", appOrigin);
    successUrl.searchParams.set("instagram", "connected");
    return reply.redirect(`${successUrl.toString()}#page-accounts`);
  } catch (error) {
    failUrl.searchParams.set("reason", error instanceof Error ? error.message : "Falha ao conectar o Instagram.");
    return reply.redirect(`${failUrl.toString()}#page-accounts`);
  }
});

app.post("/api/instagram/disconnect", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  await prisma.instagramAccount.deleteMany({ where: { workspaceId: user.workspaceId } });
  return reply.code(204).send();
});

app.get<{ Params: { postId: string; mediaId: string }; Querystring: { expires?: string; signature?: string } }>("/api/instagram/media/:postId/:mediaId", async (request, reply) => {
  const { postId, mediaId } = request.params;
  const expires = request.query.expires ?? "";
  const signature = request.query.signature ?? "";
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now() || Number(expires) > Date.now() + 60 * 60 * 1000) {
    return reply.code(403).send({ error: "MEDIA_URL_EXPIRED" });
  }
  const expected = Buffer.from(instagramMediaSignature(postId, mediaId, expires));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return reply.code(403).send({ error: "INVALID_MEDIA_SIGNATURE" });
  const media = await prisma.postMedia.findFirst({
    where: { id: mediaId, postId },
    select: { data: true, mimeType: true, fileName: true },
  });
  if (!media || !["image/jpeg", "video/mp4"].includes(media.mimeType)) return reply.code(404).send();
  reply.header("Content-Type", media.mimeType);
  reply.header("Content-Length", media.data.length);
  reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(media.fileName)}"`);
  reply.header("Cache-Control", "public, max-age=300");
  reply.header("X-Content-Type-Options", "nosniff");
  return reply.send(Buffer.from(media.data));
});

app.post<{ Params: { postId: string } }>("/api/instagram/publish/:postId", {
  config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
}, async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  if (!instagramPublicApiUrl.startsWith("https://")) {
    return reply.code(503).send({ error: { code: "INSTAGRAM_MEDIA_URL_NOT_CONFIGURED", message: "Configure API_PUBLIC_URL com a URL HTTPS pública da API para que a Meta consiga buscar as mídias." } });
  }

  const [account, post] = await Promise.all([
    prisma.instagramAccount.findUnique({ where: { workspaceId: user.workspaceId } }),
    prisma.post.findFirst({
      where: { id: request.params.postId, workspaceId: user.workspaceId, platform: "INSTAGRAM" },
      include: { mediaItems: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  if (!account) return reply.code(409).send({ error: { code: "INSTAGRAM_NOT_CONNECTED", message: "Conecte uma conta profissional do Instagram antes de publicar." } });
  if (!post) return reply.code(404).send({ error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." } });
  if (post.status === "PUBLISHED") return reply.code(409).send({ error: { code: "ALREADY_PUBLISHED", message: "Esta publicação já foi enviada." } });
  if (!post.mediaItems.length) return reply.code(400).send({ error: { code: "MEDIA_REQUIRED", message: "Adicione mídia antes de publicar no Instagram." } });
  if (!["POST", "REEL", "CAROUSEL"].includes(post.format)) {
    return reply.code(400).send({ error: { code: "FORMAT_NOT_SUPPORTED", message: "Nesta primeira versão, a API oficial permite publicar Post, Reels e Carrossel. Stories ainda não estão habilitados neste fluxo." } });
  }
  if (post.format === "POST" && (post.mediaItems.length !== 1 || post.mediaItems[0].mimeType !== "image/jpeg")) {
    return reply.code(400).send({ error: { code: "INVALID_POST_MEDIA", message: "Post de imagem exige um arquivo JPEG." } });
  }
  if (post.format === "REEL" && (post.mediaItems.length !== 1 || post.mediaItems[0].mimeType !== "video/mp4")) {
    return reply.code(400).send({ error: { code: "INVALID_REEL_MEDIA", message: "Reels exige um único vídeo MP4." } });
  }
  if (post.format === "CAROUSEL" && (post.mediaItems.length < 2 || post.mediaItems.length > 10 || post.mediaItems.some((item) => !["image/jpeg", "video/mp4"].includes(item.mimeType)))) {
    return reply.code(400).send({ error: { code: "INVALID_CAROUSEL_MEDIA", message: "Carrossel exige de 2 a 10 mídias JPEG ou MP4." } });
  }
  if (account.tokenExpiresAt.getTime() < Date.now()) {
    return reply.code(401).send({ error: { code: "INSTAGRAM_TOKEN_EXPIRED", message: "O token do Login Unificado expirou. Desconecte e conecte novamente a conta." } });
  }
  const accessToken = decryptInstagramToken(account.encryptedToken);
  const mediaUrl = (mediaId: string) => {
    const expires = String(Date.now() + 45 * 60 * 1000);
    const signature = instagramMediaSignature(post.id, mediaId, expires);
    return `${instagramPublicApiUrl}/api/instagram/media/${encodeURIComponent(post.id)}/${encodeURIComponent(mediaId)}?expires=${expires}&signature=${signature}`;
  };
  const createContainer = async (params: URLSearchParams) => {
    params.set("access_token", accessToken);
    return instagramGraphRequest(`${account.instagramUserId}/media`, params);
  };
  try {
    let creationId = "";
    if (post.format === "CAROUSEL") {
      const children: string[] = [];
      for (const media of post.mediaItems) {
        const childParams = new URLSearchParams({
          is_carousel_item: "true",
          ...(media.mimeType === "image/jpeg"
            ? { image_url: mediaUrl(media.id) }
            : { media_type: "VIDEO", video_url: mediaUrl(media.id) }),
        });
        const child = await createContainer(childParams);
        if (typeof child.id !== "string") throw new Error("A Meta não retornou o identificador de uma mídia do carrossel.");
        children.push(child.id);
      }
      const parent = await createContainer(new URLSearchParams({
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: post.caption,
      }));
      if (typeof parent.id !== "string") throw new Error("A Meta não retornou o identificador do carrossel.");
      creationId = parent.id;
    } else {
      const media = post.mediaItems[0];
      const params = post.format === "REEL"
        ? new URLSearchParams({ media_type: "REELS", video_url: mediaUrl(media.id), caption: post.caption, share_to_feed: "true" })
        : new URLSearchParams({ image_url: mediaUrl(media.id), caption: post.caption });
      const container = await createContainer(params);
      if (typeof container.id !== "string") throw new Error("A Meta não retornou o identificador da publicação.");
      creationId = container.id;
    }

    let finished = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const status = await instagramGraphRequest(creationId, new URLSearchParams({ fields: "status_code,status", access_token: accessToken }), "GET");
      if (status.status_code === "FINISHED") { finished = true; break; }
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        throw new Error(typeof status.status === "string" ? status.status : "A Meta não conseguiu processar a mídia.");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!finished) throw new Error("A Meta ainda está processando a mídia. Tente publicar novamente em alguns instantes.");

    const published = await instagramGraphRequest(`${account.instagramUserId}/media_publish`, new URLSearchParams({ creation_id: creationId, access_token: accessToken }));
    const mediaId = typeof published.id === "string" ? published.id : null;
    if (!mediaId) throw new Error("A Meta não confirmou a publicação.");
    const permalinkPayload = await instagramGraphRequest(mediaId, new URLSearchParams({ fields: "id,permalink", access_token: accessToken }), "GET");
    const permalink = typeof permalinkPayload.permalink === "string" ? permalinkPayload.permalink : null;
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", scheduledAt: null, instagramMediaId: mediaId, instagramPermalink: permalink, publishedAt: new Date() },
    });
    return reply.send({ success: true, mediaId, permalink });
  } catch (error) {
    request.log.error({ err: error, postId: post.id }, "Instagram publishing failed");
    return reply.code(502).send({ error: { code: "INSTAGRAM_PUBLISH_FAILED", message: error instanceof Error ? error.message : "Não foi possível publicar no Instagram." } });
  }
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
    if (!isPostInput(request.body) || !mediaRules[request.body.platform]?.[request.body.format]) return sendInvalidPost(reply);
    if (!request.body.title.trim()) return sendInvalidPost(reply);
    const formatRule = mediaRules[request.body.platform][request.body.format]!;
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
    if (!isPostInput(request.body) || !mediaRules[request.body.platform]?.[request.body.format]) return sendInvalidPost(reply);
    if (!request.body.title.trim()) return sendInvalidPost(reply);

    const scheduledAt = parseScheduledAt(request.body.scheduledAt);
    if (request.body.scheduledAt !== null && !scheduledAt) return sendInvalidPost(reply);
    if (!validateSchedule(reply, request.body.status, scheduledAt)) return;

    const formatRule = mediaRules[request.body.platform][request.body.format]!;
    const currentMedia = await prisma.postMedia.findMany({
      where: { postId: request.params.id, post: { workspaceId: user.workspaceId } },
      select: { mimeType: true },
    });
    if (currentMedia.length > formatRule.maxMedia) {
      return reply.code(400).send({ error: { code: "MEDIA_LIMIT_EXCEEDED", message: `Este formato permite no máximo ${formatRule.maxMedia} mídias.` } });
    }
    if (currentMedia.some((media) => {
      const kind = media.mimeType.startsWith("image/") ? "image" : "video";
      return !formatRule.mediaTypes.includes(kind);
    })) {
      return reply.code(400).send({ error: { code: "MEDIA_TYPE_NOT_ALLOWED", message: "Uma mídia existente não é compatível com este formato." } });
    }

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
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
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
  const targetPost = await prisma.post.findFirst({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    select: { id: true, platform: true, format: true },
  });
  if (!targetPost) {
    return reply.code(404).send({ error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." } });
  }
  const formatRule = mediaRules[targetPost.platform]?.[targetPost.format];
  const mediaKind: MediaKind = mimeType.startsWith("image/") ? "image" : "video";
  if (!formatRule || !formatRule.mediaTypes.includes(mediaKind)) {
    return reply.code(400).send({ error: { code: "MEDIA_TYPE_NOT_ALLOWED", message: "O tipo de mídia não é permitido para este formato." } });
  }
  const legacyMediaId = `legacy_${request.params.id}`;
  const legacyExists = await prisma.postMedia.findUnique({ where: { id: legacyMediaId }, select: { id: true } });
  const existingMediaCount = await prisma.postMedia.count({ where: { postId: targetPost.id } });
  if (existingMediaCount - (legacyExists ? 1 : 0) >= formatRule.maxMedia) {
    return reply.code(400).send({ error: { code: "MEDIA_LIMIT_EXCEEDED", message: `Este formato permite no máximo ${formatRule.maxMedia} mídias.` } });
  }
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

  if (!hasExpectedMediaSignature(media, mimeType)) {
    return reply.code(400).send({
      error: { code: "INVALID_MEDIA_CONTENT", message: "O conteúdo do arquivo não corresponde ao formato informado." },
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

  const lastMedia = await prisma.postMedia.aggregate({
    where: { postId: request.params.id },
    _max: { sortOrder: true },
  });
  await prisma.postMedia.upsert({
    where: { id: legacyMediaId },
    create: {
      id: legacyMediaId,
      fileName: fileName.trim(),
      mimeType,
      data: media,
      sortOrder: (lastMedia._max.sortOrder ?? -1) + 1,
      postId: request.params.id,
    },
    update: { fileName: fileName.trim(), mimeType, data: media },
  });
  return reply.code(204).send();
});

app.post<{
  Params: { id: string };
  Body: { files: Array<{ fileName: string; mimeType: string; dataBase64: string }> };
}>("/api/posts/:id/media/batch", {
  config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["files"],
      properties: {
        files: {
          type: "array",
          minItems: 1,
          maxItems: 35,
          items: {
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
      },
    },
  },
}, async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const post = await prisma.post.findFirst({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    select: { id: true, platform: true, format: true, status: true },
  });
  if (!post) {
    return reply.code(404).send({
      error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." },
    });
  }

  const formatRule = mediaRules[post.platform]?.[post.format];
  if (!formatRule) return sendInvalidPost(reply);
  const existingMedia = await prisma.postMedia.findMany({ where: { postId: post.id }, select: { data: true } });
  const existingMediaCount = existingMedia.length;
  if (existingMediaCount + request.body.files.length > formatRule.maxMedia) {
    return reply.code(400).send({ error: { code: "MEDIA_LIMIT_EXCEEDED", message: `Este formato permite no máximo ${formatRule.maxMedia} mídias.` } });
  }
  if (post.status !== "DRAFT" && existingMediaCount + request.body.files.length < formatRule.minMedia) {
    return reply.code(400).send({ error: { code: "MEDIA_REQUIRED", message: `Este formato exige pelo menos ${formatRule.minMedia} mídias.` } });
  }
  const lastMedia = await prisma.postMedia.aggregate({ where: { postId: post.id }, _max: { sortOrder: true } });
  const nextSortOrder = (lastMedia._max.sortOrder ?? -1) + 1;
  const prepared: Prisma.PostMediaCreateManyInput[] = [];
  let totalBytes = existingMedia.reduce((total, item) => total + item.data.length, 0);
  for (const [index, file] of request.body.files.entries()) {
    if (!allowedMediaTypes.has(file.mimeType) || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64)) {
      return reply.code(400).send({
        error: { code: "INVALID_MEDIA", message: "Um dos arquivos possui formato inválido." },
      });
    }

    const kind: MediaKind = file.mimeType.startsWith("image/") ? "image" : "video";
    if (!formatRule.mediaTypes.includes(kind)) {
      return reply.code(400).send({ error: { code: "MEDIA_TYPE_NOT_ALLOWED", message: "O tipo de mídia não é permitido para este formato." } });
    }

    const data = Buffer.from(file.dataBase64, "base64");
    totalBytes += data.length;
    if (
      data.length === 0 ||
      data.toString("base64") !== file.dataBase64 ||
      !hasExpectedMediaSignature(data, file.mimeType)
    ) {
      return reply.code(400).send({
        error: { code: "INVALID_MEDIA_CONTENT", message: "Um dos arquivos não corresponde ao formato informado." },
      });
    }
    if (totalBytes > maxMediaBytes) {
      return reply.code(413).send({
        error: { code: "MEDIA_TOO_LARGE", message: "O conjunto de mídias deve ter no máximo 8 MB." },
      });
    }

    prepared.push({
      fileName: file.fileName.trim(),
      mimeType: file.mimeType,
      data,
      sortOrder: nextSortOrder + index,
      postId: post.id,
    });
  }

  await prisma.postMedia.createMany({ data: prepared });
  return reply.code(204).send();
});

app.patch<{
  Params: { id: string };
  Body: { mediaIds: string[] };
}>("/api/posts/:id/media/order", {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["mediaIds"],
      properties: {
        mediaIds: { type: "array", minItems: 1, maxItems: 35, uniqueItems: true, items: { type: "string", minLength: 1 } },
      },
    },
  },
}, async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const post = await prisma.post.findFirst({
    where: { id: request.params.id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!post) return reply.code(404).send({ error: { code: "POST_NOT_FOUND", message: "Publicação não encontrada." } });

  const current = await prisma.postMedia.findMany({
    where: { postId: post.id },
    select: { id: true },
  });
  if (
    current.length !== request.body.mediaIds.length ||
    !request.body.mediaIds.every((id) => current.some((item) => item.id === id))
  ) {
    return reply.code(400).send({ error: { code: "INVALID_MEDIA_ORDER", message: "A ordem enviada não corresponde às mídias desta publicação." } });
  }

  await prisma.$transaction(
    request.body.mediaIds.map((id, index) => prisma.postMedia.update({
      where: { id },
      data: { sortOrder: index },
    })),
  );
  return reply.code(204).send();
});

app.get<{ Params: { id: string; mediaId: string } }>("/api/posts/:id/media/:mediaId", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const media = await prisma.postMedia.findFirst({
    where: {
      id: request.params.mediaId,
      postId: request.params.id,
      post: { workspaceId: user.workspaceId },
    },
    select: { data: true, mimeType: true, fileName: true },
  });
  if (!media) {
    return reply.code(404).send({
      error: { code: "MEDIA_NOT_FOUND", message: "Esta mídia não foi encontrada." },
    });
  }

  reply.header("Content-Type", media.mimeType);
  reply.header("Content-Length", media.data.length);
  reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(media.fileName)}"`);
  reply.header("Cache-Control", "private, no-store");
  reply.header("X-Content-Type-Options", "nosniff");
  return reply.send(Buffer.from(media.data));
});

app.delete<{ Params: { id: string; mediaId: string } }>("/api/posts/:id/media/:mediaId", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;

  const result = await prisma.postMedia.deleteMany({
    where: {
      id: request.params.mediaId,
      postId: request.params.id,
      post: { workspaceId: user.workspaceId },
    },
  });
  if (result.count === 0) {
    return reply.code(404).send({
      error: { code: "MEDIA_NOT_FOUND", message: "Esta mídia não foi encontrada." },
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
  await prisma.postMedia.deleteMany({ where: { id: `legacy_${request.params.id}`, postId: request.params.id } });
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


const scheduledPublishIntervalMs = 30_000;
const scheduledPublishRetryDelayMs = 5 * 60 * 1000;
const scheduledPublishLastAttempt = new Map<string, number>();
let scheduledPublishWorkerRunning = false;

async function processScheduledInstagramPosts(): Promise<void> {
  if (scheduledPublishWorkerRunning) return;
  scheduledPublishWorkerRunning = true;

  try {
    const now = new Date();
    const duePosts = await prisma.post.findMany({
      where: {
        platform: "INSTAGRAM",
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
      select: {
        id: true,
        workspaceId: true,
        workspace: { select: { ownerId: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    });

    for (const post of duePosts) {
      const lastAttempt = scheduledPublishLastAttempt.get(post.id) ?? 0;
      if (Date.now() - lastAttempt < scheduledPublishRetryDelayMs) continue;

      scheduledPublishLastAttempt.set(post.id, Date.now());
      let sessionToken: string | null = null;

      try {
        sessionToken = await createSession(post.workspace.ownerId);
        const response = await fetch(`http://127.0.0.1:${port}/api/instagram/publish/${encodeURIComponent(post.id)}`, {
          method: "POST",
          headers: {
            Cookie: `${sessionCookieName}=${sessionToken}`,
            Origin: appOrigin,
          },
        });

        if (!response.ok) {
          const details = (await response.text()).slice(0, 1000);
          app.log.error(
            { postId: post.id, statusCode: response.status, response: details },
            "Scheduled Instagram publication failed",
          );
          continue;
        }

        scheduledPublishLastAttempt.delete(post.id);
        app.log.info({ postId: post.id }, "Scheduled Instagram publication completed");
      } catch (error) {
        app.log.error({ err: error, postId: post.id }, "Scheduled Instagram worker failed");
      } finally {
        if (sessionToken) {
          await prisma.session.deleteMany({ where: { tokenHash: hashToken(sessionToken) } }).catch((error: unknown) => {
            app.log.error({ err: error, postId: post.id }, "Could not remove temporary scheduler session");
          });
        }
      }
    }

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [postId, attemptedAt] of scheduledPublishLastAttempt) {
      if (attemptedAt < cutoff) scheduledPublishLastAttempt.delete(postId);
    }
  } catch (error) {
    app.log.error({ err: error }, "Scheduled Instagram worker could not load due posts");
  } finally {
    scheduledPublishWorkerRunning = false;
  }
}

try {
  await app.listen({ port, host });
  app.log.info({ intervalMs: scheduledPublishIntervalMs }, "Scheduled Instagram worker started");
  const scheduledPublishTimer = setInterval(() => {
    void processScheduledInstagramPosts();
  }, scheduledPublishIntervalMs);
  scheduledPublishTimer.unref();
  void processScheduledInstagramPosts();
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
