ALTER TABLE "Post"
  ADD COLUMN "instagramMediaId" TEXT,
  ADD COLUMN "instagramPermalink" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE TABLE "InstagramAccount" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "instagramUserId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "encryptedToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InstagramAccount_workspaceId_key" ON "InstagramAccount"("workspaceId");
CREATE INDEX "InstagramAccount_workspaceId_idx" ON "InstagramAccount"("workspaceId");

CREATE TABLE "InstagramOAuthState" (
  "id" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstagramOAuthState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InstagramOAuthState_state_key" ON "InstagramOAuthState"("state");
CREATE INDEX "InstagramOAuthState_expiresAt_idx" ON "InstagramOAuthState"("expiresAt");
