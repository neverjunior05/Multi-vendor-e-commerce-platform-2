/**
 * Idempotent demo seed. `ensureSeeded()` is safe to call on every request:
 * it only writes when the users table is empty. The demo passwords are hashed
 * with bcrypt exactly like a real signup.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, orderItems, orders, products, reviews, users, vendors } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940`;

export const DEMO_PASSWORD = "Password123!";

export const DEMO_ACCOUNTS = [
  { email: "admin@bazaario.dev", role: "admin", label: "Admin" },
  { email: "maya@bazaario.dev", role: "vendor", label: "Vendor — Kiln & Ember" },
  { email: "customer@bazaario.dev", role: "customer", label: "Customer" },
] as const;

type AttributeValue = string | number | boolean;

type SeedProduct = {
  title: string;
  price: number;
  compareAt?: number;
  stock: number;
  images: string[];
  category: string;
  description: string;
  attributes: Record<string, AttributeValue>;
};

type SeedVendor = {
  storeName: string;
  owner: { name: string; email: string };
  tagline: string;
  city: string;
  status: "pending" | "approved";
  logo: string;
  products: SeedProduct[];
};

const CATEGORY_SEED = [
  { name: "Home & Decor", slug: "home-decor", emoji: "🏺" },
  { name: "Plants", slug: "plants", emoji: "🪴" },
  { name: "Bags & Accessories", slug: "accessories", emoji: "👜" },
  { name: "Candles & Bath", slug: "candles", emoji: "🕯️" },
  { name: "Textiles", slug: "textiles", emoji: "🧶" },
  { name: "Jewelry", slug: "jewelry", emoji: "💎" },
];

const VENDOR_SEED: SeedVendor[] = [
  {
    storeName: "Kiln & Ember",
    owner: { name: "Maya Okafor", email: "maya@bazaario.dev" },
    tagline: "Wheel-thrown stoneware fired in a wood kiln",
    city: "Lisbon",
    status: "approved" as const,
    logo: img(39533489),
    products: [
      {
        title: "Ember Speckled Mug",
        price: 2400,
        compareAt: 2900,
        stock: 34,
        images: [img(34299319), img(24743540)],
        category: "home-decor",
        description:
          "A generous 350ml mug thrown on the wheel and glazed with our signature speckled ember finish. The handle is pulled by hand, so every curve is a little different.",
        attributes: { Material: "Stoneware", Capacity: "350 ml", "Dishwasher safe": true, Weight: "410 g" },
      },
      {
        title: "Morning White Cup & Saucer",
        price: 3100,
        stock: 18,
        images: [img(13546365), img(39529869)],
        category: "home-decor",
        description:
          "Porcelain-thin rim with a matte satin glaze. Designed for filter coffee, but honestly it makes tea feel ceremonial too.",
        attributes: { Material: "Porcelain", Capacity: "180 ml", Pieces: 2 },
      },
      {
        title: "Ridge Vase — Charcoal",
        price: 6800,
        stock: 7,
        images: [img(15028227)],
        category: "home-decor",
        description:
          "Carved ridges catch the light across a deep charcoal glaze. Watertight, so it works for fresh stems or as a sculptural object on its own.",
        attributes: { Material: "Stoneware", Height: "28 cm", Watertight: true },
      },
      {
        title: "Bloom Tea Set for Four",
        price: 12400,
        compareAt: 14900,
        stock: 5,
        images: [img(18273384), img(18273391)],
        category: "home-decor",
        description:
          "Hand-painted floral teapot with four cups on an oak tray. Fired twice at 1240°C for a glass-like surface that resists tea staining.",
        attributes: { Material: "Stoneware", Pieces: 6, "Hand painted": true },
      },
      {
        title: "Cobalt Latte Cup",
        price: 2200,
        stock: 41,
        images: [img(39529869)],
        category: "home-decor",
        description: "A wide, low cup with a heavy base so it stays put while you stir. Glazed cobalt inside, raw clay foot outside.",
        attributes: { Material: "Stoneware", Capacity: "220 ml" },
      },
    ],
  },
  {
    storeName: "Fernhouse Studio",
    owner: { name: "Leo Marchetti", email: "leo@bazaario.dev" },
    tagline: "Rare houseplants, potted and ready for your window",
    city: "Porto",
    status: "approved" as const,
    logo: img(4894424),
    products: [
      {
        title: "Monstera Deliciosa — 60cm",
        price: 4900,
        stock: 22,
        images: [img(4894424), img(4894423)],
        category: "plants",
        description:
          "Ships in a nursery pot with three established fenestrations. Care card and a bag of our chunky aroid mix included.",
        attributes: { "Light needs": "Bright indirect", Water: "Every 7–10 days", "Pet safe": false, Height: "60 cm" },
      },
      {
        title: "Terracotta Succulent Trio",
        price: 2600,
        stock: 60,
        images: [img(3101767), img(20324601)],
        category: "plants",
        description: "Three drought-happy succulents in unglazed terracotta — the porous clay wicks moisture away so roots never sit wet.",
        attributes: { "Light needs": "Direct sun", Water: "Every 3 weeks", "Pet safe": true, Pots: 3 },
      },
      {
        title: "Orchid in Rust Pot",
        price: 5400,
        compareAt: 6200,
        stock: 12,
        images: [img(30662236)],
        category: "plants",
        description: "A double-spike phalaenopsis in a rust-glazed ceramic pot. Blooms last up to four months indoors.",
        attributes: { "Light needs": "Medium indirect", Water: "Weekly soak", Bloom: "4 months" },
      },
      {
        title: "Monstera Leaf Print Set",
        price: 1800,
        stock: 75,
        images: [img(18207316), img(37936133)],
        category: "plants",
        description: "Botanical giclée pair printed on 240gsm cotton rag. Frames not included, because you already have opinions about frames.",
        attributes: { Size: "30 × 40 cm", Paper: "240gsm cotton rag", Pieces: 2 },
      },
    ],
  },
  {
    storeName: "Atlas Leatherworks",
    owner: { name: "Nadia Haddad", email: "nadia@bazaario.dev" },
    tagline: "Vegetable-tanned leather, saddle-stitched in the medina",
    city: "Tunis",
    status: "approved" as const,
    logo: img(4452379),
    products: [
      {
        title: "Everyday Bifold Wallet",
        price: 4200,
        stock: 48,
        images: [img(12495668), img(4452382)],
        category: "accessories",
        description:
          "Six card slots, one hidden note pocket, and edges that are burnished by hand rather than plastic-coated. Ages into a deep cognac.",
        attributes: { Leather: "Vegetable-tanned cowhide", Cards: 6, Stitching: "Saddle stitch", Weight: "68 g" },
      },
      {
        title: "Medina Market Tote",
        price: 11800,
        compareAt: 13900,
        stock: 14,
        images: [img(27680730), img(27127406)],
        category: "accessories",
        description: "Structured tote dyed with natural pigments, lined in undyed cotton, with an interior zip pocket for keys and cards.",
        attributes: { Leather: "Goat hide", Dimensions: "38 × 30 × 12 cm", "Laptop fits": "Up to 14\"" },
      },
      {
        title: "Weekender Holdall",
        price: 22400,
        stock: 6,
        images: [img(4452386), img(4452380)],
        category: "accessories",
        description: "Forty litres of carry-on legal leather. Solid brass hardware, detachable shoulder strap, and a reinforced base that survives airline carousels.",
        attributes: { Capacity: "40 L", Hardware: "Solid brass", Warranty: "Lifetime repairs" },
      },
      {
        title: "Cardholder + Key Fob Set",
        price: 3400,
        stock: 30,
        images: [img(23371092), img(4452388)],
        category: "accessories",
        description: "A slim three-pocket cardholder paired with a matching key fob. Gift-boxed in recycled kraft.",
        attributes: { Leather: "Vegetable-tanned", Pieces: 2, "Gift box": true },
      },
    ],
  },
  {
    storeName: "Ember & Wax",
    owner: { name: "Ravi Chandran", email: "ravi@bazaario.dev" },
    tagline: "Coconut-soy candles poured in small batches",
    city: "Bengaluru",
    status: "approved" as const,
    logo: img(7234498),
    products: [
      {
        title: "Amber Jar Candle — Fig & Cedar",
        price: 2800,
        stock: 55,
        images: [img(30235391), img(7233906)],
        category: "candles",
        description:
          "Coconut-soy blend with a crackling cedar wick, poured into a reusable amber jar. Fifty hours of burn time, phthalate-free fragrance.",
        attributes: { Wax: "Coconut-soy blend", "Burn time": "50 hours", Wick: "Crackling cedar", Net: "220 g" },
      },
      {
        title: "Morning Table Candle — Citrus Basil",
        price: 2400,
        stock: 62,
        images: [img(13970073), img(15791150)],
        category: "candles",
        description: "Bright bergamot and green basil — the candle version of opening a window at 7am.",
        attributes: { Wax: "Coconut-soy blend", "Burn time": "42 hours", Net: "180 g" },
      },
      {
        title: "Candle Pouring Workshop Kit",
        price: 7600,
        stock: 20,
        images: [img(7234521), img(6755750), img(7234495)],
        category: "candles",
        description: "Everything to pour six candles at home: wax blend, three fragrances, wicks, tins, a thermometer and a printed guide.",
        attributes: { Makes: 6, Fragrances: 3, Difficulty: "Beginner" },
      },
    ],
  },
  {
    storeName: "Loom Sisters",
    owner: { name: "Ilse Demir", email: "ilse@bazaario.dev" },
    tagline: "Hand-loomed wool from a three-generation workshop",
    city: "Ankara",
    status: "approved" as const,
    logo: img(38317548),
    products: [
      {
        title: "Kilim Throw — Sunset Bands",
        price: 14900,
        compareAt: 17900,
        stock: 9,
        images: [img(38317548), img(31854096)],
        category: "textiles",
        description: "Woven on a foot loom over four days using undyed local wool. The colour bands come from madder root and pomegranate skin.",
        attributes: { Fibre: "100% wool", Size: "130 × 190 cm", "Hand loomed": true, "Natural dye": true },
      },
      {
        title: "Fringe Wool Blanket",
        price: 9800,
        stock: 16,
        images: [img(31034511), img(31034508)],
        category: "textiles",
        description: "Brushed lambswool with hand-knotted fringe. Warm enough for a cold office, soft enough for a nap you didn't plan.",
        attributes: { Fibre: "Lambswool", Size: "120 × 160 cm", Care: "Dry clean" },
      },
      {
        title: "Knit Cushion Cover",
        price: 4200,
        stock: 34,
        images: [img(11255285)],
        category: "textiles",
        description: "Chunky garter-stitch cover with a coconut-shell button closure. Fits a standard 45cm insert.",
        attributes: { Fibre: "Wool blend", Size: "45 × 45 cm", Insert: "Not included" },
      },
      {
        title: "Loom Portrait Print",
        price: 1600,
        stock: 40,
        images: [img(15997613), img(7512608)],
        category: "textiles",
        description: "Documentary photograph of our master weaver at her 1962 loom, printed on matte archival paper.",
        attributes: { Size: "40 × 40 cm", Paper: "Archival matte", Edition: "Open" },
      },
    ],
  },
  {
    storeName: "Verde Atelier",
    owner: { name: "Sam Idrissi", email: "sam@bazaario.dev" },
    tagline: "Recycled-silver jewellery cast by hand",
    city: "Marrakesh",
    status: "pending" as const,
    logo: img(27911452),
    products: [
      {
        title: "Molten Silver Signet Ring",
        price: 8900,
        stock: 11,
        images: [img(27911452)],
        category: "jewelry",
        description: "Cast from recycled silver using the lost-wax method, then polished to a soft mirror. Sizes 5 through 12.",
        attributes: { Metal: "Recycled sterling silver", Sizes: "5–12", Hallmarked: true },
      },
    ],
  },
];

const REVIEW_SEED = [
  { email: "customer@bazaario.dev", name: "Customer", rating: 5, comment: "Third order from this shop and the quality is unbelievably consistent." },
  { email: "ilse@bazaario.dev", name: "Ilse", rating: 4, comment: "Beautiful piece. Shipping took a day longer than promised, but worth the wait." },
  { email: "ravi@bazaario.dev", name: "Ravi", rating: 5, comment: "Gifted this and immediately had to find out where it came from." },
];

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) seedPromise = runSeed().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if ((existing[0]?.count ?? 0) > 0) return;

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const categoryRows = await db.insert(categories).values(CATEGORY_SEED).returning();
  const categoryId = (slug: string) => categoryRows.find((c) => c.slug === slug)?.id ?? null;

  const adminRows = await db
    .insert(users)
    .values({
      name: "Bazaario Admin",
      email: "admin@bazaario.dev",
      passwordHash,
      role: "admin",
    })
    .returning();
  const adminId = adminRows[0].id;

  const customerRows = await db
    .insert(users)
    .values({ name: "Priya Customer", email: "customer@bazaario.dev", passwordHash, role: "customer" })
    .returning();
  const customerId = customerRows[0].id;

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const productIdByTitle = new Map<string, { id: number; vendorId: number; price: number; image: string }>();

  for (const entry of VENDOR_SEED) {
    const [vendorUser] = await db
      .insert(users)
      .values({ name: entry.owner.name, email: entry.owner.email, passwordHash, role: "vendor" })
      .returning();

    const [vendor] = await db
      .insert(vendors)
      .values({
        userId: vendorUser.id,
        storeName: entry.storeName,
        slug: slugify(entry.storeName),
        tagline: entry.tagline,
        description: `${entry.storeName} is an independent workshop based in ${entry.city}. Every listing below is made by hand, in batches small enough that we know each piece personally.`,
        city: entry.city,
        logoUrl: entry.logo,
        status: entry.status,
        reviewedAt: entry.status === "approved" ? new Date() : null,
      })
      .returning();

    for (const product of entry.products) {
      const [row] = await db
        .insert(products)
        .values({
          vendorId: vendor.id,
          categoryId: categoryId(product.category),
          title: product.title,
          slug: slugify(`${product.title}-${entry.storeName}`),
          description: product.description,
          priceCents: product.price,
          compareAtCents: product.compareAt ?? null,
          stock: product.stock,
          images: product.images,
          attributes: product.attributes,
          status: "active",
        })
        .returning();
      productIdByTitle.set(product.title, {
        id: row.id,
        vendorId: vendor.id,
        price: product.price,
        image: product.images[0],
      });
    }
  }

  // Reviews from real seeded users so the product page isn't empty.
  const reviewUsers = await db.select().from(users);
  const reviewerId = (email: string) => reviewUsers.find((u) => u.email === email)?.id;
  const reviewTargets = ["Ember Speckled Mug", "Monstera Deliciosa — 60cm", "Everyday Bifold Wallet", "Amber Jar Candle — Fig & Cedar", "Kilim Throw — Sunset Bands"];

  for (const title of reviewTargets) {
    const target = productIdByTitle.get(title);
    if (!target) continue;
    for (const seed of REVIEW_SEED) {
      const userId = reviewerId(seed.email);
      if (!userId) continue;
      await db
        .insert(reviews)
        .values({ productId: target.id, userId, rating: seed.rating, comment: seed.comment })
        .onConflictDoNothing();
    }
  }

  // Two historical orders so the vendor dashboard has numbers on day one.
  const orderPlans = [
    { titles: ["Ember Speckled Mug", "Amber Jar Candle — Fig & Cedar"], qty: [2, 1], status: "delivered" as const, daysAgo: 9 },
    { titles: ["Kilim Throw — Sunset Bands"], qty: [1], status: "paid" as const, daysAgo: 2 },
  ];

  let sequence = 0;
  for (const plan of orderPlans) {
    sequence += 1;
    const lines = plan.titles
      .map((title, index) => {
        const product = productIdByTitle.get(title);
        return product ? { title, product, quantity: plan.qty[index] } : null;
      })
      .filter((line): line is { title: string; product: { id: number; vendorId: number; price: number; image: string }; quantity: number } => line !== null);

    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    const shipping = subtotal > 10000 ? 0 : 690;
    const createdAt = new Date(Date.now() - plan.daysAgo * 86_400_000);

    const [order] = await db
      .insert(orders)
      .values({
        userId: customerId,
        status: plan.status,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        shipName: "Priya Customer",
        shipPhone: "+351 900 000 000",
        shipLine1: "24 Rua das Flores, Apt 3",
        shipCity: "Lisbon",
        shipPostal: "1200-195",
        shipCountry: "Portugal",
        note: sequence === 1 ? "Please leave with the neighbour if I'm out." : null,
        paymentRef: `pi_sandbox_seed${sequence}`,
        paymentBrand: "visa",
        paidAt: createdAt,
        createdAt,
      })
      .returning();

    for (const line of lines) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: line.product.id,
        vendorId: line.product.vendorId,
        title: line.title,
        image: line.product.image,
        unitPriceCents: line.product.price,
        quantity: line.quantity,
      });
    }
  }

  // Keep the admin account from being used as a vendor without a store.
  void adminId;
}
