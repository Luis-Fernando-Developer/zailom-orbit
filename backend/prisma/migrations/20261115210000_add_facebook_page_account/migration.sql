CREATE TABLE "FacebookPageAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FacebookPageAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookPageAccount_workspaceId_pageId_key"
ON "FacebookPageAccount"("workspaceId", "pageId");

CREATE INDEX "FacebookPageAccount_workspaceId_idx"
ON "FacebookPageAccount"("workspaceId");
