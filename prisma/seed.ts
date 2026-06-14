import { config } from 'dotenv';
config(); // ← لازم يكون أول سطر قبل أي import تاني

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
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

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
): Promise<T> {
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

      console.log(
        `⏳ ${label} فشلت مؤقتًا (${code})، محاولة ${attempt + 1}/${maxAttempts}...`,
      );
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

// ─── الصور الموجودة في /public ────────────────────────────────────────────────
const PUBLIC_IMAGE_FILES = [
  '_ (1).jpeg',
  '_ (2).jpeg',
  '_ (3).jpeg',
  '_ (4).jpeg',
  '_ (5).jpeg',
  '_.jpeg',
  'Burger Social Media Post Design.jpeg',
  'Cheese Overload A Tempting Pizza Slice#pikbest#Backgrounds.jpeg',
  'Delicious Salami Pizza#L01f355.jpeg',
  'Food Poster Design Ideas.jpeg',
  'Restaurant Poster Design _ Burger Advertisement Design _ Food Promotion Creative.jpeg',
  'banner de hamb#U00farguer.jpeg',
  '#foodie #food #foodporn #instafood #foodphotography #foodstagram #foodblogger #foodlover #yummy #delicious #instagood #foodgasm #homemade #foodies #healthyfood #dinner #foodpics #tasty #foodiesofinstagram #love #restaurant #lunch #dessert #cooking #b.jpeg',
  '@ii_gold_flake_ii _ DM FOR POSTER EDITS, AN BIRTHDAY POSTERS #L01f4b8.jpeg',
];

type SeedImage = {
  url: string;
  publicId: string;
};

const categories = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'بيتزا',
    slug: 'appetizer',
    description: 'مقبلات ومأكولات خفيفة تفتح الشهية',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'طبق الرئيسي',
    slug: 'main_course',
    description: 'أطباق رئيسية دسمة ومشبعة',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'حلويات',
    slug: 'dessert',
    description: 'حلويات وتحلية شهية',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'برجر',
    slug: 'beverage',
    description: 'مشروبات ساخنة وباردة',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'طبق جانبي',
    slug: 'side_dish',
    description: 'أطباق جانبية ومكملات',
  },
] as const;

type CategorySlug = (typeof categories)[number]['slug'];

const categoryIdBySlug = new Map<CategorySlug, string>(
  categories.map((category) => [category.slug, category.id]),
);

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
  const results: SeedImage[] = [];

  for (const fileName of PUBLIC_IMAGE_FILES) {
    const filePath = join(publicDir, fileName);

    if (!existsSync(filePath)) {
      console.warn(`⚠️  صورة مش موجودة، هتتاخد بديلة: ${fileName}`);
      continue;
    }

    try {
      const result = (await cloudinary.uploader.upload(filePath, {
        folder: 'restaurant/menu-seed',
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        resource_type: 'image',
      })) as UploadApiResponse;

      results.push({
        url: result.secure_url,
        publicId: result.public_id,
      });

      console.log(`  ☁️  رُفعت: ${fileName.slice(0, 40)}...`);
    } catch (err) {
      console.warn(`  ⚠️  فشل رفع: ${fileName.slice(0, 40)} — ${String(err)}`);
    }
  }

  if (results.length === 0) {
    throw new Error(
      'لم يتم رفع أي صورة على Cloudinary — تأكد من الـ .env والـ public folder',
    );
  }

  return results;
}

