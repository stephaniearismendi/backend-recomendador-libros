-- CreateTable
CREATE TABLE "ClubChapter" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMessage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubChapter_clubId_chapter_idx" ON "ClubChapter"("clubId", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "ClubChapter_clubId_chapter_key" ON "ClubChapter"("clubId", "chapter");

-- CreateIndex
CREATE INDEX "ClubMessage_chapterId_createdAt_idx" ON "ClubMessage"("chapterId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClubChapter" ADD CONSTRAINT "ClubChapter_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMessage" ADD CONSTRAINT "ClubMessage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClubChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
