CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostMedia_postId_sortOrder_idx" ON "PostMedia"("postId", "sortOrder");

ALTER TABLE "PostMedia"
ADD CONSTRAINT "PostMedia_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PostMedia" ("id", "fileName", "mimeType", "data", "sortOrder", "postId")
SELECT 'legacy_' || "id", "mediaName", "mediaMimeType", "mediaData", 0, "id"
FROM "Post"
WHERE "mediaData" IS NOT NULL
  AND "mediaName" IS NOT NULL
  AND "mediaMimeType" IS NOT NULL;
