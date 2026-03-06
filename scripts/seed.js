import 'dotenv/config';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

import connectDatabase from '../database.config.js';
import config from '../config/app.config.js';
import logger from '../utils/logger.util.js';

import AppSetting from '../models/app-setting.model.js';
import Address from '../models/address.model.js';
import Bank from '../models/bank.model.js';
import Brand from '../models/brand.model.js';
import Cart from '../models/cart.model.js';
import Category from '../models/category.model.js';
import Conversation from '../models/conversation.model.js';
import Counter from '../models/counter.model.js';
import Dispute from '../models/dispute.model.js';
import Message from '../models/message.model.js';
import Notification from '../models/notification.model.js';
import Option from '../models/option.model.js';
import Order from '../models/order.model.js';
import PayoutTransaction from '../models/payout-transaction.model.js';
import Product from '../models/product.model.js';
import ReturnRequest from '../models/return-request.model.js';
import Review from '../models/review.model.js';
import Seller from '../models/seller.model.js';
import SupportTicket from '../models/support-ticket.model.js';
import User from '../models/user.model.js';
import Variant from '../models/variant.model.js';
import WishlistItem from '../models/wishlist-item.model.js';

const args = new Set(process.argv.slice(2));
const shouldReset = args.has('--reset') || args.has('-r');

faker.seed(42);

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function pickMany(arr, count) {
  const copy = [...arr];
  faker.helpers.shuffle(copy);
  return copy.slice(0, Math.max(0, Math.min(count, copy.length)));
}

function uniqSku(prefix) {
  const rand = faker.string.alphanumeric({ length: 8, casing: 'upper' });
  return `${prefix}-${rand}`.slice(0, 32).toUpperCase();
}

