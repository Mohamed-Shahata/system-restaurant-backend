-- AddModel: Favorite

CREATE TABLE "favorites" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"      UUID        NOT NULL,
    "menu_item_id" UUID        NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "favorites"
    ADD CONSTRAINT "favorites_user_id_menu_item_id_key"
    UNIQUE ("user_id", "menu_item_id");

ALTER TABLE "favorites"
    ADD CONSTRAINT "favorites_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites"
    ADD CONSTRAINT "favorites_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");
