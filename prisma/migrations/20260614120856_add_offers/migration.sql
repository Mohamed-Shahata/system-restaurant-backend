-- CreateTable: offers
CREATE TABLE "offers" (
    "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
    "title"            VARCHAR(150)  NOT NULL,
    "description"      TEXT,
    "price"            DECIMAL(10,2) NOT NULL,
    "image_url"        TEXT,
    "image_public_id"  TEXT,
    "is_available"     BOOLEAN       NOT NULL DEFAULT true,
    "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMPTZ   NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: offer_items
CREATE TABLE "offer_items" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
    "offer_id"     UUID        NOT NULL,
    "menu_item_id" UUID        NOT NULL,
    "quantity"     INTEGER     NOT NULL DEFAULT 1,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_items_pkey" PRIMARY KEY ("id")
);

-- Unique: a menu item can appear once per offer
ALTER TABLE "offer_items"
    ADD CONSTRAINT "offer_items_offer_id_menu_item_id_key"
    UNIQUE ("offer_id", "menu_item_id");

-- ForeignKey: offer_items → offers
ALTER TABLE "offer_items"
    ADD CONSTRAINT "offer_items_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKey: offer_items → menu_items
ALTER TABLE "offer_items"
    ADD CONSTRAINT "offer_items_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "offer_items_offer_id_idx"     ON "offer_items"("offer_id");
CREATE INDEX "offer_items_menu_item_id_idx" ON "offer_items"("menu_item_id");