function imageUrl(seed, w = 900, h = 900) {
  // stable image URLs, no API keys needed
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

async function resetDatabase() {
  const deletions = [
    Message,
    Conversation,
    Review,
    Order,
    Cart,
    WishlistItem,
    Notification,
    Dispute,
    ReturnRequest,
    SupportTicket,
    PayoutTransaction,
    Variant,
    Product,
    Category,
    Brand,
    Option,
    Seller,
    Bank,
    Address,
    User,
    AppSetting,
    Counter,
  ];

  for (const Model of deletions) {
    await Model.deleteMany({});
  }
}

async function seed() {
  // ── Users ────────────────────────────────────────────────────────────────
  const admin = await User.create({
    firstName: 'Talha',
    lastName: 'Admin',
    email: 'admin@demo.local',
    password: 'Admin@12345',
    role: 'admin',
    phone: '03001234567',
    bio: 'Admin account for demo purposes. Use this to access admin modules.',
  });

  const customerCount = 18;
  const customers = [];
  for (let i = 0; i < customerCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    customers.push(
      await User.create({
        firstName,
        lastName,
        email: `customer${i + 1}@demo.local`,
        password: 'User@12345',
        role: 'user',
        phone: `03${faker.number.int({ min: 0, max: 9 })}${faker.number.int({ min: 10000000, max: 99999999 })}`,
        bio: faker.lorem.sentence({ min: 8, max: 14 }),
        avatar: { url: imageUrl(`user-${i + 1}`), publicId: null },
        isActive: true,
      })
    );
  }

  // Seller users
  const sellerUserCount = 6;
  const sellerUsers = [];
  for (let i = 0; i < sellerUserCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    sellerUsers.push(
      await User.create({
        firstName,
        lastName,
        email: `seller${i + 1}@demo.local`,
        password: 'Seller@12345',
        role: 'seller',
        phone: `03${faker.number.int({ min: 0, max: 9 })}${faker.number.int({ min: 10000000, max: 99999999 })}`,
        bio: faker.lorem.sentence({ min: 10, max: 18 }),
        avatar: { url: imageUrl(`seller-user-${i + 1}`), publicId: null },
        isActive: true,
        isSeller: true,
      })
    );
  }

  // ── Sellers + Banks ──────────────────────────────────────────────────────
  const businessTypes = ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Online Retail'];
  const sellerStores = [
    'UrbanCart',
    'TechHaven',
    'StyleStreet',
    'HomeNest',
    'FitFactory',
    'GadgetGrove',
  ];
  const sellers = [];
  for (let i = 0; i < sellerUsers.length; i++) {
    const user = sellerUsers[i];
    const storeName = sellerStores[i] || `${faker.company.name()} Store`;
    const seller = await Seller.create({
      userId: user._id,
      storeName,
      licenseId: faker.number.int({ min: 100000, max: 999999 }),
      businessType: faker.helpers.arrayElement(businessTypes),
      storeDescription: faker.company.catchPhrase(),
      logo: { url: imageUrl(`seller-logo-${i + 1}`, 512, 512), publicId: null },
      status: 'approved',
    });
    sellers.push(seller);

    await Bank.create({
      userId: user._id,
      accountHolder: `${user.firstName} ${user.lastName}`,
      bankName: faker.helpers.arrayElement(['HBL', 'UBL', 'Meezan Bank', 'Allied Bank', 'Standard Chartered']),
      iban: faker.number.int({ min: 1000000000000, max: 9999999999999 }),
      cvc: faker.number.int({ min: 100, max: 999 }),
      bankAccType: faker.helpers.arrayElement(['current', 'saving']),
      isVerified: true,
    });
  }

  // ── Addresses ────────────────────────────────────────────────────────────
  const cities = [
    { city: 'Lahore', state: 'Punjab' },
    { city: 'Karachi', state: 'Sindh' },
    { city: 'Islamabad', state: 'ICT' },
    { city: 'Rawalpindi', state: 'Punjab' },
    { city: 'Faisalabad', state: 'Punjab' },
    { city: 'Peshawar', state: 'KPK' },
  ];
  const allUsers = [admin, ...customers, ...sellerUsers];
  for (const user of allUsers) {
    const base = faker.helpers.arrayElement(cities);
    const common = {
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName || '',
      phone: user.phone || '03001234567',
      country: 'Pakistan',
      city: base.city,
      state: base.state,
      street: `${faker.location.streetAddress()} ${faker.location.street()}`,
      postalCode: faker.location.zipCode('#####'),
    };

    await Address.create({ ...common, type: 'home' });
    if (user.role !== 'admin') {
      await Address.create({
        ...common,
        type: 'shipping',
        street: `${faker.location.streetAddress()} ${faker.location.street()}`,
      });
    }
  }

  // ── Options (variants) ────────────────────────────────────────────────────
  const optionDocs = await Option.insertMany([
    {
      name: 'Color',
      position: 1,
      status: 'enabled',
      values: [
        { label: 'Black', enabled: true },
        { label: 'White', enabled: true },
        { label: 'Blue', enabled: true },
        { label: 'Red', enabled: true },
        { label: 'Green', enabled: true },
      ],
    },
    {
      name: 'Size',
      position: 2,
      status: 'enabled',
      values: [
        { label: 'XS', enabled: true },
        { label: 'S', enabled: true },
        { label: 'M', enabled: true },
        { label: 'L', enabled: true },
        { label: 'XL', enabled: true },
      ],
    },
    {
      name: 'Storage',
      position: 3,
      status: 'enabled',
      values: [
        { label: '64GB', enabled: true },
        { label: '128GB', enabled: true },
        { label: '256GB', enabled: true },
        { label: '512GB', enabled: true },
      ],
    },
    {
      name: 'Material',
      position: 4,
      status: 'enabled',
      values: [
        { label: 'Cotton', enabled: true },
        { label: 'Leather', enabled: true },
        { label: 'Polyester', enabled: true },
        { label: 'Stainless Steel', enabled: true },
        { label: 'Aluminum', enabled: true },
      ],
    },
  ]);

  const optionByName = Object.fromEntries(optionDocs.map((o) => [o.name, o]));

  // ── Brands ───────────────────────────────────────────────────────────────
  const brandNames = [
    'Apple',
    'Samsung',
    'Sony',
    'Nike',
    'Adidas',
    'Puma',
    'Dell',
    'HP',
    'Lenovo',
    'Logitech',
    'Canon',
    'Nespresso',
    'IKEA',
    'Philips',
  ];
  const brands = await Brand.insertMany(
    brandNames.map((name) => ({
      name,
      status: 'enabled',
      logo: { url: imageUrl(`brand-${slugify(name)}`, 512, 512), publicId: null },
    }))
  );

  // ── Categories ───────────────────────────────────────────────────────────
  const rootCats = await Category.insertMany([
    {
      name: 'Electronics',
      slug: 'electronics',
      parentId: null,
      status: 'enabled',
      logo: { url: imageUrl('cat-electronics', 600, 400), publicId: null },
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      parentId: null,
      status: 'enabled',
      logo: { url: imageUrl('cat-fashion', 600, 400), publicId: null },
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      parentId: null,
      status: 'enabled',
      logo: { url: imageUrl('cat-home-kitchen', 600, 400), publicId: null },
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      parentId: null,
      status: 'enabled',
      logo: { url: imageUrl('cat-sports-outdoors', 600, 400), publicId: null },
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      parentId: null,
      status: 'enabled',
      logo: { url: imageUrl('cat-beauty', 600, 400), publicId: null },
    },
  ]);
  const rootBySlug = Object.fromEntries(rootCats.map((c) => [c.slug, c]));

  const childCats = await Category.insertMany([
    {
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: rootBySlug.electronics._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-smartphones', 600, 400), publicId: null },
    },
    {
      name: 'Laptops',
      slug: 'laptops',
      parentId: rootBySlug.electronics._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-laptops', 600, 400), publicId: null },
    },
    {
      name: 'Headphones',
      slug: 'headphones',
      parentId: rootBySlug.electronics._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-headphones', 600, 400), publicId: null },
    },
    {
      name: 'Wearables',
      slug: 'wearables',
      parentId: rootBySlug.electronics._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-wearables', 600, 400), publicId: null },
    },

    {
      name: "Men's Clothing",
      slug: 'mens-clothing',
      parentId: rootBySlug.fashion._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-mens-clothing', 600, 400), publicId: null },
    },
    {
      name: "Women's Clothing",
      slug: 'womens-clothing',
      parentId: rootBySlug.fashion._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-womens-clothing', 600, 400), publicId: null },
    },
    {
      name: 'Shoes',
      slug: 'shoes',
      parentId: rootBySlug.fashion._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-shoes', 600, 400), publicId: null },
    },

    {
      name: 'Furniture',
      slug: 'furniture',
      parentId: rootBySlug['home-kitchen']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-furniture', 600, 400), publicId: null },
    },
    {
      name: 'Kitchen Appliances',
      slug: 'kitchen-appliances',
      parentId: rootBySlug['home-kitchen']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-kitchen-appliances', 600, 400), publicId: null },
    },
    {
      name: 'Bedding',
      slug: 'bedding',
      parentId: rootBySlug['home-kitchen']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-bedding', 600, 400), publicId: null },
    },

    {
      name: 'Fitness',
      slug: 'fitness',
      parentId: rootBySlug['sports-outdoors']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-fitness', 600, 400), publicId: null },
    },
    {
      name: 'Outdoor Gear',
      slug: 'outdoor-gear',
      parentId: rootBySlug['sports-outdoors']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-outdoor-gear', 600, 400), publicId: null },
    },

    {
      name: 'Skincare',
      slug: 'skincare',
      parentId: rootBySlug['beauty-personal-care']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-skincare', 600, 400), publicId: null },
    },
    {
      name: 'Haircare',
      slug: 'haircare',
      parentId: rootBySlug['beauty-personal-care']._id,
      status: 'enabled',
      logo: { url: imageUrl('cat-haircare', 600, 400), publicId: null },
    },
  ]);

  const leafCategories = [...childCats];

  // ── Products + Variants ──────────────────────────────────────────────────
  const productTemplates = [
    { categorySlug: 'smartphones', baseName: 'Smartphone', tags: ['mobile', 'camera', '5g'] },
    { categorySlug: 'laptops', baseName: 'Laptop', tags: ['work', 'portable', 'ssd'] },
    { categorySlug: 'headphones', baseName: 'Wireless Headphones', tags: ['audio', 'bluetooth', 'noise-cancelling'] },
    { categorySlug: 'wearables', baseName: 'Smart Watch', tags: ['fitness', 'health', 'gps'] },
    { categorySlug: 'mens-clothing', baseName: 'T-Shirt', tags: ['cotton', 'casual'] },
    { categorySlug: 'womens-clothing', baseName: 'Dress', tags: ['fashion', 'summer'] },
    { categorySlug: 'shoes', baseName: 'Sneakers', tags: ['running', 'comfort'] },
    { categorySlug: 'furniture', baseName: 'Office Chair', tags: ['ergonomic', 'home'] },
    { categorySlug: 'kitchen-appliances', baseName: 'Coffee Machine', tags: ['kitchen', 'espresso'] },
    { categorySlug: 'fitness', baseName: 'Yoga Mat', tags: ['fitness', 'training'] },
    { categorySlug: 'skincare', baseName: 'Face Serum', tags: ['skincare', 'glow'] },
  ];

  const categoryBySlug = Object.fromEntries(leafCategories.map((c) => [c.slug, c]));

  const products = [];
  const variants = [];

  const productCount = 75;
  for (let i = 0; i < productCount; i++) {
    const tpl = faker.helpers.arrayElement(productTemplates);
    const category = categoryBySlug[tpl.categorySlug] || faker.helpers.arrayElement(leafCategories);
    const brand = faker.helpers.arrayElement(brands);
    const seller = faker.helpers.arrayElement(sellers);

    const modelName = faker.commerce.productName();
    const name = `${brand.name} ${tpl.baseName} ${modelName}`.slice(0, 120);
    const sku = uniqSku('PRD');
    const basePrice = faker.number.int({ min: 15, max: 1200 });
    const discount = faker.datatype.boolean({ probability: 0.25 }) ? faker.number.int({ min: 5, max: 35 }) : 0;
    const quantity = faker.number.int({ min: 0, max: 250 });

    const hasVariants = faker.datatype.boolean({ probability: 0.55 });

    const product = await Product.create({
      name,
      shortDescription: faker.commerce.productDescription().slice(0, 160),
      longDescription: faker.lorem.paragraphs({ min: 2, max: 4 }),
      sku,
      mainImage: { url: imageUrl(`product-${i + 1}`), publicId: null },
      additionalImages: [
        { url: imageUrl(`product-${i + 1}-a`), publicId: null },
        { url: imageUrl(`product-${i + 1}-b`), publicId: null },
      ],
      price: hasVariants ? 0 : basePrice,
      quantity: hasVariants ? 0 : quantity,
      discount,
      brandId: brand._id,
      sellerId: seller._id,
      categoryId: category._id,
      tags: faker.helpers.uniqueArray([...tpl.tags, ...faker.commerce.productAdjective().toLowerCase().split(' ')], 3),
      status: 'enabled',
      hasVariants,
      flashSale: faker.datatype.boolean({ probability: 0.15 })
        ? {
            isActive: true,
            salePrice: Math.max(1, Math.round(basePrice * 0.8)),
            startAt: faker.date.recent({ days: 5 }),
            endAt: faker.date.soon({ days: 5 }),
          }
        : { isActive: false, salePrice: null, startAt: null, endAt: null },
    });

    products.push(product);

    if (!hasVariants) continue;

    // pick option groups based on category
    const optionGroups = (() => {
      if (['smartphones', 'wearables'].includes(tpl.categorySlug)) return ['Color', 'Storage'];
      if (['laptops'].includes(tpl.categorySlug)) return ['Color', 'Storage', 'Material'];
      if (['headphones'].includes(tpl.categorySlug)) return ['Color'];
      if (['mens-clothing', 'womens-clothing', 'shoes'].includes(tpl.categorySlug)) return ['Color', 'Size'];
      if (['furniture'].includes(tpl.categorySlug)) return ['Color', 'Material'];
      return faker.datatype.boolean({ probability: 0.5 }) ? ['Color'] : ['Color', 'Size'];
    })();

    const productOptions = optionGroups.map((name) => {
      const opt = optionByName[name];
      const enabledValues = opt.values.filter((v) => v.enabled);
      const usedValues = pickMany(enabledValues, faker.number.int({ min: 3, max: Math.min(5, enabledValues.length) }));
      return { optionId: opt._id, values: usedValues.map((v) => v._id) };
    });

    product.options = productOptions;
    await product.save();

    // generate variants as full cartesian product (every shown combo is valid)
    const valuePools = productOptions.map((po) => {
      const opt = optionDocs.find((o) => o._id.toString() === po.optionId.toString());
      const map = new Map(opt.values.map((v) => [v._id.toString(), v]));
      return po.values.map((id) => map.get(id.toString())).filter(Boolean);
    });

    const combos = [];
    function buildCombo(idx, acc) {
      if (idx >= valuePools.length) {
        combos.push(acc);
        return;
      }
      for (const val of valuePools[idx]) {
        buildCombo(idx + 1, [...acc, val]);
      }
    }
    buildCombo(0, []);

    for (const values of combos) {
      const skuV = uniqSku('VAR');
      const vPrice = Math.max(5, Math.round(basePrice * faker.number.float({ min: 0.85, max: 1.2, fractionDigits: 2 })));
      const vQty = faker.number.int({ min: 0, max: 120 });
      const vOpts = values.map((v, idx) => ({
        optionId: productOptions[idx].optionId,
        valueId: v._id,
      }));

      variants.push(
        await Variant.create({
          productId: product._id,
          sku: skuV,
          price: vPrice,
          quantity: vQty,
          options: vOpts,
          isActive: true,
        })
      );
    }
  }

  // ── Cart + Wishlist ──────────────────────────────────────────────────────
  const userSample = pickMany(customers, 10);
  for (const user of userSample) {
    const itemCount = faker.number.int({ min: 2, max: 6 });
    const chosenProducts = pickMany(products, itemCount);

    const items = [];
    for (const p of chosenProducts) {
      const pVariants = variants.filter((v) => v.productId.toString() === p._id.toString());
      const hasV = p.hasVariants && pVariants.length > 0;
      const variant = hasV ? faker.helpers.arrayElement(pVariants) : null;
      const price = hasV ? variant.price : p.price;
      items.push({
        productId: p._id,
        variantId: variant?._id || null,
        sellerId: p.sellerId || null,
        quantity: faker.number.int({ min: 1, max: 3 }),
        price,
      });
    }

    await Cart.create({ userId: user._id, items });

    const wished = pickMany(products, faker.number.int({ min: 3, max: 10 }));
    for (const p of wished) {
      await WishlistItem.create({ userId: user._id, productId: p._id, saveForLater: faker.datatype.boolean({ probability: 0.25 }) });
    }
  }

  // ── Orders (with sub-orders per seller) ──────────────────────────────────
  const orders = [];
  const orderCount = 28;
  const statusPool = ['created', 'confirmed', 'closed'];
  const fulfillmentPool = ['unfulfilled', 'packed', 'shipped', 'delivered'];

  for (let i = 0; i < orderCount; i++) {
    const user = faker.datatype.boolean({ probability: 0.9 }) ? faker.helpers.arrayElement(customers) : null;
    const guestEmail = user ? null : faker.internet.email({ provider: 'demo.local' });
    const shipCity = faker.helpers.arrayElement(cities);
    const shippingAddress = {
      firstName: user?.firstName || faker.person.firstName(),
      lastName: user?.lastName || faker.person.lastName(),
      phone: user?.phone || '03001234567',
      street: `${faker.location.streetAddress()} ${faker.location.street()}`,
      city: shipCity.city,
      state: shipCity.state,
      postalCode: faker.location.zipCode('#####'),
      country: 'Pakistan',
    };

    const orderProducts = pickMany(products, faker.number.int({ min: 2, max: 6 }));

    // group items by seller
    const grouped = new Map(); // sellerIdStr -> { sellerId, items: [] }
    for (const p of orderProducts) {
      const pVariants = variants.filter((v) => v.productId.toString() === p._id.toString());
      const hasV = p.hasVariants && pVariants.length > 0;
      const v = hasV ? faker.helpers.arrayElement(pVariants) : null;
      const price = hasV ? v.price : p.price;
      const qty = faker.number.int({ min: 1, max: 3 });
      const sid = (p.sellerId || null)?.toString() || 'platform';

      if (!grouped.has(sid)) grouped.set(sid, { sellerId: p.sellerId || null, items: [] });
      grouped.get(sid).items.push({
        productId: p._id,
        variantId: v?._id || null,
        sellerId: p.sellerId || null,
        quantity: qty,
        price,
      });
    }

    const subOrder = [];
    let subtotal = 0;
    for (const group of grouped.values()) {
      const subSubtotal = group.items.reduce((s, it) => s + it.price * it.quantity, 0);
      const tax = Math.round(subSubtotal * 0.02);
      const total = subSubtotal + tax;
      subtotal += subSubtotal;
      subOrder.push({
        sellerId: group.sellerId,
        subtotal: subSubtotal,
        tax,
        total,
        trackingNumber: faker.datatype.boolean({ probability: 0.55 }) ? `TRK-${faker.string.alphanumeric({ length: 10, casing: 'upper' })}` : null,
        carrier: faker.helpers.arrayElement([null, 'TCS', 'Leopards', 'DHL', 'BlueEx']),
        shippedAt: null,
        deliveredAt: null,
        sellerNote: faker.datatype.boolean({ probability: 0.25 }) ? faker.lorem.sentence() : null,
        fulfillmentStatus: faker.helpers.arrayElement(fulfillmentPool),
        items: group.items,
      });
    }

    const shippingMethod = faker.helpers.arrayElement(['standard', 'express']);
    const shippingCost = shippingMethod === 'express' ? 450 : 200;
    const tax = Math.round(subtotal * 0.02);
    const discount = faker.datatype.boolean({ probability: 0.25 }) ? faker.number.int({ min: 0, max: 500 }) : 0;
    const total = subtotal + tax + shippingCost - discount;
    const paymentMethod = faker.helpers.arrayElement(['cod', 'stripe', 'paypal']);
    const status = faker.helpers.arrayElement(statusPool);
    const paymentStatus =
      paymentMethod === 'cod'
        ? faker.helpers.arrayElement(['pending', 'paid'])
        : status === 'confirmed' || status === 'closed'
          ? 'paid'
          : faker.helpers.arrayElement(['pending', 'paid']);

    const order = await Order.create({
      userId: user?._id || null,
      guestEmail,
      subOrder,
      shippingAddress,
      shippingMethod,
      shippingCost,
      paymentMethod,
      paymentStatus,
      gatewayTransactionId: paymentMethod !== 'cod' ? `GTW-${faker.string.alphanumeric({ length: 14, casing: 'upper' })}` : null,
      subtotal,
      tax,
      discount,
      total,
      couponCode: discount > 0 ? faker.helpers.arrayElement([null, 'WELCOME10', 'SPRING5', 'FREESHIP']) : null,
      status,
      notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
    });
    orders.push(order);
  }

  // ── Reviews (verified purchases) ─────────────────────────────────────────
  // ensure uniqueness {productId,userId}
  const approvedOrders = orders.filter((o) => o.userId);
  for (const order of pickMany(approvedOrders, 16)) {
    const userId = order.userId;
    const itemRefs = order.subOrder.flatMap((s) => s.items);
    const pickedItems = pickMany(itemRefs, faker.number.int({ min: 1, max: Math.min(3, itemRefs.length) }));
    for (const it of pickedItems) {
      try {
        await Review.create({
          productId: it.productId,
          userId,
          orderId: order._id,
          rating: faker.number.int({ min: 3, max: 5 }),
          title: faker.lorem.words({ min: 2, max: 5 }),
          body: faker.lorem.sentences({ min: 1, max: 3 }),
          isVerifiedPurchase: true,
          status: 'approved',
        });
      } catch {
        // ignore duplicate unique constraint
      }
    }
  }

  // ── Support tickets, returns, disputes ───────────────────────────────────
  for (const user of pickMany(customers, 8)) {
    const userOrders = orders.filter((o) => o.userId?.toString() === user._id.toString());
    const relatedOrder = userOrders.length > 0 ? faker.helpers.arrayElement(userOrders) : null;
    await SupportTicket.create({
      userId: user._id,
      subject: faker.helpers.arrayElement(['Order delayed', 'Refund request', 'Account help', 'Wrong item received', 'Product question']),
      category: faker.helpers.arrayElement(['order', 'refund', 'product', 'account', 'other']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
      status: faker.helpers.arrayElement(['open', 'in_progress', 'resolved']),
      orderRef: relatedOrder?.orderNumber || null,
      message: faker.lorem.paragraph(),
      adminReply: faker.datatype.boolean({ probability: 0.4 }) ? faker.lorem.sentence() : null,
      escalated: faker.datatype.boolean({ probability: 0.1 }),
    });
  }

  const candidateOrders = orders.filter((o) => o.userId && o.subOrder.some((s) => s.sellerId));
  for (const order of pickMany(candidateOrders, 8)) {
    const userId = order.userId;
    const sub = faker.helpers.arrayElement(order.subOrder.filter((s) => s.sellerId));
    const item = faker.helpers.arrayElement(sub.items);
    const createReturn = faker.datatype.boolean({ probability: 0.45 });
    if (!createReturn) continue;

    const rr = await ReturnRequest.create({
      userId,
      orderId: order._id,
      sellerId: sub.sellerId,
      orderRef: order.orderNumber,
      itemName: `Item ${item.productId.toString().slice(-6)}`,
      requestType: faker.helpers.arrayElement(['return', 'refund', 'exchange']),
      reason: faker.helpers.arrayElement(['defective', 'wrong', 'changed', 'other']),
      quantity: faker.number.int({ min: 1, max: Math.max(1, item.quantity) }),
      details: faker.lorem.sentences({ min: 1, max: 2 }),
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'completed']),
      sellerNote: faker.datatype.boolean({ probability: 0.35 }) ? faker.lorem.sentence() : null,
      adminNote: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
      isDisputed: false,
      disputeId: null,
    });

    if (faker.datatype.boolean({ probability: 0.25 })) {
      const dispute = await Dispute.create({
        orderId: order._id,
        returnRequestId: rr._id,
        userId,
        sellerId: sub.sellerId,
        type: faker.helpers.arrayElement(['refund', 'item_not_received', 'wrong_item', 'other']),
        reason: faker.lorem.sentences({ min: 1, max: 2 }),
        status: faker.helpers.arrayElement(['open', 'in_review', 'resolved']),
        resolution: faker.datatype.boolean({ probability: 0.5 }) ? faker.lorem.sentence() : null,
      });
      rr.isDisputed = true;
      rr.disputeId = dispute._id;
      await rr.save();
    }
  }

  // ── Conversations + messages ─────────────────────────────────────────────
  for (const order of pickMany(candidateOrders, 10)) {
    const user = customers.find((u) => u._id.toString() === order.userId.toString());
    const sellerId = faker.helpers.arrayElement(order.subOrder.filter((s) => s.sellerId)).sellerId;
    const seller = sellers.find((s) => s._id.toString() === sellerId.toString());
    if (!user || !seller) continue;

    const conv = await Conversation.create({
      userId: user._id,
      sellerId: seller._id,
      orderId: order._id,
      subject: `Order ${order.orderNumber} question`,
      lastMessage: '',
      lastMessageAt: new Date(),
      unreadByUser: 0,
      unreadBySeller: 0,
    });

    const msgCount = faker.number.int({ min: 3, max: 7 });
    let lastBody = '';
    for (let i = 0; i < msgCount; i++) {
      const fromUser = i % 2 === 0;
      lastBody = fromUser ? faker.lorem.sentence() : faker.lorem.sentence();
      await Message.create({
        conversationId: conv._id,
        senderId: fromUser ? user._id : seller.userId,
        senderRole: fromUser ? 'user' : 'seller',
        body: lastBody,
        attachment: null,
        reactions: [],
        isRead: true,
        readAt: new Date(),
        deletedAt: null,
        messageType: 'text',
      });
    }

    conv.lastMessage = lastBody;
    conv.lastMessageAt = new Date();
    await conv.save();
  }

  // ── Notifications ────────────────────────────────────────────────────────
  for (const user of pickMany(customers, 10)) {
    await Notification.insertMany([
      {
        userId: user._id,
        type: 'promotion',
        title: 'Welcome discount',
        message: 'Use code WELCOME10 for 10% off on your first order.',
        read: faker.datatype.boolean({ probability: 0.4 }),
        meta: { code: 'WELCOME10' },
      },
      {
        userId: user._id,
        type: 'account',
        title: 'Profile tip',
        message: 'Add a shipping address to speed up checkout.',
        read: faker.datatype.boolean({ probability: 0.6 }),
        meta: null,
      },
    ]);
  }

  // ── Payout transactions ─────────────────────────────────────────────────
  for (const seller of sellers) {
    await PayoutTransaction.create({
      sellerId: seller._id,
      amount: faker.number.int({ min: 50, max: 5000 }),
      currency: 'usd',
      method: 'stripe',
      status: faker.helpers.arrayElement(['pending', 'paid']),
      stripeTransferId: faker.datatype.boolean({ probability: 0.6 })
        ? `tr_${faker.string.alphanumeric({ length: 18, casing: 'lower' })}`
        : null,
      destinationAccountId: faker.datatype.boolean({ probability: 0.6 })
        ? `acct_${faker.string.alphanumeric({ length: 16, casing: 'lower' })}`
        : null,
      metadata: { note: 'Demo payout' },
      failureReason: null,
      processedAt: faker.datatype.boolean({ probability: 0.5 }) ? faker.date.recent({ days: 30 }) : null,
    });
  }

  // ── App settings ─────────────────────────────────────────────────────────
  await AppSetting.insertMany([
    { key: 'site.name', value: 'DemoMart' },
    { key: 'site.currency', value: 'PKR' },
    { key: 'shipping.standard', value: { fee: 200, etaDays: 3 } },
    { key: 'shipping.express', value: { fee: 450, etaDays: 1 } },
  ]);

  return {
    admin,
    customers,
    sellers,
    brands,
    categories: { rootCats, childCats },
    options: optionDocs,
    products,
    variants,
    orders,
  };
}

async function main() {
  const start = Date.now();

  if (!config.database.url) {
    throw new Error('MONGO_DB_URL is missing. Add it to backend/.env before seeding.');
  }

  await connectDatabase();

  logger.info(`Seeding database at ${config.database.url}`);
  if (shouldReset) {
    logger.warn('Reset enabled: deleting existing documents...');
    await resetDatabase();
  }

  const result = await seed();

  logger.info(
    `Seed complete in ${((Date.now() - start) / 1000).toFixed(1)}s: ` +
      `${result.customers.length} customers, ` +
      `${result.sellers.length} sellers, ` +
      `${result.brands.length} brands, ` +
      `${result.categories.childCats.length} categories, ` +
      `${result.products.length} products, ` +
      `${result.orders.length} orders`
  );

  logger.info('Demo credentials:');
  logger.info('  admin:   admin@demo.local / Admin@12345');
  logger.info('  user:    customer1@demo.local / User@12345');
  logger.info('  seller:  seller1@demo.local / Seller@12345');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

