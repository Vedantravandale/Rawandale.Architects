const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

class StoreDatabase {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.sqlitePath = path.join(dataDir, "store.sqlite");
    this.isPostgres = Boolean(process.env.DATABASE_URL);
    this.sqlite = this.isPostgres ? null : new DatabaseSync(this.sqlitePath);
    const sslCa = String(process.env.DATABASE_SSL_CA || "").replace(/\\n/g, "\n");
    let connectionString = process.env.DATABASE_URL;
    if (this.isPostgres && sslCa) {
      // Keep SSL options out of the URI so node-postgres doesn't override this CA config.
      const parsedUrl = new URL(connectionString);
      ["sslmode", "sslrootcert", "sslcert", "sslkey"].forEach(key => parsedUrl.searchParams.delete(key));
      connectionString = parsedUrl.toString();
    }
    this.pool = this.isPostgres ? new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "true"
        ? (sslCa ? { ca: sslCa, rejectUnauthorized: true } : true)
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    }) : null;
  }

  async query(sql, params = []) {
    if (this.isPostgres) {
      let index = 0;
      const postgresSql = sql.replace(/\?/g, () => `$${++index}`);
      return this.pool.query(postgresSql, params);
    }
    const statement = this.sqlite.prepare(sql);
    if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql)) {
      const rows = statement.all(...params);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...params);
    return { rows: [], rowCount: Number(result.changes) };
  }

  async one(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async exec(sql) {
    if (this.isPostgres) {
      for (const statement of sql.split(";").map(part => part.trim()).filter(Boolean)) await this.pool.query(statement);
      return;
    }
    return this.sqlite.exec(sql);
  }

  async migrationData(defaultProducts) {
    let products = null;
    let orders = null;
    if (this.isPostgres && fs.existsSync(this.sqlitePath)) {
      let legacy;
      try {
        legacy = new DatabaseSync(this.sqlitePath, { readOnly: true });
        const tables = new Set(legacy.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
        if (tables.has("products")) products = legacy.prepare("SELECT * FROM products ORDER BY rowid ASC").all().map(row => ({
          id:row.id,name:row.name,category:row.category,description:row.description,price:row.price,currency:row.currency,fileName:row.file_name,active:!!row.active,featured:!!row.featured
        }));
        if (tables.has("orders")) orders = legacy.prepare("SELECT * FROM orders ORDER BY rowid ASC").all().map(row => ({
          id:row.id,razorpayOrderId:row.razorpay_order_id,amount:row.amount,currency:row.currency,status:row.status,items:JSON.parse(row.items_json),createdAt:row.created_at,email:row.email,downloadToken:row.download_token,paymentId:row.payment_id,paidAt:row.paid_at
        }));
      } catch (error) {
        console.warn("Could not read the local SQLite migration source:", error.message);
      } finally {
        legacy?.close();
      }
    }
    const productsFile = path.join(this.dataDir, "products.json");
    const ordersFile = path.join(this.dataDir, "orders.json");
    if (!products?.length && fs.existsSync(productsFile)) products = JSON.parse(fs.readFileSync(productsFile, "utf8"));
    if (!orders?.length && fs.existsSync(ordersFile)) orders = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
    return { products:products?.length ? products : defaultProducts, orders:orders || [] };
  }

  async init(defaultProducts) {
    if (!this.isPostgres) this.sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    await this.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL CHECK (price >= 1),
        currency TEXT NOT NULL DEFAULT 'INR',
        file_name TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        featured INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        razorpay_order_id TEXT UNIQUE,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL,
        items_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        download_token TEXT,
        payment_id TEXT,
        paid_at TEXT
      );
      CREATE INDEX IF NOT EXISTS orders_download_token_idx ON orders(download_token);
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        service TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries(created_at);
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const migration = await this.migrationData(defaultProducts);
    await this.query("INSERT INTO site_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING", ["diwali_festive", "false"]);
    const productCount = await this.one("SELECT COUNT(*) AS count FROM products");
    if (Number(productCount.count) === 0) {
      for (const p of migration.products) {
        await this.query(`INSERT INTO products (id,name,category,description,price,currency,file_name,active,featured)
          VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`, [p.id,p.name,p.category,p.description||"",Number(p.price)||1,p.currency||"INR",p.fileName||null,p.active===false?0:1,p.featured?1:0]);
      }
    }
    const orderCount = await this.one("SELECT COUNT(*) AS count FROM orders");
    if (Number(orderCount.count) === 0) {
      for (const o of migration.orders) {
        await this.query(`INSERT INTO orders (id,razorpay_order_id,amount,currency,status,items_json,created_at,email,download_token,payment_id,paid_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`, [o.id,o.razorpayOrderId||null,o.amount||0,o.currency||"INR",o.status||"created",JSON.stringify(o.items||[]),o.createdAt||new Date().toISOString(),o.email||"",o.downloadToken||null,o.paymentId||null,o.paidAt||null]);
      }
    }
  }

  async listProducts(activeOnly = false) {
    const result = await this.query(`SELECT * FROM products ${activeOnly ? "WHERE active=1" : ""} ORDER BY featured DESC, id ASC`);
    return result.rows.map(row => ({id:row.id,name:row.name,category:row.category,description:row.description,price:row.price,currency:row.currency,fileName:row.file_name,active:Number(row.active)===1,featured:Number(row.featured)===1}));
  }

  async findProduct(id) {
    const row = await this.one("SELECT * FROM products WHERE id=?", [id]);
    return row && ({id:row.id,name:row.name,category:row.category,description:row.description,price:row.price,currency:row.currency,fileName:row.file_name,active:Number(row.active)===1,featured:Number(row.featured)===1});
  }

  async saveProduct(p) {
    return this.query(`INSERT INTO products (id,name,category,description,price,currency,file_name,active,featured)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,currency=excluded.currency,file_name=excluded.file_name,active=excluded.active,featured=excluded.featured`,
      [p.id,p.name,p.category,p.description,p.price,p.currency,p.fileName||null,p.active?1:0,p.featured?1:0]);
  }

  async listOrders() {
    const result = await this.query("SELECT * FROM orders ORDER BY created_at DESC");
    return result.rows.map(row => ({id:row.id,razorpayOrderId:row.razorpay_order_id,amount:row.amount,currency:row.currency,status:row.status,items:JSON.parse(row.items_json),createdAt:row.created_at,email:row.email,downloadToken:row.download_token,paymentId:row.payment_id,paidAt:row.paid_at}));
  }

  async createInquiry(inquiry) {
    return this.query(`INSERT INTO inquiries (id,name,email,phone,service,message,status,created_at)
      VALUES (?,?,?,?,?,?,'new',?)`, [inquiry.id,inquiry.name,inquiry.email,inquiry.phone,inquiry.service,inquiry.message,inquiry.createdAt]);
  }

  async listInquiries() {
    const result = await this.query("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1000");
    return result.rows.map(row => ({id:row.id,name:row.name,email:row.email,phone:row.phone,service:row.service,message:row.message,status:row.status,createdAt:row.created_at}));
  }

  async updateInquiryStatus(id, status) {
    return this.query("UPDATE inquiries SET status=? WHERE id=?", [status,id]);
  }

  async findOrderByRazorpayId(id) {
    const row = await this.one("SELECT * FROM orders WHERE razorpay_order_id=?", [id]);
    return row && ({id:row.id,razorpayOrderId:row.razorpay_order_id,amount:row.amount,currency:row.currency,status:row.status,items:JSON.parse(row.items_json),createdAt:row.created_at,email:row.email,downloadToken:row.download_token,paymentId:row.payment_id,paidAt:row.paid_at});
  }

  async findOrderByDownloadToken(token) {
    const row = await this.one("SELECT * FROM orders WHERE status='paid' AND download_token=?", [token]);
    return row && ({id:row.id,razorpayOrderId:row.razorpay_order_id,amount:row.amount,currency:row.currency,status:row.status,items:JSON.parse(row.items_json),createdAt:row.created_at,email:row.email,downloadToken:row.download_token,paymentId:row.payment_id,paidAt:row.paid_at});
  }

  async insertOrder(o) {
    return this.query(`INSERT INTO orders (id,razorpay_order_id,amount,currency,status,items_json,created_at,email,download_token,payment_id,paid_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [o.id,o.razorpayOrderId,o.amount,o.currency,o.status,JSON.stringify(o.items),o.createdAt,o.email,o.downloadToken||null,o.paymentId||null,o.paidAt||null]);
  }

  async savePaidOrder(o) {
    return this.query("UPDATE orders SET status='paid',email=?,download_token=?,payment_id=?,paid_at=? WHERE id=?", [o.email,o.downloadToken,o.paymentId,o.paidAt,o.id]);
  }

  async saveSession(tokenHash, expiresAt) {
    return this.query("INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at", [tokenHash,expiresAt]);
  }

  async findSession(tokenHash) {
    return this.one("SELECT expires_at FROM admin_sessions WHERE token_hash=?", [tokenHash]);
  }

  async deleteSession(tokenHash) {
    return this.query("DELETE FROM admin_sessions WHERE token_hash=?", [tokenHash]);
  }

  async getSiteSetting(key) {
    return this.one("SELECT value FROM site_settings WHERE key=?", [key]);
  }

  async setSiteSetting(key, value) {
    return this.query("INSERT INTO site_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key,value]);
  }

  async deactivateProduct(id) {
    return this.query("UPDATE products SET active=0 WHERE id=?", [id]);
  }

  async close() {
    if (this.pool) await this.pool.end();
    if (this.sqlite) this.sqlite.close();
  }
}

module.exports = { StoreDatabase };

