ALTER TABLE "Post"
  ADD COLUMN "caption" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "mediaName" TEXT,
  ADD COLUMN "mediaMimeType" TEXT,
  ADD COLUMN "mediaData" BYTEA;