function getItemImages(index: number, uploadedImages: SeedImage[], count = 3) {
  return Array.from({ length: count }, (_, imageIndex) => {
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
  category: CategorySlug;
  isAvailable: boolean;
  imagesCount?: number; // عدد الصور لهذه الوجبة (الافتراضي 3 صور)
}[] = [
  // ─── Appetizers (15 items) ────────────────────────────────────────────────
  {
    name: 'حمص بالطحينة',
    description:
      'حمص كريمي ناعم مُعدّ من أجود أنواع الحمص المنقوع، يُمزج مع طحينة فاخرة وعصير ليمون طازج وثوم مهروس، يُرشّ عليه زيت زيتون بكر أول عصرة وبقدونس طازج مفروم. يُقدَّم ساخناً مع خبز عربي طازج.',
    price: 25.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'بابا غنوج',
    description:
      'باذنجان أسود مشوي مباشرة على النار حتى ينضج تماماً وتفوح منه رائحة الدخان الشهية، ثم يُهرس ويُمزج مع طحينة عالية الجودة وعصير ليمون حامض وثوم وملح. تُضاف لمسة أخيرة من زيت الزيتون والبابريكا الحمراء. طبق مثالي للمحبين.',
    price: 28.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'سلطة فتوش',
    description:
      'سلطة لبنانية أصيلة مُعدّة من خضروات طازجة تشمل الخس والطماطم والخيار والفجل والبصل الأخضر والنعناع، تُقطّع وتُخلط مع قطع الخبز العربي المحمص المقرمش. تُتبَّل بصلصة دبس الرمان والليمون وزيت الزيتون والسماق. منعشة وخفيفة.',
    price: 22.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'ورق عنب بالزيت',
    description:
      'أوراق عنب طرية يدوياً محشوة بمزيج من الأرز الأبيض والبقدونس الطازج المفروم والطماطم والبصل والليمون وزيت الزيتون والبهارات العربية المنتقاة. تُطهى على نار هادئة حتى تنضج تماماً وتمتص كل النكهات. يُقدَّم بارداً أو ساخناً مع شرائح الليمون.',
    price: 35.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'جبنة بالزعتر',
    description:
      'جبنة بيضاء طازجة كريمية الملمس تُقدَّم مع خلطة زعتر بلدي أصيلة تحتوي على الزعتر والسمسم المحمص وزيت الزيتون البكر والسماق وحبة البركة. يُرافقها طبق من زيتون أسود فاخر وطماطم طازجة وخيار. إفطار أو مقبلة لا تُقاوَم.',
    price: 20.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'فلافل',
    description:
      'كرات فلافل مقرمشة من الخارج ناعمة من الداخل، مُعدّة من الفول الأخضر المنقوع والحمص المطحون مع الثوم والكزبرة الخضراء والبقدونس والكمون والبهارات السرية. تُقلى في زيت نباتي نظيف حتى تتحوّل إلى اللون الذهبي. تُقدَّم مع صلصة الطحينة ومخلل الشمندر.',
    price: 30.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'سبانخ بالجبنة',
    description:
      'فطائر مثلثة الشكل مُعدّة من عجينة خميرة رقيقة ومقرمشة محشوة بمزيج من السبانخ الطازجة المُسلوقة والمُصفّاة مع جبنة الفيتا اليونانية المفتتة والبصل المسلوق والفلفل الأسود وجوزة الطيب. تُخبز في الفرن على درجة حرارة عالية حتى تتحوّل إلى اللون الذهبي.',
    price: 32.0,
    category: 'appetizer',
    isAvailable: false,
  },
  {
    name: 'سلطة تبولة',
    description:
      'سلطة لبنانية كلاسيكية مُعدّة أساساً من كميات وفيرة من البقدونس الطازج الناعم المفروم يدوياً مع النعناع الطازج والطماطم الناضجة والبرغل الناعم المنقوع مسبقاً. تُتبَّل بسخاء من عصير الليمون الطازج وزيت الزيتون البكر والملح. تُقدَّم باردة ومنعشة.',
    price: 24.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'شوربة عدس',
    description:
      'شوربة دافئة ومريحة مُعدّة من العدس الأصفر المطهو ببطء مع البصل المحمر والثوم والكمون والكركم وبهارات الشوربة المنتقاة. تُهرَس حتى تصبح كريمية الملمس تماماً ثم تُضبط بعصير الليمون الطازج. تُقدَّم ساخنة مع خبز محمص وشرائح الليمون.',
    price: 18.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'شوربة طماطم',
    description:
      'شوربة طماطم كريمية مُعدّة من الطماطم الطازجة الناضجة التي تُطهى مع البصل والثوم والزبدة وزيت الزيتون ثم تُهرَس وتُصفَّى. يُضاف إليها القشدة الطازجة لتصبح كريمية القوام. تُرشّ عليها أوراق الريحان الطازج وزيت الزيتون. شوربة دافئة تناسب الجميع.',
    price: 20.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'مقبلات مشكلة',
    description:
      'طبق مشترك مثالي للمجموعات والعائلات، يحتوي على تشكيلة كاملة من أشهر المقبلات الشرقية: حمص بالطحينة، متبل الباذنجان المشوي، ورق عنب بالزيت البارد، كرات فلافل مقرمشة، وجبنة بيضاء بالزيتون. كل عنصر مُعدّ بعناية ويُقدَّم مع خبز عربي طازج.',
    price: 65.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'جبنة مقلية',
    description:
      'شرائح جبنة هالومي قبرصية أصيلة تُشوى على صاج ساخن حتى تتحمّر من الخارج وتظل طرية من الداخل. تُقدَّم ساخنة فوراً مع طبق من الخضروات المشوية تشمل الفلفل الملوّن والكوسة والطماطم الكرزية وشرائح الليمون الطازج والزعتر الأخضر. طبق لذيذ للنباتيين وغيرهم.',
    price: 38.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'أرضي شوكي مقلي',
    description:
      'قلوب الأرضي شوكي الطازجة المنظّفة تُغمس في خليط الطحين والتوابل ثم تُقلى بالزيت الساخن حتى تصبح مقرمشة من الخارج وطرية من الداخل. تُقدَّم فوراً مع صلصة الأيولي بالليمون والثوم المحمّص، ويُرشّ عليها الملح الخشن والبقدونس المفروم. طبق موسمي استثنائي.',
    price: 42.0,
    category: 'appetizer',
    isAvailable: false,
  },
  {
    name: 'سمبوسة لحم',
    description:
      'مثلثات عجين مقرمشة مُعدّة يدوياً ومحشوة بمزيج شهي من اللحم المفروم المطهو مع البصل والطماطم والكزبرة الخضراء والفلفل الحلو والبهارات الشرقية المنتقاة والصنوبر المحمص. تُقلى في زيت ساخن حتى تتحوّل إلى اللون الذهبي المقرمش. تُقدَّم مع صلصة الهوت سوس.',
    price: 36.0,
    category: 'appetizer',
    isAvailable: true,
  },
  {
    name: 'شوربة دجاج',
    description:
      'شوربة دجاج بيضاء كلاسيكية غنية بالنكهة، مُعدّة من دجاج طازج يُسلق مع البصل والكرفس والجزر وورق الغار وحبوب الفلفل الأسود. يُرفَع الدجاج ويُفتّت ويُعاد إلى المرق الصافي مع الشعرية الرقيقة والخضروات. تُقدَّم ساخنة مع عصير الليمون وخبز محمص.',
    price: 22.0,
    category: 'appetizer',
    isAvailable: true,
  },

  // ─── Main Courses (20 items) ──────────────────────────────────────────────
  {
    name: 'كباب مشوي',
    description:
      'كباب لحم ضأن طازج مُعدّ من خليط من اللحم المفروم ناعماً مع البصل المبشور والبقدونس والثوم والبهارات الشرقية الأصيلة وبودرة الفلفل الحلو. يُشكَّل على أسياخ طويلة ويُشوى مباشرة على جمر الفحم الطبيعي حتى يتحوّل إلى اللون البني الغامق. يُقدَّم مع خبز طابون ساخن وسلطة طازجة وصلصة الثوم.',
    price: 85.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'دجاج مشوي',
    description:
      'نصف دجاجة طازجة تُتبَّل لساعات بخلطة من الزيت والثوم المهروس والليمون والكركم والكمون والبابريكا والأعشاب الإيطالية. تُشوى في الفرن على درجة حرارة عالية حتى تتحمر الجلدة وتصبح مقرمشة بينما يظل الداخل طرياً ومليئاً بالعصارة. تُقدَّم مع بطاطس مشوية وسلطة خضراء.',
    price: 72.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'سمك فيليه',
    description:
      'فيليه سمك طازج سميك يُتبَّل بعصير الليمون والثوم وزيت الزيتون والأعشاب الطازجة، ثم يُشوى على شبكة ساخنة مشحمة حتى يتحمّر من الخارج ويظل طرياً من الداخل. يُقدَّم مع صلصة الكبر والليمون الكريمية وطبق من الخضروات المشوية والبطاطس المهروسة بالزبدة.',
    price: 95.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'شاورما دجاج',
    description:
      'شاورما دجاج طازج مُتبَّل بخلطة الشاورما الخاصة التي تشمل البهارات والكركم والكمون والثوم والليمون والزيت، يُشوى على حجر الشاورما الدوّار ببطء. يُقطَّع بعناية ويُوضع في خبز عربي طازج مع كريمة الثوم البيضاء والمخلل والطماطم والبقدونس. خيار الجميع المفضل.',
    price: 55.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'شاورما لحم',
    description:
      'شاورما لحم بقري وضأن مُتبَّل بخلطة بهارات عربية فاخرة تشمل الهيل والقرفة والكمون وورق الغار والفلفل الأسود، يُشوى ببطء على الحجر الدوّار لساعات. يُلفّ في خبز عربي طازج مع صلصة الطحينة والبقدونس المفروم والطماطم والمخلل الحامض. نكهة لا تُنسى.',
    price: 65.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'مسخن دجاج',
    description:
      'طبق فلسطيني أصيل يعتمد على دجاج طازج مطهو ببطء فوق كميات وفيرة من البصل المُعدّ بالزيت الفاخر والسماق المطحون الذي يُعطيه النكهة الحامضية المميزة. يُوضع فوق خبز الطابون الطازج الكبير ويُزيَّن بالصنوبر المحمص واللوز. طبق تراثي أصيل لمناسبات خاصة.',
    price: 78.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'مقلوبة',
    description:
      'طبق شرقي تراثي يُعدّ في قدر عميقة تُرتَّب فيها طبقات متناوبة من الباذنجان المقلي والقرنبيط والجزر والبطاطس مع الدجاج أو اللحم والأرز ذي الحبة الطويلة المُتبَّل ببهارات الكركم والقرفة والهيل. تُطهى ببطء ثم تُقلَّب الطريقة الكلاسيكية وتُزيَّن بالمكسرات المحمصة واللبن.',
    price: 80.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'منسف',
    description:
      'الطبق الوطني الأردني بامتياز، يُعدّ من لحم ضأن طازج يُطهى ببطء في مرق الجميد الأبيض الكثيف المُعدّ من اللبن المجفف الأصيل الذي يُعطيه النكهة المميزة والفريدة. يُقدَّم فوق طبقة من خبز الشراك الرقيق ثم الأرز البسمتي الأبيض. يُرشّ عليه الصنوبر واللوز المحمص واللبن الساخن.',
    price: 120.0,
    category: 'main_course',
    isAvailable: false,
  },
  {
    name: 'كفتة مشوية',
    description:
      'كفتة لحم مفروم ناعم مُعدّة من لحم البقر والضأن المخلوطين مع البصل المبشور والبقدونس والكزبرة والبهارات الشرقية وبودرة الفلفل. تُشكَّل بيديّ الطاهي إلى أشكال مستطيلة وتُشوى مباشرة على الفحم. تُقدَّم مع أرز أبيض بالشعرية وسلطة طازجة وصلصة طماطم محلية.',
    price: 70.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'ستيك لحم',
    description:
      'قطعة ستيك لحم بقري من تقطيع سيرلوين بوزن 250 جرام تقريباً، تُتبَّل بالملح الخشن والفلفل الأسود الطازج الطحن وزيت الزيتون، تُشوى على الشواية الساخنة إلى الدرجة المطلوبة حسب رغبة العميل. تُقدَّم مع صلصة الفطر الكريمية وبطاطس شيبس مقرمشة وخضروات مشوية.',
    price: 135.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'دجاج بالكاري',
    description:
      'قطع دجاج منزوعة العظم تُطهى ببطء في صلصة كاري هندية أصيلة مُعدّة من الكاري المطحون والكركم وبذور الكزبرة والهيل والقرفة والطماطم الطازجة والبصل وجوز الهند الكريمي. يُضبط مستوى الحرارة حسب الطلب. يُقدَّم مع أرز بسمتي مطهو بالهيل والقرنفل وشرائح الليمون.',
    price: 68.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'سمك صيادية',
    description:
      'طبق بحري متوسطي أصيل يُعدّ من سمك طازج يُقلى في زيت ساخن ثم يُطهى فوق أرز الصيادية المميز المُعدّ من البصل المحمّر جداً حتى يصبح بنياً داكناً مع الكمون والكزبرة والكركم ومرق السمك الغني. يُزيَّن بالصنوبر المحمص والليمون. طعم المطاعم البحرية الأصيلة.',
    price: 90.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'فتة دجاج',
    description:
      'طبق شعبي مصري وشامي شهير مُعدّ من طبقات متناوبة من الخبز العربي المقلي المقرمش وفوقه الأرز الأبيض المُتبَّل ثم الدجاج الطازج المطهو والمُفتَّت يدوياً. يُسقى بمرق الدجاج الساخن الغني ثم يُغطى بالزبادي المُتبَّل بالثوم والليمون والطحينة. يُزيَّن بالصنوبر والسماق.',
    price: 62.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'ملوخية بالأرانب',
    description:
      'طبق مصري تراثي أصيل يُعدّ من أوراق الملوخية الخضراء الطازجة المفرومة ناعماً والمطهوة في مرق الأرانب الغني مع الثوم الكثير والكزبرة الخضراء المقلية في السمن البلدي. تُقدَّم مع الأرنب المطهو وأرز أبيض بالشعرية وخبز عربي وشرائح الليمون. وجبة عائلية بامتياز.',
    price: 75.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'برياني دجاج',
    description:
      'أرز برياني هندي باكستاني فاخر مُعدّ من الأرز البسمتي الطويل الحبة المُتبَّل بالزعفران الإيراني الأصيل والهيل والقرنفل وورق الغار وعصا القرفة وبهارات الماسالا السرية. يُطهى بطريقة الـ Dum مع قطع الدجاج الكبيرة المُتبَّلة مسبقاً. يُقدَّم مع الزبادي والسلطة.',
    price: 85.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'لازانيا لحم',
    description:
      'لازانيا إيطالية كلاسيكية مُعدّة من طبقات صفائح اللازانيا المسلوقة المتبادلة مع صلصة البولونيز الغنية المُعدّة من اللحم المفروم والطماطم الطازجة والنبيذ الأحمر وبهارات إيطالية، وصلصة البشاميل الكريمية المُعدّة من الزبدة والدقيق والحليب. تُرشّ عليها الجبنة وتُخبز حتى تتحمّر.',
    price: 78.0,
    category: 'main_course',
    isAvailable: false,
  },
  {
    name: 'باستا أرابياتا',
    description:
      'باستا بيني إيطالية أصيلة مُطهوة حتى مرحلة Al Dente المثالية، تُقدَّم مع صلصة الأرابياتا الحارة والشهية المُعدّة من الطماطم الطازجة الناضجة والثوم المقلي في زيت الزيتون والفلفل الأحمر الحار المجفف وأوراق الريحان الطازجة. يُرشّ عليها جبنة البارميزان الإيطالي الأصيل.',
    price: 55.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'برجر لحم',
    description:
      'برجر كلاسيكي جورميه مُعدّ من لقمة لحم بقري طازجة بوزن 200 جرام مفرومة يدوياً ومُتبَّلة بالملح والفلفل والبهارات السرية، تُشوى على الحجر الساخن لتحافظ على العصارة. تُوضع في خبز بريوش طري ومع جبنة الشيدر المذابة والخس الطازج والطماطم والمخلل وصلصة البرجر الخاصة.',
    price: 65.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'دجاج كريسبي',
    description:
      'قطع دجاج طازجة منقوعة في اللبن الرائب لساعات لتصبح طرية جداً، ثم تُغمس في خلطة الطحين المُتبَّلة ببهارات الكريسبي السرية وتُقلى في زيت عميق ساخن حتى تتحوّل إلى اللون الذهبي المقرمش تماماً. تُقدَّم مع صلصة الهوت سوس الحارة وبطاطس كريسبي وكول سلو.',
    price: 60.0,
    category: 'main_course',
    isAvailable: true,
  },
  {
    name: 'أخطبوط مشوي',
    description:
      'أخطبوط طازج الصيد يُسلق أولاً ببطء مع الثوم والبهارات البحرية حتى يصبح طرياً تماماً، ثم يُتبَّل بزيت الزيتون الفاخر وعصير الليمون والثوم والبابريكا المدخّنة والأعشاب الإيطالية، ثم يُشوى على الشواية الحارة حتى تتحمّر الحواف. يُقدَّم مع صلصة الأيولي والليمون المشوي.',
    price: 110.0,
    category: 'main_course',
    isAvailable: false,
  },

  // ─── Desserts (12 items) ──────────────────────────────────────────────────
  {
    name: 'كنافة نابلسية',
    description:
      'كنافة نابلسية أصيلة مُعدّة من طبقتين من الكنافة الناعمة الإسفنجية تحتضنان حشوة من جبنة الموزاريلا الطازجة الممطوطة والعكاوي البيضاء المُنقّعة لإزالة الملح. تُخبز في صواني كبيرة على النار الهادئة حتى تصبح ذهبية مقرمشة من الأسفل. تُقدَّم ساخنة مغموسة بالقطر البارد ويُرشّ عليها الفستق الحلبي المطحون.',
    price: 40.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'أم علي',
    description:
      'حلوى مصرية شعبية تراثية مُعدّة من قطع العجين الهش المحمص أو الخبز الجاف المغموس في خليط كريمي من الحليب الدافئ والقشدة الطازجة والسكر والفانيليا، ثم تُوضع فوقها طبقة سميكة من الكريمة المخفوقة وتُرشّ بالمكسرات المتنوعة من اللوز والبندق والزبيب والجوز وجوز الهند. تُدخل الفرن حتى تتحمّر.',
    price: 35.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'بقلاوة',
    description:
      'بقلاوة شامية محلية الصنع مُعدّة يدوياً من طبقات رقيقة جداً من عجينة الفيلو الورقية المدهونة بالسمن البلدي الأصيل، يُوضع بينها حشوة وفيرة من الفستق الحلبي الأخضر الطازج المطحون أو المزيج مع الجوز. تُخبز حتى تصبح ذهبية مقرمشة ثم تُسكب عليها القطر البارد المُعطَّر بماء الورد والمستكة.',
    price: 30.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'تشيز كيك',
    description:
      'تشيز كيك نيويوركي كلاسيكي فاخر مُعدّ من قاعدة بسكويت الغراهام المهروس بالزبدة، وحشوة كريمية سميكة من الكريم تشيز الفيلادلفيا الكامل الدسم مع البيض والقشدة الحامضة والسكر والفانيليا. تُخبز ببطء في حمام مائي لضمان ملمس كريمي ناعم ومتجانس تماماً. تُقدَّم باردة مع كولي الفراولة الطازجة.',
    price: 45.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'مولتن كيك شوكولاتة',
    description:
      'كيك شوكولاتة دافئ صغير مُعدّ من الشوكولاتة الداكنة عالية الجودة 70% كاكاو مع الزبدة الطازجة والسكر البودرة والبيض والدقيق. يُخبز بعناية فائقة لفترة محسوبة بدقة لضمان تصلّب الخارج مع بقاء المركز سائلاً ذهبياً دافئاً. يُقدَّم فوراً مع كرة آيس كريم الفانيليا الطازج ومسحوق الكاكاو.',
    price: 50.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'تيراميسو',
    description:
      'تيراميسو إيطالي كلاسيكي فاخر مُعدّ بالطريقة التقليدية الأصيلة من بسكويت الساووياردي المغموس في قهوة الإسبريسو المركّزة الباردة مع لمسة من الكحول الإيطالي الأصيل، يُرتَّب في طبقات مع كريمة الماسكاربوني الكريمية المُعدّة من الجبنة الإيطالية والبيض والسكر المجلّد. يُرشّ عليها الكاكاو الداكن غير المحلى.',
    price: 48.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'بودينج مانجو',
    description:
      'بودينج كريمي ناعم مُعدّ من مانجو طازجة ناضجة عطرية يُهرس لبّها الناعم ويُمزج مع الحليب الكامل والقشدة الطازجة والسكر والجيلاتين. يُسكب في أكواب زجاجية أنيقة ويُبرَّد لساعات حتى يتماسك تماماً. يُقدَّم مع قطع مانجو طازجة فوقه ورذاذ من عصير الليمون والنعناع الطازج.',
    price: 32.0,
    category: 'dessert',
    isAvailable: false,
  },
  {
    name: 'آيس كريم مانجو',
    description:
      'آيس كريم مانجو طبيعي 100% مُعدّ من لبّ المانجو الطازجة الناضجة عالية الجودة دون أي نكهات صناعية أو ألوان مضافة. يُخفَق مع القشدة الكاملة الدسم والسكر الطبيعي ويُجمَّد ببطء. يُقدَّم ثلاث كرات كبيرة في طبق أنيق مع قطع المانجو الطازجة وصلصة المانجو المركّزة وورق النعناع.',
    price: 28.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'كريب نوتيلا',
    description:
      'كريب فرنسي رقيق جداً مُعدّ من عجينة الكريب الخفيفة التي تُسكب على صاج ساخن مشحوم وتُدار ببراعة حتى تصبح رقيقة شفافة ذهبية حواف مقرمشة. تُحشى بكمية سخية من الشوكولاتة الإيطالية الفاخرة وشرائح الموز الطازج الناضج والفراولة الحمراء الطازجة والكريمة المخفوقة. تُلفّ وتُقدَّم ساخنة.',
    price: 38.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'رقائق الشوكولاتة',
    description:
      'وافل بلجيكي طازج مُعدّ من عجينة الوافل الكلاسيكية المُخفَّقة بالزبدة والبيض والفانيليا، يُطهى في قالب الوافل الساخن حتى يصبح مقرمشاً من الخارج وطرياً من الداخل. يُراص بالشوكولاتة الداكنة الذائبة الدافئة والكريمة المخفوقة الطازجة وبودرة السكر الناعم. يُرشّ عليه رقائق الشوكولاتة المتنوعة.',
    price: 42.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'مهلبية',
    description:
      'مهلبية شرقية أصيلة ناعمة كريمية مُعدّة من الحليب الكامل الدسم والقشدة الطازجة والنشا الأبيض والسكر، تُطهى على نار هادئة مع التقليب المستمر حتى تتكاثف. تُعطَّر بماء الورد الدمشقي الفاخر وماء زهر الليمون. تُسكب في أكواب وتُبرَّد ثم تُقدَّم مع الفستق الحلبي المطحون والزبيب والمشمش المجفف.',
    price: 22.0,
    category: 'dessert',
    isAvailable: true,
  },
  {
    name: 'قطايف رمضانية',
    description:
      'قطايف رمضانية أصيلة مُعدّة من عجينة القطايف الإسفنجية المميزة التي تُعجن وتُخبز على الصاج الساخن من جهة واحدة. تُحشى حشوة سخية من القشطة البلدية الكثيفة المُعطَّرة بماء الورد مع المكسرات المفرومة من الفستق والجوز واللوز. تُغلق وتُقلى في سمن بلدي ثم تُغمس في القطر البارد.',
    price: 35.0,
    category: 'dessert',
    isAvailable: false,
  },

  // ─── Beverages (13 items) ─────────────────────────────────────────────────
  {
    name: 'عصير مانجو طازج',
    description:
      'عصير مانجو طبيعي 100% مُعدّ من المانجو الطازجة الناضجة المختارة يدوياً، يُعصر ويُخلط أمامك مباشرة بدون أي إضافات صناعية أو سكر مضاف أو ماء. قوام كثيف ومركّز وطعم حلو طبيعي. يُقدَّم بارداً في كوب كبير مع قطع ثلج نقي وشريحة مانجو طازجة. مشروب صحي ومنعش جداً.',
    price: 25.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'ليموناضة نعناع',
    description:
      'ليموناضة منعشة مُعدّة من عصير الليمون الطازج المعصور لحظياً أمامك مع أوراق النعناع الطازجة المهروسة برفق لإخراج عطرها وكمية مضبوطة من السكر وماء بارد نقي. تُقدَّم في كوب طويل مع قطع ثلج وأوراق نعناع طازجة وشريحة ليمون. مشروب صيفي مثالي ومنعش للغاية.',
    price: 20.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'قهوة عربية',
    description:
      'قهوة عربية أصيلة مُعدّة من البن العربي الأخضر المحمص خفيفاً والمطحون ناعماً، تُطهى في الدلة النحاسية التقليدية مع بذور الهيل الأخضر المطحون الطازج والزعفران الإيراني الفاخر. تُقدَّم في الفناجين الصغيرة التقليدية المُزيَّنة بالنقوش مع التمر العجوة أو الدبس.',
    price: 15.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'شاي أحمر',
    description:
      'شاي أحمر مصري أصيل مُعدّ من أوراق الشاي السيلاني والكيني المختلطة المُختارة بعناية، يُغلى في الماء المغلي لمدة كافية حتى يستخرج النكهة الكاملة. يُقدَّم بقوام متوسط في كوب زجاجي أو إبريق صغير مع أوراق النعناع الطازجة الوفيرة والسكر على الجانب. مشروب مصري تقليدي لا يُعوَّض.',
    price: 10.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'كابوتشينو',
    description:
      'كابوتشينو إيطالي أصيل مُعدّ من شوت مزدوج من الإسبريسو المستخلص بضغط عالٍ من بن محمص داكن مزيج خاص، يُضاف إليه الحليب المبخر الدافئ المُخفَّق إلى رغوة ناعمة كريمية كثيفة. يُزيَّن برسمة لاتيه آرت جميلة ويُرشّ عليه مسحوق الكاكاو الداكن غير المحلى. مشروب بن مثالي.',
    price: 30.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'لاتيه',
    description:
      'لاتيه كريمي فاخر مُعدّ من شوت إسبريسو مزدوج قوي مستخلص بعناية يُمزج مع كميات وافرة من الحليب المبخر الدافئ الكريمي. يُقدَّم بخيارات النكهات المتعددة: الفانيليا البوربون الأصيلة، الكراميل البني المحمص، البندق الإيطالي أو القرفة الدمشقية. يُزيَّن بلاتيه آرت جميل في الأعلى.',
    price: 32.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'سموذي فراولة',
    description:
      'سموذي فراولة طازج مُعدّ من الفراولة الطازجة الحمراء المختارة المجمّدة يدوياً مع الحليب الكامل الدسم البارد وعسل النحل الطبيعي الأصيل وبذور الشيا الغنية والفانيليا. يُخلط في الخلاط حتى يصبح ناعماً كريمياً. يُقدَّم في كوب طويل مع قطع الفراولة الطازجة والنعناع.',
    price: 28.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'عصير برتقال',
    description:
      'عصير برتقال طازج معصور أمامك مباشرة من أجود أنواع البرتقال الحلو الناضج الطازج بدون أي إضافات أو محليات صناعية. يُحتفظ بقليل من اللب الطبيعي الغني بالألياف. يُقدَّم بارداً فوراً في كوب زجاجي كبير مع قطع ثلج لتحافظ على برودته. غني بفيتامين سي ومنعش ومفيد للصحة.',
    price: 22.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'مياه معدنية',
    description:
      'مياه معدنية طبيعية نقية مُعبَّأة من ينابيع جبلية نقية بعيدة عن التلوث، حجم 500 مل. غنية بالمعادن الطبيعية المفيدة للجسم كالكالسيوم والمغنيسيوم والبوتاسيوم. تُقدَّم بارداً أو في درجة حرارة الغرفة حسب رغبة العميل. خيار صحي ومثالي لمن يحرص على صحته.',
    price: 8.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'سودا بالنكهات',
    description:
      'مشروب غازي مُعدّ من مياه الصودا المعدنية الطبيعية مع إضافة نكهات طازجة طبيعية يمكن الاختيار بينها: الليمون الحامض الطازج مع النعناع المنعش، أو التوت الأحمر والأزرق المركّز. يُقدَّم مع قطع ثلج وشرائح الفاكهة الطازجة وورق النعناع. مشروب خفيف ومنعش لأوقات الاسترخاء.',
    price: 18.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'كوكتيل فواكه',
    description:
      'كوكتيل فواكه موسمية فاخر مُعدّ من مزيج من الفواكه الطازجة المتاحة حسب الموسم مثل المانجو والفراولة والكيوي والأناناس والبطيخ والعنب. تُقشَّر وتُقطَّع وتُخلط مع عصير ليمون طازج وعسل طبيعي وأوراق نعناع. تُقدَّم في كوب كبير بارد. مشروب صحي غني بالفيتامينات والمعادن.',
    price: 35.0,
    category: 'beverage',
    isAvailable: false,
  },
  {
    name: 'شاي أخضر',
    description:
      'شاي أخضر ياباني عالي الجودة من نوع Sencha المعروف بلونه الزمردي الجميل ونكهته العشبية الخفيفة المنعشة، يُحضَّر بماء دافئ لا بالماء المغلي للحفاظ على الفوائد الصحية والنكهة الناعمة. يُضاف إليه شرائح الليمون الطازج وقطع الزنجبيل الطازج المغلي. غني بمضادات الأكسدة.',
    price: 15.0,
    category: 'beverage',
    isAvailable: true,
  },
  {
    name: 'شوكولاتة ساخنة',
    description:
      'شوكولاتة ساخنة فاخرة مُعدّة من الشوكولاتة البلجيكية الداكنة عالية الجودة ذات نسبة 60% كاكاو المذابة ببطء مع الحليب الكامل الدسم الساخن والقشدة الطازجة والسكر البني وقليل من الفانيليا الطبيعية. تُصبّ في مج كبير دافئ وتُزيَّن بطبقة سميكة من المارشميلو الطري وبودرة الكاكاو.',
    price: 28.0,
    category: 'beverage',
    isAvailable: true,
  },

  // ─── Side Dishes (11 items) ───────────────────────────────────────────────
  {
    name: 'بطاطس مقلية',
    description:
      'بطاطس فرنسية مقلية كلاسيكية مُعدّة من البطاطس الطازجة المقشرة والمقطعة إلى عيدان سميكة أو رفيعة حسب الطلب، تُقلى في زيت نباتي نظيف ساخن بدرجة حرارة مثالية حتى تصبح ذهبية مقرمشة من الخارج وطرية من الداخل. تُتبَّل بالملح الخشن والبابريكا الحلوة. تُقدَّم مع كاتشب طماطم وصلصة مايونيز.',
    price: 20.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'أرز أبيض',
    description:
      'أرز أبيض فاخر مُعدّ بالطريقة الشرقية التقليدية من أجود أنواع الأرز المصري أو البسمتي الطويل الحبة، يُحمَّر الشعرية الرقيقة في الزبدة الطازجة حتى تتحمّر ثم يُضاف الأرز المغسول والماء المقدَّر بدقة والملح. يُطهى على نار هادئة حتى يستوي تماماً وتتشرب الحبات الماء بشكل مثالي.',
    price: 15.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'خبز عربي',
    description:
      'خبز عربي طازج طازج مُعدّ يومياً في مخبز المطعم من دقيق القمح الفاخر والخميرة الطازجة والماء والملح. يُعجن ويُترك يرتاح ثم يُشكَّل إلى أرغفة دائرية رقيقة وتُخبز في الفرن الحجري الساخن حتى تنتفخ وتصبح ذهبية. يُقدَّم ثلاثة أرغفة ساخنة مباشرة من الفرن.',
    price: 8.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'سلطة خضراء',
    description:
      'سلطة خضراء طازجة بسيطة ومنعشة مُعدّة من الخس الأخضر الطازج المقطّع مع الطماطم الحمراء الناضجة والخيار الأخضر المقطّع والزيتون الأخضر والأسود والبصل الأبيض الرقيق وأوراق البقدونس. تُتبَّل بزيت الزيتون البكر وعصير الليمون الطازج والملح والفلفل الأسود الطازج الطحن.',
    price: 18.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'بطاطس مشوية',
    description:
      'بطاطس مشوية على الطريقة الإيطالية مُعدّة من البطاطس الطازجة المقطعة إلى أوتاد تُتبَّل بزيت الزيتون الفاخر والروزماري الطازج والثوم المسحوق والملح الخشن والفلفل الأسود وبهارات الأعشاب. تُوضع في صينية وتُشوى في الفرن الساخن حتى تتحمّر من الخارج وتنضج من الداخل.',
    price: 22.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'خضروات مشوية',
    description:
      'تشكيلة متنوعة من الخضروات الموسمية الطازجة تشمل الفلفل الملوّن الأحمر والأصفر والأخضر والكوسة والباذنجان الأسود والبصل الأحمر والطماطم الكرزية والهليون إن توفّر. تُتبَّل جميعاً بزيت الزيتون البكر والثوم والأعشاب الإيطالية الطازجة وتُشوى على الشواية الساخنة.',
    price: 25.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'أرز بالخضار',
    description:
      'أرز مُعدّ بطريقة شهية مُتبَّل بالخضروات الموسمية المتوفرة مثل البازلاء الخضراء والجزر المقطّع والفاصوليا الخضراء والذرة الصفراء والفلفل الملوّن. تُقلى الخضروات أولاً في الزيت مع الثوم والبصل ثم يُضاف الأرز والبهارات والكركم الذي يُعطيه اللون الذهبي الجميل.',
    price: 22.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'خبز ثوم',
    description:
      'خبز ثوم إيطالي محمص مُعدّ من شرائح خبز الباغيت أو الخبز الفرنسي المقطوع قطرياً ومدهون بسخاء بخليط الزبدة الطازجة المليّنة والثوم المهروس الطازج والبقدونس المفروم الناعم وقليل من الملح وزيت الزيتون. تُوضع في الفرن الساخن أو على الشواية حتى تتحمّر وتصبح مقرمشة.',
    price: 18.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'مخلل مشكل',
    description:
      'مخلل خضروات مشكل محلي الصنع مُعدّ بالطريقة التقليدية الأصيلة من خيار صغير وجزر وفلفل ألوان وقرنبيط وليمون حامض وثوم كامل وفلفل أخضر حار. تُخلّل في محلول ملح وخل وماء وبهارات التخليل لأيام أو أسابيع. مقرمش وحامض ومتوازن النكهة.',
    price: 12.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'صلصة ثوم',
    description:
      'صلصة ثوم بيضاء كريمية فاخرة مُعدّة بالطريقة اللبنانية الأصيلة من الثوم الطازج المهروس جيداً مع الزيت النباتي الخفيف والليمون الطازج والملح. تُخفق بالخلاط حتى تتحوّل إلى كريمة بيضاء ناعمة وكثيفة القوام وخفيفة الملمس في الوقت نفسه. نكهة ثوم قوية ومميزة.',
    price: 10.0,
    category: 'side_dish',
    isAvailable: true,
  },
  {
    name: 'تشيز فرايز',
    description:
      'بطاطس مقلية ذهبية مقرمشة تُغطّى بطبقة سخية من صوص الجبنة الشيدر الذائب الكريمي الساخن، وتُرشّ بالبقدونس المفروم الطازج وقليل من البابريكا. تُقدَّم فوراً ساخنة كطبق جانبي أو وجبة خفيفة بمفردها. مزيج مثالي بين القرمشة ودسامة الجبنة.',
    price: 26.0,
    category: 'side_dish',
    isAvailable: true,
    imagesCount: 1,
  },
];

// ─── Addons لكل وجبة ──────────────────────────────────────────────────────────
// كل item عنده index في menuItems array
// هنحدد addons حسب category
type AddonDef = { name: string; price: number };

function getAddonsForItem(
  categorySlug: CategorySlug,
  itemName: string,
): AddonDef[] {
  switch (categorySlug) {
    case 'main_course':
      if (itemName.includes('برجر') || itemName.includes('دجاج كريسبي')) {
        return [
          { name: 'صلصة هوت سوس', price: 5 },
          { name: 'جبنة شيدر إضافية', price: 8 },
          { name: 'بيكون مقرمش', price: 12 },
        ];
      }
      if (itemName.includes('باستا') || itemName.includes('لازانيا')) {
        return [
          { name: 'جبنة بارميزان إضافية', price: 7 },
          { name: 'خبز ثوم', price: 10 },
        ];
      }
      return [
        { name: 'سلطة جانبية', price: 10 },
        { name: 'صلصة ثوم', price: 5 },
        { name: 'خبز عربي إضافي', price: 5 },
      ];

    case 'dessert':
      return [
        { name: 'آيس كريم', price: 15 },
        { name: 'صلصة شوكولاتة', price: 8 },
        { name: 'مكسرات مشكلة', price: 10 },
      ];

    case 'beverage':
      return [
        { name: 'سكر إضافي', price: 2 },
        { name: 'حليب إضافي', price: 5 },
        { name: 'ثلج إضافي', price: 2 },
      ];

    case 'appetizer':
      return [
        { name: 'خبز محمص إضافي', price: 5 },
        { name: 'زيت زيتون إضافي', price: 5 },
      ];

    case 'side_dish':
      return [
        { name: 'صلصة كاتشب إضافية', price: 3 },
        { name: 'مايونيز', price: 3 },
      ];
  }
}

// ─── Sizes لكل وجبة ───────────────────────────────────────────────────────────
type SizeDef = {
  label: 'small' | 'medium' | 'large';
  price: number;
  isAvailable: boolean;
};

function getSizesForItem(
  categorySlug: CategorySlug,
  basePrice: number,
): SizeDef[] {
  // كل الوجبات لازم يكون ليها sizes عشان الـ "size" يكون موجود دايماً في الـ response
  if (categorySlug === 'beverage') {
    return [
      {
        label: 'small',
        price: Math.round(basePrice * 0.8 * 2) / 2,
        isAvailable: true,
      },
      { label: 'medium', price: basePrice, isAvailable: true },
      {
        label: 'large',
        price: Math.round(basePrice * 1.35 * 2) / 2,
        isAvailable: true,
      },
    ];
  }
  if (categorySlug === 'side_dish') {
    return [
      {
        label: 'small',
        price: Math.round(basePrice * 0.75 * 2) / 2,
        isAvailable: true,
      },
      { label: 'medium', price: basePrice, isAvailable: true },
      {
        label: 'large',
        price: Math.round(basePrice * 1.4 * 2) / 2,
        isAvailable: true,
      },
    ];
  }
  if (categorySlug === 'main_course') {
    return [
      {
        label: 'small',
        price: Math.round(basePrice * 0.7 * 2) / 2,
        isAvailable: true,
      },
      { label: 'medium', price: basePrice, isAvailable: true },
      {
        label: 'large',
        price: Math.round(basePrice * 1.3 * 2) / 2,
        isAvailable: false,
      },
    ];
  }
  // appetizer و dessert — كانت بدون sizes قبل كذا، دلوقتي بقى ليها أحجام كمان
  return [
    {
      label: 'small',
      price: Math.round(basePrice * 0.85 * 2) / 2,
      isAvailable: true,
    },
    { label: 'medium', price: basePrice, isAvailable: true },
    {
      label: 'large',
      price: Math.round(basePrice * 1.25 * 2) / 2,
      isAvailable: true,
    },
  ];
}

function enrichMenuItem(item: (typeof menuItems)[number], index: number) {
  const hasDiscount = index % 4 === 0 || item.category === 'dessert';
  const discountValues = [10, 15, 20, 25];
  return {
    ...item,
    hasDiscount,
    discountPercentage: hasDiscount
      ? discountValues[index % discountValues.length]
      : null,
    rating: Number((4.1 + (index % 9) * 0.1).toFixed(1)),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 بدء عملية الـ Seeding...\n');

  // حذف البيانات القديمة بالترتيب الصحيح
  console.log('🗑️  حذف البيانات القديمة...');
  await withRetry(
    () => pool.query('DELETE FROM "menu_item_images"'),
    'حذف الصور',
  );
  await withRetry(
    () => pool.query('DELETE FROM "menu_item_addons"'),
    'حذف الإضافات',
  );
  await withRetry(
    () => pool.query('DELETE FROM "menu_item_sizes"'),
    'حذف الأحجام',
  );
  await withRetry(() => pool.query('DELETE FROM "menu_items"'), 'حذف المنتجات');
  console.log('✅ تم حذف البيانات القديمة\n');

  // التصنيفات
  console.log('🏷️  إنشاء/تحديث التصنيفات...');
  await withRetry(
    () =>
      pool.query(
        `INSERT INTO "categories" ("id","name","slug","description","created_at","updated_at")
         SELECT * FROM UNNEST($1::uuid[],$2::text[],$3::text[],$4::text[],$5::timestamptz[],$6::timestamptz[])
         ON CONFLICT ("slug") DO UPDATE SET
           "name"        = EXCLUDED."name",
           "description" = EXCLUDED."description",
           "updated_at"  = CURRENT_TIMESTAMP`,
        [
          categories.map((c) => c.id),
          categories.map((c) => c.name),
          categories.map((c) => c.slug),
          categories.map((c) => c.description),
          categories.map(() => 'now'),
          categories.map(() => 'now'),
        ],
      ),
    'إنشاء التصنيفات',
  );
  console.log(`✅ تم تجهيز ${categories.length} تصنيفات\n`);

  // رفع الصور على Cloudinary
  console.log('☁️  رفع صور الـ public على Cloudinary...');
  const uploadedImages = await uploadSeedImages();
  console.log(`✅ تم رفع ${uploadedImages.length} صورة على Cloudinary\n`);

  // إعداد IDs للـ menu items
  const itemsWithIds = menuItems.map((item, index) => ({
    id: randomUUID(),
    ...enrichMenuItem(item, index),
  }));

  // bulk insert المنتجات
  console.log(`📦 إنشاء ${menuItems.length} منتج...`);
  const menuItemsInsert = buildBulkInsert(
    'menu_items',
    [
      'id',
      'name',
      'description',
      'price',
      'category_id',
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
      categoryIdBySlug.get(item.category) ??
        categoryIdBySlug.get('main_course')!,
      item.isAvailable,
      item.hasDiscount,
      item.discountPercentage,
      item.rating,
      'now',
      'now',
    ]),
    { 4: 'uuid', 9: 'timestamptz', 10: 'timestamptz' },
  );

  // bulk insert الصور
  const imagesInsert = buildBulkInsert(
    'menu_item_images',
    ['id', 'menu_item_id', 'url', 'public_id', 'order', 'created_at'],
    itemsWithIds.flatMap((item, itemIndex) =>
      getItemImages(itemIndex, uploadedImages, item.imagesCount ?? 3).map(
        (image) => [
          randomUUID(),
          item.id,
          image.url,
          image.publicId,
          image.order,
          'now',
        ],
      ),
    ),
    { 5: 'timestamptz' },
  );

  // إعداد الـ addons
  const allAddons: Array<[string, string, string, number, string, string]> = [];
  for (const item of itemsWithIds) {
    const addons = getAddonsForItem(item.category, item.name);
    for (const addon of addons) {
      allAddons.push([
        randomUUID(),
        item.id,
        addon.name,
        addon.price,
        'now',
        'now',
      ]);
    }
  }

  const addonsInsert = buildBulkInsert(
    'menu_item_addons',
    ['id', 'menu_item_id', 'name', 'price', 'created_at', 'updated_at'],
    allAddons,
    { 0: 'uuid', 1: 'uuid', 4: 'timestamptz', 5: 'timestamptz' },
  );

  // إعداد الـ sizes
  const allSizes: Array<
    [string, string, string, number, boolean, string, string]
  > = [];
  for (const item of itemsWithIds) {
    const sizes = getSizesForItem(item.category, item.price);
    for (const size of sizes) {
      allSizes.push([
        randomUUID(),
        item.id,
        size.label,
        size.price,
        size.isAvailable,
        'now',
        'now',
      ]);
    }
  }

  const sizesInsert = buildBulkInsert(
    'menu_item_sizes',
    [
      'id',
      'menu_item_id',
      'label',
      'price',
      'is_available',
      'created_at',
      'updated_at',
    ],
    allSizes,
    {
      0: 'uuid',
      1: 'uuid',
      2: '"SizeLabel"',
      5: 'timestamptz',
      6: 'timestamptz',
    },
  );

  // كل حاجة في transaction واحدة
  await withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(menuItemsInsert);
      await client.query(imagesInsert);
      if (allAddons.length > 0) await client.query(addonsInsert);
      if (allSizes.length > 0) await client.query(sizesInsert);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }, 'إدراج كل البيانات');

  // لوج تفصيلي
  for (const [index, item] of menuItems.entries()) {
    const enriched = enrichMenuItem(item, index);
    const addons = getAddonsForItem(item.category, item.name);
    const sizes = getSizesForItem(item.category, item.price);
    console.log(
      `✅ [${String(index + 1).padStart(2, '0')}/${menuItems.length}] ${item.name.padEnd(22)} | ${item.category.padEnd(11)} | ${item.price} ج.م | خصم ${enriched.discountPercentage ?? 0}% | تقييم ${enriched.rating} | addons: ${addons.length} | sizes: ${sizes.length}`,
    );
  }

  // ملخص
  const counts = {
    appetizer: menuItems.filter((i) => i.category === 'appetizer').length,
    main_course: menuItems.filter((i) => i.category === 'main_course').length,
    dessert: menuItems.filter((i) => i.category === 'dessert').length,
    beverage: menuItems.filter((i) => i.category === 'beverage').length,
    side_dish: menuItems.filter((i) => i.category === 'side_dish').length,
    available: menuItems.filter((i) => i.isAvailable).length,
    unavailable: menuItems.filter((i) => !i.isAvailable).length,
    discounted: menuItems.map(enrichMenuItem).filter((i) => i.hasDiscount)
      .length,
    totalAddons: allAddons.length,
    totalSizes: allSizes.length,
    total: menuItems.length,
  };

  console.log('\n─────────────────────────────────────────────');
  console.log('📊 ملخص الـ Seed:');
  console.log(`   🥗 Appetizers    : ${counts.appetizer} منتج`);
  console.log(`   🍽️  Main Courses  : ${counts.main_course} منتج`);
  console.log(`   🍰 Desserts      : ${counts.dessert} منتج`);
  console.log(`   🥤 Beverages     : ${counts.beverage} منتج`);
  console.log(`   🍟 Side Dishes   : ${counts.side_dish} منتج`);
  console.log(`   ✅ متاح          : ${counts.available} منتج`);
  console.log(`   ❌ غير متاح      : ${counts.unavailable} منتج`);
  console.log(`   🏷️  عليها خصم     : ${counts.discounted} منتج`);
  console.log(`   🧩 Addons        : ${counts.totalAddons} إضافة`);
  console.log(`   📐 Sizes         : ${counts.totalSizes} حجم`);
  console.log(`   📦 الإجمالي      : ${counts.total} منتج`);
  console.log('─────────────────────────────────────────────');
  console.log('\n🎉 تم الـ Seeding بنجاح!');
  console.log(
    `\n💡 الـ Pagination: لو limit = 10، هيكون عندك ${Math.ceil(counts.total / 10)} صفحات`,
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
