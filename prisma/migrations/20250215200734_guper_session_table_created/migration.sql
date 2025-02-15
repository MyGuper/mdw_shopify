/*
  Warnings:

  - The primary key for the `Guper_session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Guper_session` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guper_session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "accessToken" TEXT,
    "expired_at" TEXT
);
INSERT INTO "new_Guper_session" ("accessToken", "expired_at", "id", "shop") SELECT "accessToken", "expired_at", "id", "shop" FROM "Guper_session";
DROP TABLE "Guper_session";
ALTER TABLE "new_Guper_session" RENAME TO "Guper_session";
CREATE UNIQUE INDEX "Guper_session_shop_key" ON "Guper_session"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
