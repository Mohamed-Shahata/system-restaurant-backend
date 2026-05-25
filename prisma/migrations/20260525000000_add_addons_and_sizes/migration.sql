-- CreateEnum
CREATE TYPE "SizeLabel" AS ENUM ('small', 'medium', 'large');

-- CreateTable: menu_item_addons
CREATE TABLE "menu_item_addons" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID          NOT NULL,
    "name"         VARCHAR(100)  NOT NULL,
    "price"        DECIMAL(10,2) NOT NULL,
    "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMPTZ   NOT NULL,

    CONSTRAINT "menu_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable: menu_item_sizes
CREATE TABLE "menu_item_sizes" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID          NOT NULL,
    "label"        "SizeLabel"   NOT NULL,
    "price"        DECIMAL(10,2) NOT NULL,
    "is_available" BOOLEAN       NOT NULL DEFAULT true,
    "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMPTZ   NOT NULL,

    CONSTRAINT "menu_item_sizes_pkey" PRIMARY KEY ("id")
);

-- Unique: one size label per menu item
ALTER TABLE "menu_item_sizes"
    ADD CONSTRAINT "menu_item_sizes_menu_item_id_label_key"
    UNIQUE ("menu_item_id", "label");

-- ForeignKey: addons → menu_items
ALTER TABLE "menu_item_addons"
    ADD CONSTRAINT "menu_item_addons_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKey: sizes → menu_items
ALTER TABLE "menu_item_sizes"
    ADD CONSTRAINT "menu_item_sizes_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "menu_item_addons_menu_item_id_idx" ON "menu_item_addons"("menu_item_id");
CREATE INDEX "menu_item_sizes_menu_item_id_idx"  ON "menu_item_sizes"("menu_item_id");
