import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path in root directory
const DB_PATH = path.join(process.cwd(), 'sakhidesk.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    initTables(dbInstance);
    seedIfEmpty(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      category TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      upi_id TEXT,
      currency TEXT DEFAULT 'USD',
      bio TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      unit TEXT DEFAULT 'item',
      is_available INTEGER DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      delivery_date TEXT,
      delivery_time TEXT,
      delivery_address TEXT,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT NOT NULL,
      notes TEXT,
      original_message TEXT,
      needs_attention_json TEXT,
      input_type TEXT DEFAULT 'TEXT',
      paypal_invoice_id TEXT,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      order_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      paypal_invoice_id TEXT,
      paypal_status TEXT DEFAULT 'DRAFT',
      payment_url TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      notes TEXT,
      is_demo INTEGER DEFAULT 0,
      sent_at TEXT,
      paid_at TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      order_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      channel TEXT DEFAULT 'PAYPAL',
      status TEXT DEFAULT 'SENT',
      message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const sellerCount = (db.prepare('SELECT COUNT(*) as count FROM sellers').get() as { count: number }).count;
  if (sellerCount > 0) return;

  const now = new Date().toISOString();

  // 1. Seed Seller
  db.prepare(`
    INSERT INTO sellers (id, name, business_name, category, phone, email, address, upi_id, currency, bio, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'seller_1',
    'Pooja Sharma',
    "Pooja's Artisan Delights & Boutique",
    'Home Baker & Handcrafted Boutique',
    '+91 98765 43210',
    'sb-merchant@business.example.com',
    'Flat 402, Sunshine Heights, Mumbai, India',
    'pooja.delights@upi',
    'USD',
    'Small home-based kitchen and handcrafted designer studio specializing in custom cakes, embroidered outfits, and artisanal accessories made with love.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    now
  );

  // 2. Seed Products
  const products = [
    {
      id: 'prod_1',
      name: 'Custom 1kg Birthday Chocolate Cake',
      category: 'Bakery',
      description: 'Rich Belgian chocolate sponge with smooth ganache and custom personalized icing lettering.',
      price: 25.00,
      unit: 'kg',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300'
    },
    {
      id: 'prod_2',
      name: 'Handcrafted Blue Phulkari Kurti (Size M)',
      category: 'Apparel',
      description: 'Traditional Punjabi hand-embroidered cotton kurti in royal blue with intricate floral motifs.',
      price: 35.00,
      unit: 'piece',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300'
    },
    {
      id: 'prod_3',
      name: 'Artisanal Choco-Truffle Cupcakes (Box of 6)',
      category: 'Bakery',
      description: 'Assorted box of 6 handcrafted dark and milk chocolate cupcakes with butter frosting.',
      price: 15.00,
      unit: 'box',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=300'
    },
    {
      id: 'prod_4',
      name: 'Handmade Kundan & Pearl Bracelet',
      category: 'Jewellery',
      description: 'Gold-plated bridal Kundan bangle with delicate freshwater faux pearls and adjustable closure.',
      price: 18.00,
      unit: 'piece',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1611591475104-1b77715f0eb1?w=300'
    },
    {
      id: 'prod_5',
      name: 'Traditional Homemade Mango Pickle (500g Jar)',
      category: 'Food',
      description: 'Grandma recipe cold-pressed mustard oil raw mango pickle with whole aromatic spices.',
      price: 10.00,
      unit: 'jar',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300'
    },
    {
      id: 'prod_6',
      name: 'Hand-painted Festive Diya Set (Set of 4)',
      category: 'Handicrafts',
      description: 'Earthy terracotta diyas hand-painted in vibrant festive colors with golden glitter highlights.',
      price: 12.00,
      unit: 'set',
      is_available: 1,
      image_url: 'https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?w=300'
    }
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, description, price, unit, is_available, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  products.forEach(p => {
    insertProduct.run(p.id, p.name, p.category, p.description, p.price, p.unit, p.is_available, p.image_url, now);
  });

  // 3. Seed Customers
  const customers = [
    {
      id: 'cust_1',
      name: 'Ananya Verma',
      phone: '+91 98200 12345',
      email: 'ananya.verma@example.com',
      address: 'B-12 Palm Grove, Bandra West, Mumbai',
      notes: 'Loyal customer, prefers eggless cakes.',
      total_orders: 3,
      total_spent: 120.00,
      outstanding_balance: 0
    },
    {
      id: 'cust_2',
      name: 'Rohit Patel',
      phone: '+91 98111 67890',
      email: 'rohit.patel@example.com',
      address: '401 Lotus Enclave, Andheri East, Mumbai',
      notes: 'Bought custom kurti for sister wedding.',
      total_orders: 1,
      total_spent: 35.00,
      outstanding_balance: 35.00
    },
    {
      id: 'cust_3',
      name: 'Sunita Mehra',
      phone: '+91 98333 45678',
      email: 'sunita.mehra@example.com',
      address: '15 Rose Villa, Powai, Mumbai',
      notes: 'Loves homemade mango pickles & gift boxes.',
      total_orders: 2,
      total_spent: 42.00,
      outstanding_balance: 0
    },
    {
      id: 'cust_4',
      name: 'Priya Kapoor',
      phone: '+91 98444 89012',
      email: 'priya.k@example.com',
      address: '702 Sea View Apartments, Juhu, Mumbai',
      notes: 'Requires delivery before 5 PM on weekdays.',
      total_orders: 1,
      total_spent: 50.00,
      outstanding_balance: 0
    }
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, phone, email, address, notes, total_orders, total_spent, outstanding_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  customers.forEach(c => {
    insertCustomer.run(c.id, c.name, c.phone, c.email, c.address, c.notes, c.total_orders, c.total_spent, c.outstanding_balance, now, now);
  });

  // 4. Seed Orders & Invoices (Clearly marked with is_demo = 1)
  // Demo Order 1: PAID Demo Order
  const order1Items = JSON.stringify([
    { name: 'Custom 1kg Birthday Chocolate Cake', quantity: 2, unit_price: 25.00, customization: 'Happy Birthday Aanya lettering', total: 50.00 }
  ]);
  db.prepare(`
    INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, customer_email, delivery_date, delivery_time, delivery_address, items_json, subtotal, tax, discount, total_amount, currency, status, notes, original_message, needs_attention_json, input_type, paypal_invoice_id, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ord_demo_1',
    'ORD-2026-001',
    'cust_1',
    'Ananya Verma',
    '+91 98200 12345',
    'ananya.verma@example.com',
    '2026-11-05',
    '6:00 PM',
    'B-12 Palm Grove, Bandra West, Mumbai',
    order1Items,
    50.00, 0, 0, 50.00, 'USD',
    'PAID',
    'Demo order - Payment confirmed via PayPal Sandbox',
    'Hi didi, mujhe 2 chocolate cakes chahiye 1 kg each. Delivery 5th evening 6 baje. Happy Birthday Aanya likhna hai.',
    JSON.stringify([]),
    'TEXT',
    'INV2-DEMO-PAID-001',
    1,
    now,
    now
  );

  db.prepare(`
    INSERT INTO invoices (id, invoice_number, order_id, customer_name, customer_email, paypal_invoice_id, paypal_status, payment_url, amount, currency, notes, is_demo, sent_at, paid_at, last_synced_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'inv_demo_1',
    'INV-DEMO-001',
    'ord_demo_1',
    'Ananya Verma',
    'ananya.verma@example.com',
    'INV2-DEMO-PAID-001',
    'PAID',
    'https://www.sandbox.paypal.com/invoice/p/#DEMO_PAID_001',
    50.00,
    'USD',
    'Demo sample invoice - Confirmed Paid',
    1,
    now,
    now,
    now,
    now,
    now
  );

  // Demo Order 2: PAYMENT_PENDING Demo Order
  const order2Items = JSON.stringify([
    { name: 'Handcrafted Blue Phulkari Kurti (Size M)', quantity: 1, unit_price: 35.00, customization: 'Size M, royal blue', total: 35.00 }
  ]);
  db.prepare(`
    INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, customer_email, delivery_date, delivery_time, delivery_address, items_json, subtotal, tax, discount, total_amount, currency, status, notes, original_message, needs_attention_json, input_type, paypal_invoice_id, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ord_demo_2',
    'ORD-2026-002',
    'cust_2',
    'Rohit Patel',
    '+91 98111 67890',
    'rohit.patel@example.com',
    '2026-11-10',
    '4:00 PM',
    '401 Lotus Enclave, Andheri East, Mumbai',
    order2Items,
    35.00, 0, 0, 35.00, 'USD',
    'PAYMENT_PENDING',
    'Invoice sent, waiting for customer payment.',
    'I need 1 customised kurti in blue colour. Size M, delivery on 10th. Please confirm the price.',
    JSON.stringify([]),
    'TEXT',
    'INV2-DEMO-SENT-002',
    1,
    now,
    now
  );

  db.prepare(`
    INSERT INTO invoices (id, invoice_number, order_id, customer_name, customer_email, paypal_invoice_id, paypal_status, payment_url, amount, currency, notes, is_demo, sent_at, paid_at, last_synced_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'inv_demo_2',
    'INV-DEMO-002',
    'ord_demo_2',
    'Rohit Patel',
    'rohit.patel@example.com',
    'INV2-DEMO-SENT-002',
    'SENT',
    'https://www.sandbox.paypal.com/invoice/p/#DEMO_SENT_002',
    35.00,
    'USD',
    'Demo sample invoice - Sent & Pending Payment',
    1,
    now,
    null,
    now,
    now,
    now
  );

  // Demo Order 3: NEEDS_REVIEW Demo Order (messy message with yellow warning)
  const order3Items = JSON.stringify([
    { name: 'Handmade Beaded Kundan Bracelet', quantity: 5, unit_price: 5.00, customization: 'Assorted colors', total: 25.00 }
  ]);
  db.prepare(`
    INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, customer_email, delivery_date, delivery_time, delivery_address, items_json, subtotal, tax, discount, total_amount, currency, status, notes, original_message, needs_attention_json, input_type, paypal_invoice_id, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ord_demo_3',
    'ORD-2026-003',
    'cust_3',
    'Sunita Mehra',
    '+91 98333 45678',
    '',
    '2026-11-12',
    '',
    '',
    order3Items,
    25.00, 0, 0, 25.00, 'USD',
    'NEEDS_REVIEW',
    'Needs email and delivery address before invoice generation',
    'Namaste didi, 5 handmade bracelets chahiye. Har ek 5 dollars ka. Delivery next week.',
    JSON.stringify([
      'Customer email is missing (required for PayPal Invoicing)',
      'Exact delivery time and address not specified',
      'Please confirm bracelet color preferences with customer'
    ]),
    'TEXT',
    null,
    1,
    now,
    now
  );

  // 5. Seed Activity Logs
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertLog.run('log_1', 'ORDER_CREATED', 'New order received from WhatsApp', 'Ananya Verma ordered 2x Birthday Cakes', 'ord_demo_1', now);
  insertLog.run('log_2', 'INVOICE_SENT', 'PayPal Invoice sent', 'Invoice #INV-DEMO-001 sent to ananya.verma@example.com ($50.00)', 'inv_demo_1', now);
  insertLog.run('log_3', 'PAYMENT_RECEIVED', 'Payment confirmed by PayPal', '$50.00 received for Invoice #INV-DEMO-001', 'inv_demo_1', now);
  insertLog.run('log_4', 'INVOICE_SENT', 'PayPal Invoice sent', 'Invoice #INV-DEMO-002 sent to rohit.patel@example.com ($35.00)', 'inv_demo_2', now);
}
