import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { Coupon, Order } from '../models/Commerce';
import { User } from '../models/User';

const cats = [
  ['Kerala Meals', '🍽️'],
  ['Biryani', '🍛'],
  ['Seafood', '🐟'],
  ['Appam & Breads', '🥞'],
  ['South Indian', '🥥'],
  ['Snacks & Bites', '🍌'],
  ['Desserts', '🥣'],
  ['Pizza', '🍕'],
  ['Burgers', '🍔'],
  ['Chinese', '🥡'],
  ['Healthy', '🥗'],
] as const;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface FoodSeed {
  category: string;
  name: string;
  price: number; // in rupees
  isVeg: boolean;
  isBestseller: boolean;
  description: string;
  image?: string;
}

interface RestaurantSeed {
  name: string;
  cuisines: string[];
  emoji: string;
  image?: string;
  rating: number;
  ratingCount: number;
  deliveryMins: number;
  priceForTwo: number; // in rupees
  isVeg: boolean;
  description: string;
  foods: FoodSeed[];
}

const restaurants: RestaurantSeed[] = [
  {
    name: 'Malabar Spice Kitchen',
    cuisines: ['Kerala Meals', 'Biryani', 'Appam & Breads'],
    emoji: '🍛',
    image: '/images/food/banner-malabar.jpg',
    rating: 4.8,
    ratingCount: 1840,
    deliveryMins: 30,
    priceForTwo: 550,
    isVeg: false,
    description: 'Heritage Malabar kitchen crafting authentic Thalassery dum biryanis, slow-roasted beef fry, and flaky layered parottas.',
    foods: [
      {
        category: 'Biryani',
        name: 'Thalassery Chicken Biryani',
        price: 280,
        isVeg: false,
        isBestseller: true,
        description: 'Fragrant Kaima (Jeerakasala) rice dum-cooked with tender chicken, Malabar garam masala, fried onions, cashews and golden sultanas. Served with date pickle, raita and pappadam.',
        image: '/images/food/thalassery-biryani.jpg',
      },
      {
        category: 'Appam & Breads',
        name: 'Malabar Parotta & Beef Roast Combo',
        price: 270,
        isVeg: false,
        isBestseller: true,
        description: 'Two golden, multi-layered spiral flaky parottas paired with slow-roasted tender beef chunks browned with coconut slices (thenga kothu), crushed black pepper and fresh curry leaves.',
        image: '/images/food/parotta-beef.jpg',
      },
      {
        category: 'Appam & Breads',
        name: 'Lacy Appam with Nadan Chicken Stew',
        price: 240,
        isVeg: false,
        isBestseller: true,
        description: 'Three soft, pillowy hoppers with crispy lacy borders served with fragrant chicken simmered in rich first-press coconut milk, ginger, whole peppercorns and cinnamon.',
        image: '/images/food/appam-stew.jpg',
      },
      {
        category: 'Snacks & Bites',
        name: 'Malabar Kozhi Porichathu',
        price: 220,
        isVeg: false,
        isBestseller: true,
        description: 'Crisp deep-fried chicken marinated in crushed bird eye green chillies, garlic, fennel, and fiery red masala tossed with crunchy fried curry leaves.',
        image: '/images/food/kozhi-porichathu.jpg',
      },
      {
        category: 'Snacks & Bites',
        name: 'Nadan Pazham Pori & Chaya',
        price: 90,
        isVeg: true,
        isBestseller: false,
        description: 'Sweet ripe Kerala Nendran plantains dipped in golden batter and crisp-fried to perfection. Served with strong cardamom-infused meter tea.',
        image: '/images/food/pazham-pori.jpg',
      },
      {
        category: 'Desserts',
        name: 'Nadan Palada Payasam',
        price: 110,
        isVeg: true,
        isBestseller: true,
        description: 'Rich slow-cooked dessert made with delicate steamed rice ada flakes simmered for hours in sweetened pink-hued milk with ghee-roasted cashews and plump raisins.',
        image: '/images/food/palada-payasam.jpg',
      },
    ],
  },
  {
    name: 'Kayaloram Seafood Delicacies',
    cuisines: ['Seafood', 'Kerala Meals', 'Appam & Breads'],
    emoji: '🐟',
    image: '/images/food/banner-kayaloram.jpg',
    rating: 4.9,
    ratingCount: 1420,
    deliveryMins: 35,
    priceForTwo: 750,
    isVeg: false,
    description: 'Backwater culinary haven specializing in fresh catch Pearl Spot (Karimeen), tiger prawns, and Alleppey clay-pot fish curries.',
    foods: [
      {
        category: 'Seafood',
        name: 'Karimeen Pollichathu',
        price: 390,
        isVeg: false,
        isBestseller: true,
        description: 'Fresh backwater Pearl Spot fish generously coated with shallots, crushed green chillies, ginger and tomato masala, wrapped in charred banana leaf and griddle-fried to smoky perfection.',
        image: '/images/food/karimeen-pollichathu.jpg',
      },
      {
        category: 'Seafood',
        name: 'Alleppey Meen Curry (Manchatti)',
        price: 340,
        isVeg: false,
        isBestseller: true,
        description: 'Fresh Seer fish (Neymeen) steaks cooked in an earthen clay pot with tart raw green mangoes, creamy coconut milk, kudampuli (Malabar tamarind) and fragrant curry leaves.',
        image: '/images/food/alleppey-fish-curry.jpg',
      },
      {
        category: 'Seafood',
        name: 'Kerala Chemmeen (Prawn) Roast',
        price: 360,
        isVeg: false,
        isBestseller: true,
        description: 'Succulent jumbo prawns sautéed with caramelized shallots, garlic, cracked peppercorns, kokum, and crisp toasted coconut flakes.',
        image: '/images/food/kerala-chemmeen-prawns.jpg',
      },
      {
        category: 'Appam & Breads',
        name: 'Lacy Appam (Set of 3)',
        price: 70,
        isVeg: true,
        isBestseller: false,
        description: 'Delicate fermented rice hoppers with soft spongy centers and gossamer-thin crispy lace edges. The quintessential companion to fish curries.',
        image: '/images/food/appam-stew.jpg',
      },
      {
        category: 'Kerala Meals',
        name: 'Backwater Fish Curry Meals',
        price: 240,
        isVeg: false,
        isBestseller: true,
        description: 'Steaming Kerala Matta rice served with earthen clay pot fish gravy, meen peera, cabbage thoran, pulissery, lime pickle and roasted pappadam.',
        image: '/images/food/alleppey-fish-curry.jpg',
      },
    ],
  },
  {
    name: 'Tharavadu Heritage Sadya',
    cuisines: ['Kerala Meals', 'South Indian', 'Desserts'],
    emoji: '🍽️',
    image: '/images/food/banner-tharavadu.jpg',
    rating: 4.9,
    ratingCount: 2150,
    deliveryMins: 28,
    priceForTwo: 480,
    isVeg: true,
    description: '100% pure vegetarian Kerala heritage kitchen famed for grand ceremonial banana leaf Sadya feasts, steamed puttu and temple payasams.',
    foods: [
      {
        category: 'Kerala Meals',
        name: 'Grand Royal Kerala Sadya Feast',
        price: 360,
        isVeg: true,
        isBestseller: true,
        description: 'Lavish traditional 24-delicacy feast served on a fresh plantain leaf: Palakkadan Matta rice, Parippu with Ghee, Sambar, Avial, Olan, Kalan, Thoran, Erissery, Pulissery, Mango & Inji Puli pickles, Pappadam, Sharkara Varatti, Banana Chips, and two bowls of divine Payasam.',
        image: '/images/food/kerala-sadya.jpg',
      },
      {
        category: 'South Indian',
        name: 'Steamed Puttu & Kadala Curry Combo',
        price: 140,
        isVeg: true,
        isBestseller: true,
        description: 'Aromatic layered cylindrical cakes of freshly milled steamed rice flour and grated coconut, accompanied by robust black chickpea curry roasted in stone-ground coconut paste and a sweet Nendran banana.',
        image: '/images/food/steamed-puttu.jpg',
      },
      {
        category: 'Appam & Breads',
        name: 'Veg Stew with Lacy Appam (3 pcs)',
        price: 190,
        isVeg: true,
        isBestseller: false,
        description: 'Potatoes, carrots, French beans and green peas gently simmered in velvety coconut milk scented with crushed green cardamom, cloves, and curry leaves.',
        image: '/images/food/appam-stew.jpg',
      },
      {
        category: 'Desserts',
        name: 'Tharavadu Palada Pradhaman',
        price: 120,
        isVeg: true,
        isBestseller: true,
        description: 'Signature festival delicacy slow-reduced in a traditional heavy bronze uruli with milk, rice ada, pure cow ghee, and golden fried cashew nuts.',
        image: '/images/food/palada-payasam.jpg',
      },
    ],
  },
  {
    name: 'Biryani Junction',
    cuisines: ['Biryani', 'Snacks & Bites'],
    emoji: '🍚',
    image: '/images/food/thalassery-biryani.jpg',
    rating: 4.5,
    ratingCount: 2310,
    deliveryMins: 40,
    priceForTwo: 600,
    isVeg: false,
    description: 'Dum biryani specialists slow-cooking basmati and kaima variations with royal spices and saffron milk.',
    foods: [
      {
        category: 'Biryani',
        name: 'Hyderabadi Chicken Dum Biryani',
        price: 290,
        isVeg: false,
        isBestseller: true,
        description: 'Aged basmati rice sealed with marinated spiced chicken, fresh mint, caramelized onions and saffron milk. Served with mirchi ka salan and burani raita.',
        image: '/images/food/thalassery-biryani.jpg',
      },
      {
        category: 'Biryani',
        name: 'Thalassery Mutton Biryani',
        price: 360,
        isVeg: false,
        isBestseller: true,
        description: 'Melt-in-mouth tender mutton layered with short-grain kaima rice, Malabar spices and golden fried shallots.',
        image: '/images/food/thalassery-biryani.jpg',
      },
      {
        category: 'Biryani',
        name: 'Paneer Tikka Biryani',
        price: 240,
        isVeg: true,
        isBestseller: false,
        description: 'Tandoor-charred spiced paneer cubes layered with aromatic saffron rice and fresh coriander.',
        image: '/images/food/thalassery-biryani.jpg',
      },
    ],
  },
  {
    name: 'Dosa Corner',
    cuisines: ['South Indian', 'Snacks & Bites'],
    emoji: '🥞',
    image: '/images/food/banner-dosa.jpg',
    rating: 4.6,
    ratingCount: 1260,
    deliveryMins: 25,
    priceForTwo: 300,
    isVeg: true,
    description: 'Crisp golden dosas, fluffy steamed idlis and stone-ground chutneys ground fresh daily.',
    foods: [
      {
        category: 'South Indian',
        name: 'Ghee Roast Masala Dosa',
        price: 130,
        isVeg: true,
        isBestseller: true,
        description: 'Crisp golden crepe roasted in pure ghee, stuffed with spiced mustard potato mash and served with three chutneys and hot drumstick sambar.',
        image: '/images/food/masala-dosa.jpg',
      },
      {
        category: 'South Indian',
        name: 'Steamed Idli & Medu Vada Combo',
        price: 95,
        isVeg: true,
        isBestseller: true,
        description: 'Two feather-light steamed rice cakes and one crispy lentil doughnut served with coconut and tomato chutneys.',
        image: '/images/food/idli-vada.jpg',
      },
      {
        category: 'Desserts',
        name: 'Pineapple Rava Kesari',
        price: 80,
        isVeg: true,
        isBestseller: false,
        description: 'Warm semolina pudding enriched with pure ghee, saffron, juicy pineapple chunks, and roasted cashews.',
        image: '/images/food/palada-payasam.jpg',
      },
    ],
  },
  {
    name: 'Pizza Lane',
    cuisines: ['Pizza'],
    emoji: '🍕',
    image: '/images/food/banner-pizza.jpg',
    rating: 4.2,
    ratingCount: 980,
    deliveryMins: 30,
    priceForTwo: 700,
    isVeg: false,
    description: 'Hand-stretched sourdough pizzas baked with fresh mozzarella and herb sauces.',
    foods: [
      {
        category: 'Pizza',
        name: 'Margherita Classica',
        price: 249,
        isVeg: true,
        isBestseller: true,
        description: 'San Marzano tomato sauce, fresh buffalo mozzarella, virgin olive oil and fragrant sweet basil leaves.',
        image: '/images/food/margherita-pizza.jpg',
      },
      {
        category: 'Pizza',
        name: 'Fiery Chicken Tikka Pizza',
        price: 349,
        isVeg: false,
        isBestseller: true,
        description: 'Tandoori-spiced chicken chunks, red onions, bell peppers and melted mozzarella on crisp crust.',
        image: '/images/food/chicken-pizza.jpg',
      },
    ],
  },
  {
    name: 'Burger Barn',
    cuisines: ['Burgers'],
    emoji: '🍔',
    image: '/images/food/banner-burger.jpg',
    rating: 4.1,
    ratingCount: 1520,
    deliveryMins: 28,
    priceForTwo: 450,
    isVeg: false,
    description: 'Gourmet smashed patties, toasted brioche buns, and house secret sauces.',
    foods: [
      {
        category: 'Burgers',
        name: 'Crispy Malabar Spice Chicken Burger',
        price: 189,
        isVeg: false,
        isBestseller: true,
        description: 'Buttermilk fried chicken breast tossed in Kerala pepper-fennel glaze with pickled onions and curry leaf aioli.',
        image: '/images/food/classic-burger.jpg',
      },
      {
        category: 'Burgers',
        name: 'Classic Double Cheeseburger',
        price: 229,
        isVeg: false,
        isBestseller: false,
        description: 'Two smashed patties, aged cheddar cheese slices, gherkins and smoky barbecue sauce in a toasted brioche bun.',
        image: '/images/food/cheese-burger.jpg',
      },
    ],
  },
  {
    name: 'Sweet Tooth Confectionery',
    cuisines: ['Desserts'],
    emoji: '🍰',
    image: '/images/food/banner-dessert.jpg',
    rating: 4.7,
    ratingCount: 760,
    deliveryMins: 20,
    priceForTwo: 350,
    isVeg: true,
    description: 'Artisanal desserts, traditional festival payasams, pastries and chilled beverages.',
    foods: [
      {
        category: 'Desserts',
        name: 'Rose & Pistachio Falooda',
        price: 150,
        isVeg: true,
        isBestseller: true,
        description: 'Layered chilled dessert with fragrant rose milk, silky vermicelli, sabja seeds, chopped pistachios, and kulfi ice cream scoop.',
        image: '/images/food/falooda-dessert.jpg',
      },
      {
        category: 'Desserts',
        name: 'Warm Gulab Jamun with Rabri (3 pcs)',
        price: 120,
        isVeg: true,
        isBestseller: false,
        description: 'Golden fried mawa dumplings steeped in saffron-cardamom syrup topped with thickened malai rabri.',
        image: '/images/food/gulab-jamun.jpg',
      },
    ],
  },
];

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  await Promise.all([
    FoodCategory.deleteMany({}),
    Restaurant.deleteMany({}),
    Food.deleteMany({}),
    Coupon.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUser = await User.create({
    name: 'Platform Administrator',
    email: 'admin@foodrush.com',
    phone: '9876543210',
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  const chefUser = await User.create({
    name: 'Chef Mario (Malabar)',
    email: 'chef@malabar.com',
    phone: '9876543211',
    passwordHash,
    role: 'restaurant',
    isActive: true,
  });

  const riderUser = await User.create({
    name: 'Rahul Rider',
    email: 'rider@foodrush.com',
    phone: '9876543212',
    passwordHash,
    role: 'delivery',
    isActive: true,
    deliveryProfile: {
      vehicleType: 'bike',
      vehicleNumber: 'KL-07-CB-4321',
      isAvailable: true,
      status: 'approved',
      totalEarnings: 385000,
    },
  });

  const customerUser = await User.create({
    name: 'Demo Customer',
    email: 'customer@foodrush.com',
    phone: '9876543213',
    passwordHash,
    role: 'customer',
    isActive: true,
    savedAddresses: [
      {
        label: 'home',
        name: 'Demo Customer',
        phone: '9876543213',
        line1: 'Flat 4B, Palm Grove Residency, Marine Drive',
        city: 'Kochi',
        pincode: '682031',
        isDefault: true,
      },
    ],
  });

  await Coupon.insertMany([
    { code: 'WELCOME20', type: 'percent', value: 20, minOrder: 19900, maxDiscount: 10000 },
    { code: 'FLAT50', type: 'flat', value: 5000, minOrder: 29900 },
    { code: 'KERALA100', type: 'flat', value: 10000, minOrder: 49900 },
  ]);

  const catDocs = await FoodCategory.insertMany(cats.map(([name, emoji]) => ({ name, emoji, slug: slug(name) })));
  const catId = new Map<string, unknown>(catDocs.map((c) => [c.name, c._id]));

  let malabarRestaurant: any = null;

  for (const r of restaurants) {
    const isMalabar = r.name === 'Malabar Spice Kitchen';
    const restaurantDoc = await Restaurant.create({
      name: r.name,
      slug: slug(r.name),
      owner: isMalabar ? chefUser._id : undefined,
      cuisines: r.cuisines,
      emoji: r.emoji,
      image: r.image,
      rating: r.rating,
      ratingCount: r.ratingCount,
      deliveryMins: r.deliveryMins,
      isVeg: r.isVeg,
      priceForTwo: r.priceForTwo * 100, // stored in paise
      status: 'approved',
      description: r.description,
    });

    if (isMalabar) malabarRestaurant = restaurantDoc;

    await Food.insertMany(
      r.foods.map((f) => ({
        restaurant: restaurantDoc._id,
        category: catId.get(f.category) || catDocs[0]._id,
        name: f.name,
        price: f.price * 100, // stored in paise
        isVeg: f.isVeg,
        isBestseller: f.isBestseller,
        description: f.description,
        image: f.image,
        isAvailable: true,
      })),
    );
  }

  // Seed sample initial orders so Admin Panel has live data (revenue, orders list, refund queue)
  if (malabarRestaurant) {
    await Order.create([
      {
        orderNumber: 'ORD-1001-KERALA',
        user: customerUser._id,
        restaurant: malabarRestaurant._id,
        partner: riderUser._id,
        items: [
          { name: 'Thalassery Chicken Biryani', price: 28000, qty: 2, isVeg: false },
          { name: 'Nadan Palada Payasam', price: 11000, qty: 1, isVeg: true },
        ],
        address: customerUser.savedAddresses[0],
        pricing: { subtotal: 67000, discount: 10000, deliveryFee: 4000, tax: 3350, total: 64350 },
        couponCode: 'WELCOME20',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        status: 'delivered',
        history: [
          { status: 'pending', by: 'customer', at: new Date(Date.now() - 3600000) },
          { status: 'confirmed', by: 'restaurant', at: new Date(Date.now() - 3000000) },
          { status: 'preparing', by: 'restaurant', at: new Date(Date.now() - 2500000) },
          { status: 'ready', by: 'restaurant', at: new Date(Date.now() - 1800000) },
          { status: 'out_for_delivery', by: 'delivery', at: new Date(Date.now() - 1200000) },
          { status: 'delivered', by: 'delivery', at: new Date(Date.now() - 300000) },
        ],
      },
      {
        orderNumber: 'ORD-1002-REFUND',
        user: customerUser._id,
        restaurant: malabarRestaurant._id,
        items: [{ name: 'Malabar Parotta & Beef Roast Combo', price: 27000, qty: 1, isVeg: false }],
        address: customerUser.savedAddresses[0],
        pricing: { subtotal: 27000, discount: 0, deliveryFee: 4000, tax: 1350, total: 32350 },
        paymentMethod: 'online',
        paymentStatus: 'refund_pending',
        status: 'cancelled',
        history: [
          { status: 'pending', by: 'customer', at: new Date(Date.now() - 1800000) },
          { status: 'cancelled', by: 'customer', at: new Date(Date.now() - 900000) },
        ],
      },
    ]);
  }

  console.log(`Seeded demo accounts (admin, chef, rider, customer), ${cats.length} categories, ${restaurants.length} restaurants, and live orders.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
