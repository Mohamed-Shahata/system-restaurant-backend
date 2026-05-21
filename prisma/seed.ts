import { config } from 'dotenv';
config(); // ← لازم يكون أول سطر قبل أي import تاني

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import { MenuCategory } from '@prisma/client';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DIRECT;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL or DATABASE_URL_DIRECT in .env');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 60000,
  query_timeout: 60000,
  max: 1,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? String((error as Error & { code?: unknown }).code)
          : '';
      const isTimeout = code === 'ETIMEDOUT' || code === 'EAI_AGAIN';

      if (!isTimeout || attempt === maxAttempts) {
        throw error;
      }

      console.log(`⏳ ${label} فشلت مؤقتًا (${code})، محاولة ${attempt + 1}/${maxAttempts}...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  throw new Error(`${label} failed`);
}

function buildBulkInsert(
  tableName: string,
  columns: string[],
  rows: Array<Array<string | number | boolean | null>>,
  casts: Record<number, string> = {},
) {
  const values: Array<string | number | boolean | null> = [];
  const placeholders = rows.map((row) => {
    const rowPlaceholders = row.map((value, index) => {
      values.push(value);
      const cast = casts[index] ? `::${casts[index]}` : '';
      return `$${values.length}${cast}`;
    });

    return `(${rowPlaceholders.join(', ')})`;
  });

  const quotedColumns = columns.map((column) => `"${column}"`).join(', ');

  return {
    text: `INSERT INTO "${tableName}" (${quotedColumns}) VALUES ${placeholders.join(', ')}`,
    values,
  };
}

// ─── صور محلية يتم رفعها على Cloudinary ─────────────────────────────────────
const PUBLIC_IMAGE_FILES = [
  'images (1).jpeg',
  'images (2).jpeg',
  'images (3).jpeg',
  'images (4).jpeg',
  'images (5).jpeg',
  'images (6).jpeg',
  'images.jpeg',
  'junk-food759.jpg',
];

type SeedImage = {
  url: string;
  publicId: string;
};

function ensureCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Missing Cloudinary env vars');
  }
}

async function uploadSeedImages(): Promise<SeedImage[]> {
  ensureCloudinaryConfig();

  const publicDir = join(process.cwd(), 'public');

  return Promise.all(
    PUBLIC_IMAGE_FILES.map(async (fileName) => {
      const filePath = join(publicDir, fileName);

      if (!existsSync(filePath)) {
        throw new Error(`Missing seed image: ${filePath}`);
      }

      const result = (await cloudinary.uploader.upload(filePath, {
        folder: 'restaurant/menu-seed',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        resource_type: 'image',
      })) as UploadApiResponse;

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }),
  );
}

function getItemImages(index: number, uploadedImages: SeedImage[]) {
  return Array.from({ length: 3 }, (_, imageIndex) => {
    const image = uploadedImages[(index + imageIndex) % uploadedImages.length];

    return {
      url: image.url,
      publicId: image.publicId,
      order: imageIndex,
    };
  });
}

// ─── بيانات المنتجات ──────────────────────────────────────────────────────────
const menuItems: {
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  isAvailable: boolean;
}[] = [
  // ─── Appetizers (15 items) ────────────────────────────────────────────────
  {
    name: 'حمص بالطحينة',
    description: 'حمص كريمي مع طحينة فاخرة وزيت زيتون بكر وبقدونس طازج',
    price: 25.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'بابا غنوج',
    description: 'باذنجان مشوي مهروس مع طحينة وليمون وثوم',
    price: 28.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'سلطة فتوش',
    description: 'خضروات طازجة مع خبز مقرمش وصلصة رمان',
    price: 22.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'ورق عنب بالزيت',
    description: 'ورق عنب محشو بالأرز والبقدونس والطماطم',
    price: 35.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'جبنة بالزعتر',
    description: 'جبنة بيضاء طازجة مع زعتر وزيت زيتون',
    price: 20.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'فلافل',
    description: 'كرات الفلافل المقلية المقرمشة مع صلصة الطحينة',
    price: 30.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'سبانخ بالجبنة',
    description: 'فطائر السبانخ والجبنة الفيتا الطازجة',
    price: 32.0,
    category: MenuCategory.appetizer,
    isAvailable: false,
  },
  {
    name: 'سلطة تبولة',
    description: 'بقدونس طازج مع البرغل والطماطم والنعناع',
    price: 24.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'شوربة عدس',
    description: 'شوربة عدس أصفر بالكمون والليمون',
    price: 18.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'شوربة طماطم',
    description: 'شوربة طماطم كريمية مع ريحان طازج',
    price: 20.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'مقبلات مشكلة',
    description: 'تشكيلة من الحمص والمتبل وورق العنب والفلافل',
    price: 65.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'جبنة مقلية',
    description: 'جبنة هالومي مقلية مع خضروات مشوية',
    price: 38.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'أرضي شوكي مقلي',
    description: 'قلوب الأرضي شوكي المقلية مع صلصة الليمون والثوم',
    price: 42.0,
    category: MenuCategory.appetizer,
    isAvailable: false,
  },
  {
    name: 'سمبوسة لحم',
    description: 'مثلثات عجين محشوة بلحم مفروم والبهارات',
    price: 36.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },
  {
    name: 'شوربة دجاج',
    description: 'شوربة دجاج بيضاء بالخضروات والشعرية',
    price: 22.0,
    category: MenuCategory.appetizer,
    isAvailable: true,
  },

  // ─── Main Courses (20 items) ──────────────────────────────────────────────
  {
    name: 'كباب مشوي',
    description: 'كباب لحم ضأن مشوي على الفحم مع خبز وسلطة',
    price: 85.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'دجاج مشوي',
    description: 'نصف دجاجة مشوية بالأعشاب مع بطاطس مشوية',
    price: 72.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'سمك فيليه',
    description: 'فيليه سمك مشوي بصلصة الليمون والكبر',
    price: 95.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'شاورما دجاج',
    description: 'شاورما دجاج بالخبز العربي مع الثوم والمخلل',
    price: 55.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'شاورما لحم',
    description: 'شاورما لحم بالخبز العربي مع الطحينة والبقدونس',
    price: 65.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'مسخن دجاج',
    description: 'دجاج بالبصل المكرمل والسماق على خبز طابون',
    price: 78.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'مقلوبة',
    description: 'أرز مع دجاج أو لحم وخضروات مقلوبة بالبهارات',
    price: 80.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'منسف',
    description: 'لحم ضأن مع الجميد على طبق الأرز والخبز الرقيق',
    price: 120.0,
    category: MenuCategory.main_course,
    isAvailable: false,
  },
  {
    name: 'كفتة مشوية',
    description: 'كفتة لحم مشوية مع أرز وسلطة',
    price: 70.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'ستيك لحم',
    description: 'ستيك لحم بقري مع بطاطس وصلصة الفطر',
    price: 135.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'دجاج بالكاري',
    description: 'دجاج بصلصة الكاري الهندي مع أرز بسمتي',
    price: 68.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'سمك صيادية',
    description: 'سمك مع أرز الصيادية والبصل والبهارات',
    price: 90.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'فتة دجاج',
    description: 'طبق الفتة بالدجاج والأرز والخبز والزبادي',
    price: 62.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'ملوخية بالأرانب',
    description: 'ملوخية طازجة مطبوخة مع الأرانب والثوم',
    price: 75.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'برياني دجاج',
    description: 'أرز البرياني بالدجاج والزعفران والبهارات الهندية',
    price: 85.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'لازانيا لحم',
    description: 'لازانيا إيطالية بالبشاميل ولحم مفروم',
    price: 78.0,
    category: MenuCategory.main_course,
    isAvailable: false,
  },
  {
    name: 'باستا أرابياتا',
    description: 'باستا بصلصة الطماطم الحارة والثوم',
    price: 55.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'برجر لحم',
    description: 'برجر لحم بقري 200 جرام مع جبنة وخضروات',
    price: 65.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'دجاج كريسبي',
    description: 'قطع دجاج مقرمشة مع صلصة الهوت وبطاطس',
    price: 60.0,
    category: MenuCategory.main_course,
    isAvailable: true,
  },
  {
    name: 'أخطبوط مشوي',
    description: 'أخطبوط مشوي بزيت الزيتون والأعشاب البحرية',
    price: 110.0,
    category: MenuCategory.main_course,
    isAvailable: false,
  },

  // ─── Desserts (12 items) ──────────────────────────────────────────────────
  {
    name: 'كنافة نابلسية',
    description: 'كنافة بجبنة الموزاريلا والقطر والفستق',
    price: 40.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'أم علي',
    description: 'حلوى أم علي المصرية بالكريمة والمكسرات',
    price: 35.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'بقلاوة',
    description: 'بقلاوة بالفستق والقطر محلية الصنع',
    price: 30.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'تشيز كيك',
    description: 'تشيز كيك كريمي بصلصة الفراولة',
    price: 45.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'مولتن كيك شوكولاتة',
    description: 'كيك شوكولاتة ساخن بقلب سائل مع آيس كريم',
    price: 50.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'تيراميسو',
    description: 'تيراميسو إيطالي كلاسيكي بالكاكاو والقهوة',
    price: 48.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'بودينج مانجو',
    description: 'بودينج كريمي بالمانجو الطازجة',
    price: 32.0,
    category: MenuCategory.dessert,
    isAvailable: false,
  },
  {
    name: 'آيس كريم مانجو',
    description: 'آيس كريم مانجو طبيعي 3 كرات',
    price: 28.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'كريب نوتيلا',
    description: 'كريب رقيق بالنوتيلا والموز والفراولة',
    price: 38.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'رقائق الشوكولاتة',
    description: 'وافل بالشوكولاتة والكريمة المخفوقة',
    price: 42.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'مهلبية',
    description: 'مهلبية بماء الورد والفستق والزبيب',
    price: 22.0,
    category: MenuCategory.dessert,
    isAvailable: true,
  },
  {
    name: 'قطايف رمضانية',
    description: 'قطايف محشوة بالقشطة والمكسرات',
    price: 35.0,
    category: MenuCategory.dessert,
    isAvailable: false,
  },

  // ─── Beverages (13 items) ─────────────────────────────────────────────────
  {
    name: 'عصير مانجو طازج',
    description: 'عصير مانجو طبيعي 100% بدون سكر',
    price: 25.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'ليموناضة نعناع',
    description: 'ليموناضة طازجة بالنعناع والنكهة المنعشة',
    price: 20.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'قهوة عربية',
    description: 'قهوة عربية بالهيل والزعفران',
    price: 15.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'شاي أحمر',
    description: 'شاي أحمر مصري بالنعناع الطازج',
    price: 10.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'كابوتشينو',
    description: 'كابوتشينو إيطالي بالحليب المبخر والكاكاو',
    price: 30.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'لاتيه',
    description: 'لاتيه كريمي بالفانيليا أو الكراميل',
    price: 32.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'سموذي فراولة',
    description: 'سموذي الفراولة بالحليب والعسل',
    price: 28.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'عصير برتقال',
    description: 'عصير برتقال طازج معصور أمامك',
    price: 22.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'مياه معدنية',
    description: 'مياه معدنية 500 مل',
    price: 8.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'سودا بالنكهات',
    description: 'مياه غازية بنكهة الليمون أو التوت',
    price: 18.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'كوكتيل فواكه',
    description: 'مزيج فواكه طازجة موسمية',
    price: 35.0,
    category: MenuCategory.beverage,
    isAvailable: false,
  },
  {
    name: 'شاي أخضر',
    description: 'شاي أخضر ياباني بالليمون والزنجبيل',
    price: 15.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },
  {
    name: 'شوكولاتة ساخنة',
    description: 'شوكولاتة ساخنة كريمية مع مارشميلو',
    price: 28.0,
    category: MenuCategory.beverage,
    isAvailable: true,
  },

  // ─── Side Dishes (10 items) ───────────────────────────────────────────────
  {
    name: 'بطاطس مقلية',
    description: 'بطاطس فرنسية مقلية مقرمشة مع كاتشب',
    price: 20.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'أرز أبيض',
    description: 'أرز أبيض مطبوخ بالزبدة والشعرية',
    price: 15.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'خبز عربي',
    description: 'خبز عربي طازج 3 أرغفة',
    price: 8.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'سلطة خضراء',
    description: 'سلطة خضراء طازجة بالطماطم والخيار والزيتون',
    price: 18.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'بطاطس مشوية',
    description: 'بطاطس مشوية بالروزماري وزيت الزيتون',
    price: 22.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'خضروات مشوية',
    description: 'تشكيلة خضروات مشوية بزيت الزيتون والأعشاب',
    price: 25.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'أرز بالخضار',
    description: 'أرز مطبوخ مع الخضروات الموسمية والبهارات',
    price: 22.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'خبز ثوم',
    description: 'خبز محمص بالثوم والبقدونس والزبدة',
    price: 18.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'مخلل مشكل',
    description: 'مخلل خضروات مشكل محلي الصنع',
    price: 12.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
  {
    name: 'صلصة ثوم',
    description: 'صلصة الثوم الكريمية التوم',
    price: 10.0,
    category: MenuCategory.side_dish,
    isAvailable: true,
  },
];

function enrichMenuItem(item: (typeof menuItems)[number], index: number) {
  const hasDiscount = index % 4 === 0 || item.category === MenuCategory.dessert;
  const discountValues = [10, 15, 20, 25];

  return {
    ...item,
    hasDiscount,
    discountPercentage: hasDiscount ? discountValues[index % discountValues.length] : null,
    rating: Number((4.1 + (index % 9) * 0.1).toFixed(1)),
  };
}

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
  console.log('🌱 بدء عملية الـ Seeding...\n');

  // حذف البيانات القديمة
  console.log('🗑️  حذف البيانات القديمة...');
  await withRetry(() => pool.query('DELETE FROM "menu_item_images"'), 'حذف صور المنتجات');
  await withRetry(() => pool.query('DELETE FROM "menu_items"'), 'حذف المنتجات');
  console.log('✅ تم حذف البيانات القديمة\n');

  // إنشاء المنتجات
  console.log(`📦 إنشاء ${menuItems.length} منتج...\n`);
  console.log('☁️  رفع صور الـ public على Cloudinary...');
  const uploadedImages = await uploadSeedImages();
  console.log(`✅ تم رفع ${uploadedImages.length} صور على Cloudinary\n`);

  const itemsWithIds = menuItems.map((item, index) => ({
    id: randomUUID(),
    ...enrichMenuItem(item, index),
  }));

  const menuItemsInsert = buildBulkInsert(
    'menu_items',
    [
      'id',
      'name',
      'description',
      'price',
      'category',
      'is_available',
      'has_discount',
      'discount_percentage',
      'rating',
      'created_at',
      'updated_at',
    ],
    itemsWithIds.map((item) => [
      item.id,
      item.name,
      item.description,
      item.price,
      item.category,
      item.isAvailable,
      item.hasDiscount,
      item.discountPercentage,
      item.rating,
      'now',
      'now',
    ]),
    {
      4: '"MenuCategory"',
      9: 'timestamptz',
      10: 'timestamptz',
    },
  );

  const imagesInsert = buildBulkInsert(
    'menu_item_images',
    ['id', 'menu_item_id', 'url', 'public_id', 'order', 'created_at'],
    itemsWithIds.flatMap((item, itemIndex) =>
      getItemImages(itemIndex, uploadedImages).map((image) => [
        randomUUID(),
        item.id,
        image.url,
        image.publicId,
        image.order,
        'now',
      ]),
    ),
    {
      5: 'timestamptz',
    },
  );

  await withRetry(
    async () => {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(menuItemsInsert);
        await client.query(imagesInsert);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    'إنشاء المنتجات',
  );

  for (const [index, item] of menuItems.entries()) {
    const enrichedItem = enrichMenuItem(item, index);
    console.log(
      `✅ [${index + 1}/${menuItems.length}] ${item.name} — ${item.category} — ${item.price} ج.م — خصم ${enrichedItem.discountPercentage ?? 0}% — تقييم ${enrichedItem.rating} — 3 صور`,
    );
  }

  // ─── ملخص ─────────────────────────────────────────────────────────────────
  const counts = [
    menuItems.filter((item) => item.category === MenuCategory.appetizer).length,
    menuItems.filter((item) => item.category === MenuCategory.main_course).length,
    menuItems.filter((item) => item.category === MenuCategory.dessert).length,
    menuItems.filter((item) => item.category === MenuCategory.beverage).length,
    menuItems.filter((item) => item.category === MenuCategory.side_dish).length,
    menuItems.filter((item) => item.isAvailable).length,
    menuItems.filter((item) => !item.isAvailable).length,
    menuItems.map(enrichMenuItem).filter((item) => item.hasDiscount).length,
    menuItems.length,
  ];

  console.log('\n─────────────────────────────────────────────');
  console.log('📊 ملخص الـ Seed:');
  console.log(`   🥗 Appetizers    : ${counts[0]} منتج`);
  console.log(`   🍽️  Main Courses  : ${counts[1]} منتج`);
  console.log(`   🍰 Desserts      : ${counts[2]} منتج`);
  console.log(`   🥤 Beverages     : ${counts[3]} منتج`);
  console.log(`   🍟 Side Dishes   : ${counts[4]} منتج`);
  console.log(`   ✅ متاح          : ${counts[5]} منتج`);
  console.log(`   ❌ غير متاح      : ${counts[6]} منتج`);
  console.log(`   🏷️  عليها خصم     : ${counts[7]} منتج`);
  console.log(`   📦 الإجمالي      : ${counts[8]} منتج`);
  console.log('─────────────────────────────────────────────');
  console.log('\n🎉 تم الـ Seeding بنجاح!');
  console.log(
    `\n💡 الـ Pagination: لو limit = 10، هيكون عندك ${Math.ceil(counts[8] / 10)} صفحات`,
  );
}

main()
  .catch((error) => {
    console.error('❌ خطأ في الـ Seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
