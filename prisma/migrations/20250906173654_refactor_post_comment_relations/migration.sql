/*
  Warnings:

  - You are about to drop the column `userAvatar` on the `ClubMessage` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `ClubMessage` table. All the data in the column will be lost.
  - You are about to drop the column `userAvatar` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `userAvatar` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClubMessage" DROP COLUMN "userAvatar",
DROP COLUMN "userName";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "userAvatar",
DROP COLUMN "userName";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "userAvatar",
DROP COLUMN "userName";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMessage" ADD CONSTRAINT "ClubMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
