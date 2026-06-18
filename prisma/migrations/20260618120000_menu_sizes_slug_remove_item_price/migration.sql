ALTER TABLE "menu_items" DROP COLUMN "price";

ALTER TABLE "menu_item_sizes"
DROP CONSTRAINT IF EXISTS "menu_item_sizes_menu_item_id_label_key";

ALTER TABLE "menu_item_sizes"
ADD COLUMN "slug" VARCHAR(50);

ALTER TABLE "menu_item_sizes"
ALTER COLUMN "label" TYPE VARCHAR(50) USING "label"::text;

UPDATE "menu_item_sizes"
SET
  "slug" = "label",
  "label" = CASE "label"
    WHEN 'small' THEN 'صغير'
    WHEN 'medium' THEN 'وسط'
    WHEN 'large' THEN 'كبير'
    ELSE "label"
  END;

ALTER TABLE "menu_item_sizes"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "menu_item_sizes_menu_item_id_slug_key"
ON "menu_item_sizes"("menu_item_id", "slug");

DROP TYPE IF EXISTS "SizeLabel";