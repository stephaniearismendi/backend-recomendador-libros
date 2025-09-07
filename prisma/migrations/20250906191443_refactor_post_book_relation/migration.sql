/*
  Warnings:

  - You are about to drop the column `bookAuthor` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `bookCover` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `bookTitle` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "bookAuthor",
DROP COLUMN "bookCover",
DROP COLUMN "bookTitle",
ADD COLUMN     "bookId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
