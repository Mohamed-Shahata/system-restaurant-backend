ALTER TABLE "menu_items"
ADD COLUMN "has_discount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discount_percentage" DECIMAL(5, 2),
ADD COLUMN "rating" DECIMAL(2, 1) NOT NULL DEFAULT 0;
