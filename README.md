# Restaurant System — Backend

REST API for a Restaurant Management System built with [NestJS](https://nestjs.com), [Prisma](https://www.prisma.io), and PostgreSQL.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database (Prisma)](#database-prisma)
- [Main Modules](#main-modules)
- [Create Menu Item Example](#create-menu-item-example)
- [Available Commands](#available-commands)
- [Testing](#testing)
- [API Documentation (Swagger)](#api-documentation-swagger)

---

## Tech Stack

- **NestJS 11** — Main backend framework (TypeScript).
- **Prisma ORM** — Database ORM for PostgreSQL.
- **Passport / JWT** — Authentication and authorization.
- **Cloudinary** — Product image upload and storage.
- **Nodemailer** — Sending emails (account verification & password reset).
- **class-validator / class-transformer** — DTO validation and transformation.
- **Swagger** — Automatic API documentation.
- **Jest** — Unit and End-to-End testing.

---

## Project Structure

```text
src/
├── core/
│   └── prisma/               # PrismaModule & PrismaService
├── shared/
│   ├── cloudinary/           # Image upload/delete service
│   └── transformers/         # Shared form-data transformers
├── modules/
│   ├── user/                 # Users & Authentication (JWT)
│   ├── categories/           # Menu categories
│   ├── menu/                 # Menu items
│   ├── sizes/                # Menu item sizes (Small/Medium/Large...)
│   ├── addons/               # Optional menu item add-ons
│   ├── cart/                 # Shopping cart
│   ├── favorites/            # User favorites
│   └── offers/               # Offers & promotions
└── main.ts                   # Application entry point

prisma/
├── schema.prisma             # Database schema
├── seed.ts                   # Seed script
└── drop-tables.ts            # Drops all database tables (use with caution)
```

---

## Requirements

- Node.js (Latest LTS version recommended)
- PostgreSQL database (Local or Hosted)
- A Cloudinary account for image storage
- SMTP credentials for email sending (optional depending on environment)

---

## Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment file and update the values
cp .env.example .env

# If .env.example doesn't exist, create a .env file manually using the variables below.

# 3. Run database migrations
npx prisma migrate dev

# 4. (Optional) Seed the database
npm run seed

# 5. Start the development server
npm run start:dev
```

The server will start on the port defined by the `PORT` environment variable and will be available under the `/api/v1` prefix.

---

## Environment Variables

Create a `.env` file in the project root and add the following variables:

```env
# Application
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Email (SMTP)
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Frontend URL (Used for password reset links)
FRONTEND_URL_LOCAL=http://localhost:3001
```

> **Note:** Never commit your real `.env` file to Git. Make sure it is listed in `.gitignore`.

---

## Database (Prisma)

Main models defined in `prisma/schema.prisma`:

| Model                                 | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| `User`                                | Application users                           |
| `VerificationCode`                    | Account verification & password reset codes |
| `Category`                            | Menu categories                             |
| `MenuItem`                            | Menu items                                  |
| `MenuItemImage`                       | Images attached to menu items               |
| `MenuItemAddon`                       | Optional add-ons for menu items             |
| `MenuItemSize`                        | Menu item sizes with individual pricing     |
| `Cart` / `CartItem` / `CartItemAddon` | Shopping cart and its items                 |
| `Favorite`                            | User favorite menu items                    |
| `Offer` / `OfferItem`                 | Offers and their included menu items        |

Useful Prisma commands:

```bash
npx prisma studio          # Browse the database using Prisma Studio
npx prisma migrate dev     # Create and apply new migrations
npx prisma generate        # Generate Prisma Client after schema changes
npm run db:drop-tables     # Drop all database tables (use carefully)
```

---

## Main Modules

### `menu`

Responsible for managing menu items including:

- Name
- Description
- Category
- Rating
- Discounts
- Images

When creating a new menu item:

- At least **one size** is required.
- **Optional add-ons** can be included.
- Images can be uploaded using **multipart/form-data**.
- The entire creation process (menu item, sizes, add-ons, and images) runs inside a **single Prisma transaction**. If any step fails, the transaction is rolled back and any uploaded Cloudinary images are automatically deleted.

---

### `sizes` & `addons`

Independent modules that provide full CRUD operations for menu item sizes and add-ons.

They are also used internally by the `menu` module while creating a new menu item.

---

### `user`

Handles:

- User registration
- Login
- Email verification using verification codes
- Password reset
- JWT authentication and route protection

---

### `cart`, `favorites`, `offers`, `categories`

Provide CRUD operations and business logic related to users and menu items.

---

## Create Menu Item Example

**POST** `/api/v1/menu`

Content-Type:

```
multipart/form-data
```

Example request:

```text
name: Grilled Kebab
description: Fresh grilled kebab served with vegetables
categoryId: 22222222-2222-2222-2222-222222222222
isAvailable: true
hasDiscount: true
discountPercentage: 15
rating: 4.6

sizes: [
  { "slug": "small",  "label": "Small",  "price": 12 },
  { "slug": "medium", "label": "Medium", "price": 15 },
  { "slug": "large",  "label": "Large",  "price": 18 }
]

addons: [
  { "name": "Garlic Sauce", "price": 5.5 }
]

images: [file1.jpg, file2.jpg]
```

> The `sizes` and `addons` fields must be sent as **JSON strings** inside the `multipart/form-data` request. The backend automatically transforms them into arrays.

---

## Available Commands

| Command              | Description                                     |
| -------------------- | ----------------------------------------------- |
| `npm run start:dev`  | Start the development server with watch mode    |
| `npm run build`      | Build the application into the `dist` directory |
| `npm run start:prod` | Run the production build                        |
| `npm run lint`       | Run ESLint and automatically fix issues         |
| `npm run format`     | Format the code using Prettier                  |
| `npm run test`       | Run unit tests                                  |
| `npm run test:e2e`   | Run End-to-End tests                            |
| `npm run test:cov`   | Generate test coverage report                   |
| `npm run seed`       | Seed the database with sample data              |

---

## Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-End tests
npm run test:cov    # Coverage report
```

---

## API Documentation (Swagger)

After starting the server, the Swagger documentation is available at:

```text
http://localhost:PORT/api/docs
```

Replace `PORT` with the value specified in your `.env` file.
