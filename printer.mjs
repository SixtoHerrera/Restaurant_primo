import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const hex = (s) =>
  [...Buffer.from(String(s), "utf8")]
    .map((b) => "_" + b.toString(16).padStart(2, "0"))
    .join("");
function wrap(text, width = 30) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" "),
    lines = [];
  let line = "";
  for (let word of words) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = "";
    }
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines;
}
export function labelZpl(order, reprint = false) {
  const lines = [];
  for (const item of order.items) {
    lines.push(...wrap(`${item.qty} x ${item.name}`));
    for (const option of item.options)
      lines.push(...wrap(`  + ${option.name}`));
    if (!item.options.length) lines.push("  Sin complementos");
    lines.push(`  USD ${((item.qty * item.unit) / 100).toFixed(2)}`, "");
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += 23) pages.push(lines.slice(i, i + 23));
  if (!pages.length) pages.push([]);
  const field = (x, y, text, size = 24) =>
    `^FO${x},${y}^A0N,${size},${size}^FH_^FD${hex(text)}^FS`;
  return pages
    .map(
      (page, index) =>
        "^XA^CI28^PW812^LL1218^LH0,0^LS0^LT0" +
        field(30, 25, "TAQUERIA EL PRIMO", 36) +
        field(30, 78, `ORDEN #${order.number}`, 52) +
        wrap(`CLIENTE: ${order.name}`, 38)
          .map((s, i) => field(30, 145 + i * 24, s, 20))
          .join("") +
        field(
          30,
          220,
          `${order.day}  ${new Date(order.created).toLocaleTimeString("es-MX", { timeZone: process.env.PRIMO_TIMEZONE || "America/Chicago", hour: "2-digit", minute: "2-digit" })}`,
          24,
        ) +
        field(
          30,
          255,
          `${reprint ? "REIMPRESION | " : ""}Hoja ${index + 1}/${pages.length}`,
          24,
        ) +
        "^FO30,290^GB750,2,2^FS" +
        page.map((s, i) => field(30, 310 + i * 32, s)).join("") +
        "^FO30,1060^GB750,2,2^FS" +
        field(
          30,
          1080,
          `Subtotal orden: USD ${(order.total / 100).toFixed(2)}`,
          30,
        ) +
        field(30, 1130, "Tax not included", 25) +
        "^PQ1^XZ",
    )
    .join("\n");
}
export function sendZpl(zpl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        fileURLToPath(new URL("./print-zebra.ps1", import.meta.url)),
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        Error(
          "Tiempo de espera agotado; revisar cola de Windows antes de reimprimir",
        ),
      );
    }, 30000);
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.stdin.on("error", () => {});
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0)
        return reject(
          Error((err || out || "No se pudo enviar a Windows").slice(0, 1200)),
        );
      try {
        resolve(JSON.parse(out.trim()));
      } catch {
        reject(
          Error(
            "Respuesta de Windows no reconocida; revisar cola antes de reimprimir",
          ),
        );
      }
    });
    child.stdin.end(
      JSON.stringify({
        printer: process.env.PRIMO_PRINTER || "ZDesigner ZD621-203dpi ZPL",
        data: Buffer.from(zpl).toString("base64"),
      }),
    );
  });
}
export function createPrintQueue(db, send = sendZpl) {
  db.exec(`CREATE TABLE IF NOT EXISTS print_jobs(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL REFERENCES orders(id),status TEXT NOT NULL DEFAULT 'queued',created TEXT NOT NULL,error TEXT,windows_job INTEGER,reprint INTEGER NOT NULL DEFAULT 0);
 UPDATE print_jobs SET status='uncertain',error='El servidor se reinició durante el envío. Revisar la cola de Windows y el papel antes de reimprimir.' WHERE status='sending';`);
  let busy = false;
  function enqueue(id, reprint = false) {
    return db
      .prepare("INSERT INTO print_jobs(order_id,created,reprint) VALUES(?,?,?)")
      .run(id, new Date().toISOString(), reprint ? 1 : 0);
  }
  async function processNext() {
    if (busy || process.env.PRIMO_PRINT_MODE === "disabled") return;
    const job = db
      .prepare(
        "SELECT * FROM print_jobs WHERE status='queued' ORDER BY id LIMIT 1",
      )
      .get();
    if (!job) return;
    busy = true;
    try {
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(job.order_id);
      if (o.cancel_reason) {
        db.prepare("UPDATE print_jobs SET status='cancelled' WHERE id=?").run(
          job.id,
        );
        return;
      }
      db.prepare("UPDATE print_jobs SET status='sending' WHERE id=?").run(
        job.id,
      );
      const result = await send(
        labelZpl({ ...o, items: JSON.parse(o.items) }, !!job.reprint),
      );
      db.prepare(
        "UPDATE print_jobs SET status='submitted',windows_job=? WHERE id=?",
      ).run(result.jobId, job.id);
    } catch (e) {
      db.prepare(
        "UPDATE print_jobs SET status='uncertain',error=? WHERE id=?",
      ).run(String(e.message).slice(0, 1200), job.id);
    } finally {
      busy = false;
    }
  }
  const timer = setInterval(() => processNext().catch(console.error), 750);
  timer.unref();
  return {
    enqueue,
    processNext,
    close: () => clearInterval(timer),
    latest: (id) =>
      db
        .prepare(
          "SELECT * FROM print_jobs WHERE order_id=? ORDER BY id DESC LIMIT 1",
        )
        .get(id) || null,
  };
}
