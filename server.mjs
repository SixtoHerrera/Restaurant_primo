import { createPrintQueue } from "./printer.mjs";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const data =
  process.env.PRIMO_DATA_DIR ||
  path.join(process.env.LOCALAPPDATA || root, "TaqueriaElPrimo");
mkdirSync(data, { recursive: true });
const db = new DatabaseSync(path.join(data, "primo.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL,available INTEGER NOT NULL DEFAULT 1,options TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,day TEXT NOT NULL,number INTEGER NOT NULL,created TEXT NOT NULL,name TEXT NOT NULL,total INTEGER NOT NULL,items TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL,cancel_reason TEXT,UNIQUE(day,number));`);
if (!db.prepare("SELECT id FROM products LIMIT 1").get())
  db.prepare(
    "INSERT INTO products(name,category,price,options) VALUES(?,?,?,?)",
  ).run(
    "Taco asada",
    "Tacos",
    300,
    JSON.stringify([
      { name: "Cebolla", price: 0 },
      { name: "Cilantro", price: 0 },
      { name: "Aguacate", price: 50 },
    ]),
  );
const printQueue = createPrintQueue(db);
const sessions = new Map();
const attempts = new Map();
function setting(k) {
  return db.prepare("SELECT value FROM settings WHERE key=?").get(k)?.value;
}
function day() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.PRIMO_TIMEZONE || "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function products() {
  return db
    .prepare("SELECT * FROM products")
    .all()
    .map((p) => ({ ...p, options: JSON.parse(p.options) }));
}
function order(o) {
  return {
    ...o,
    items: JSON.parse(o.items),
    printing: printQueue.latest(o.id),
  };
}
function check(condition, message) {
  if (!condition) throw Error(message);
}
function passwordHash(p, salt) {
  return scryptSync(p, salt, 64).toString("hex");
}
const server = http.createServer(async (req, res) => {
  const send = (status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname;
    if (req.method === "GET" && !route.startsWith("/api/")) {
      const f = {
        "/": "index.html",
        "/admin": "admin.html",
        "/app.js": "app.js",
        "/admin.js": "admin.js",
        "/style.css": "style.css",
      }[route];
      if (!f) {
        res.writeHead(404);
        return res.end();
      }
      res.setHeader(
        "Content-Type",
        f.endsWith(".js")
          ? "text/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : "text/html; charset=utf-8",
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.end(readFileSync(path.join(root, "public", f)));
    }
    let body = {};
    if (req.method !== "GET") {
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        return send(403, { error: "Origen no permitido" });
      let raw = "";
      for await (const c of req) {
        raw += c;
        check(raw.length < 100000, "Solicitud demasiado grande");
      }
      body = JSON.parse(raw || "{}");
    }
    const token = /primo=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
    const authenticated = sessions.get(token) > Date.now();
    if (route === "/api/menu")
      return send(
        200,
        products().filter((p) => p.available),
      );
    if (route === "/api/status")
      return send(200, { setup: !!setting("password"), authenticated });
    if (route === "/api/setup" && req.method === "POST") {
      check(
        ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          req.socket.remoteAddress,
        ),
        "Configura el administrador desde la computadora del servidor",
      );
      check(!setting("password"), "Administrador ya configurado");
      check(
        typeof body.password === "string" && body.password.length >= 10,
        "Usa al menos 10 caracteres",
      );
      const salt = randomBytes(16).toString("hex");
      db.prepare("INSERT INTO settings VALUES(?,?)").run(
        "password",
        salt + ":" + passwordHash(body.password, salt),
      );
      return send(200, { ok: true });
    }
    if (route === "/api/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress;
      let attempt = attempts.get(ip);
      if (!attempt || attempt.until < Date.now()) {
        attempt = { count: 0, until: Date.now() + 60000 };
        attempts.set(ip, attempt);
      }
      if (++attempt.count > 10)
        return send(429, { error: "Demasiados intentos. Espera un minuto." });
      const saved = setting("password");
      check(saved && typeof body.password === "string", "Acceso incorrecto");
      const [salt, hash] = saved.split(":");
      check(
        timingSafeEqual(
          Buffer.from(hash, "hex"),
          Buffer.from(passwordHash(body.password, salt), "hex"),
        ),
        "Acceso incorrecto",
      );
      const t = randomBytes(32).toString("hex");
      sessions.set(t, Date.now() + 8 * 3600000);
      res.setHeader(
        "Set-Cookie",
        `primo=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
      );
      return send(200, { ok: true });
    }
    if (route === "/api/logout") {
      sessions.delete(token);
      res.setHeader(
        "Set-Cookie",
        "primo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      );
      return send(200, { ok: true });
    }
    if (route === "/api/orders" && req.method === "POST") {
      check(
        typeof body.key === "string" && /^[a-f0-9-]{36}$/.test(body.key),
        "Clave inválida",
      );
      const old = db
        .prepare("SELECT * FROM orders WHERE request_key=?")
        .get(body.key);
      if (old) return send(200, order(old));
      check(
        typeof body.name === "string" &&
          body.name.trim().length > 0 &&
          body.name.trim().length <= 60,
        "Escribe tu nombre (máximo 60 caracteres)",
      );
      check(
        Array.isArray(body.items) &&
          body.items.length > 0 &&
          body.items.length <= 100,
        "Pedido vacío o demasiado grande",
      );
      const menu = products();
      const items = body.items.map((i) => {
        const p = menu.find((p) => p.id === i.id && p.available);
        check(p, "Producto no disponible");
        check(
          Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 50,
          "Cantidad inválida",
        );
        check(
          Array.isArray(i.options) &&
            new Set(i.options).size === i.options.length,
          "Opciones inválidas",
        );
        const opts = i.options.map((n) => {
          const o = p.options.find((o) => o.name === n);
          check(o, "Opción no disponible");
          return o;
        });
        return {
          id: p.id,
          name: p.name,
          qty: i.qty,
          options: opts,
          unit: p.price + opts.reduce((a, o) => a + o.price, 0),
        };
      });
      const total = items.reduce((a, i) => a + i.unit * i.qty, 0);
      db.exec("BEGIN IMMEDIATE");
      try {
        const d = day();
        const n = db
          .prepare("SELECT COALESCE(MAX(number),0)+1 n FROM orders WHERE day=?")
          .get(d).n;
        const r = db
          .prepare(
            "INSERT INTO orders(day,number,created,name,total,items,request_key) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            d,
            n,
            new Date().toISOString(),
            body.name.trim(),
            total,
            JSON.stringify(items),
            body.key,
          );
        printQueue.enqueue(r.lastInsertRowid);
        db.exec("COMMIT");
        return send(
          201,
          order(
            db
              .prepare("SELECT * FROM orders WHERE id=?")
              .get(r.lastInsertRowid),
          ),
        );
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
    if (!authenticated)
      return send(401, { error: "Inicia sesión como administrador" });
    if (route === "/api/reprint" && req.method === "POST") {
      check(Number.isInteger(body.id), "Orden inválida");
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(body.id);
      check(o && !o.cancel_reason, "Orden inexistente o cancelada");
      const last = printQueue.latest(o.id);
      check(
        !last || !["queued", "sending"].includes(last.status),
        "La orden ya está en cola",
      );
      printQueue.enqueue(o.id, true);
      return send(200, { ok: true });
    }
    if (route === "/api/products" && req.method === "GET")
      return send(200, products());
    if (route === "/api/products" && req.method === "POST") {
      check(
        typeof body.name === "string" &&
          body.name.trim() &&
          typeof body.category === "string" &&
          body.category.trim(),
        "Nombre y categoría requeridos",
      );
      check(
        Number.isInteger(body.price) && body.price >= 0 && body.price <= 100000,
        "Precio inválido",
      );
      check(
        Array.isArray(body.options) &&
          body.options.length <= 30 &&
          body.options.every(
            (o) =>
              typeof o.name === "string" &&
              o.name.trim() &&
              Number.isInteger(o.price) &&
              o.price >= 0 &&
              o.price <= 100000,
          ) &&
          new Set(body.options.map((o) => o.name)).size === body.options.length,
        "Opciones inválidas",
      );
      const args = [
        body.name.trim(),
        body.category.trim(),
        body.price,
        body.available ? 1 : 0,
        JSON.stringify(body.options),
      ];
      if (body.id)
        db.prepare(
          "UPDATE products SET name=?,category=?,price=?,available=?,options=? WHERE id=?",
        ).run(...args, body.id);
      else
        db.prepare(
          "INSERT INTO products(name,category,price,available,options) VALUES(?,?,?,?,?)",
        ).run(...args);
      return send(200, { ok: true });
    }
    if (route === "/api/orders" && req.method === "GET") {
      const from = url.searchParams.get("from") || day(),
        to = url.searchParams.get("to") || day();
      check(
        /^\d{4}-\d{2}-\d{2}$/.test(from) &&
          /^\d{4}-\d{2}-\d{2}$/.test(to) &&
          from <= to,
        "Fechas inválidas",
      );
      return send(
        200,
        db
          .prepare(
            "SELECT * FROM orders WHERE day BETWEEN ? AND ? ORDER BY id DESC",
          )
          .all(from, to)
          .map(order),
      );
    }
    if (route === "/api/cancel" && req.method === "POST") {
      check(
        typeof body.reason === "string" &&
          body.reason.trim().length > 0 &&
          body.reason.length <= 300,
        "Escribe el motivo",
      );
      db.prepare(
        "UPDATE orders SET cancel_reason=? WHERE id=? AND cancel_reason IS NULL",
      ).run(body.reason.trim(), body.id);
      return send(200, { ok: true });
    }
    send(404, { error: "Ruta no encontrada" });
  } catch (e) {
    send(400, { error: e.message });
  }
});
server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log(
    `Taqueria El Primo: http://localhost:${process.env.PORT || 3000}\nBase de datos: ${data}\nAdministrador: /admin`,
  ),
);
