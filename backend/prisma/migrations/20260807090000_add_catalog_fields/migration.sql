-- Real catalog support: product families (categories.code), SKU, sales unit,
-- ML length and nullable board dimensions. ALTER only; existing rows survive.

-- AlterTable: categories.code (nullable first, backfill, then enforce)
ALTER TABLE "categories" ADD COLUMN "code" TEXT;
UPDATE "categories" SET "code" = "id" WHERE "code" IS NULL;
ALTER TABLE "categories" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN "length_cm" INTEGER,
ADD COLUMN "sku" TEXT,
ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'M2';
UPDATE "products" SET "sku" = "id" WHERE "sku" IS NULL;
ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL,
ALTER COLUMN "standard_width" DROP NOT NULL,
ALTER COLUMN "standard_height" DROP NOT NULL,
ALTER COLUMN "thickness" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
