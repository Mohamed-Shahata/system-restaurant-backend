-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user', 'delivery');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone_primary" VARCHAR(20) NOT NULL,
    "phone_secondary" VARCHAR(20),
    "address" TEXT,
    "avatar_url" TEXT,
    "avatar_public_id" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "reset_password_token" VARCHAR(255),
    "reset_password_expires" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category_id" UUID NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "has_discount" BOOLEAN NOT NULL DEFAULT false,
    "discount_percentage" DECIMAL(5,2),
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_images" (
    "id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_primary_key" ON "users"("phone_primary");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_secondary_key" ON "users"("phone_secondary");

-- CreateIndex
CREATE INDEX "verification_codes_user_id_idx" ON "verification_codes"("user_id");

-- CreateIndex
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "menu_item_images_menu_item_id_idx" ON "menu_item_images"("menu_item_id");

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_images" ADD CONSTRAINT "menu_item_images_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
