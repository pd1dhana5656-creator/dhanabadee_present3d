/**
 * sheets.js
 * =========
 * Helper โหลดและ parse ข้อมูลจาก Google Sheets (Published CSV)
 *
 * Schema คอลัมน์จาก Sheets จริง (ทั้ง sheet "dhana" และ "dm"):
 *   A: date
 *   B: ชื่อสินค้า
 *   C: รหัสสินค้า
 *   D: size
 *   E: ประเภทสินค้า
 *   F: ขนาดสินค้า (cm.)
 *   G: finishing
 *   H: finishing อื่นๆ    ← หมายเหตุเพิ่มเติมเกี่ยวกับ finishing (ข้อความ)
 *   I: รูปภาพ             ← URL รูปจาก Google Drive (หลาย URL คั่นด้วย comma ได้)
 *   J: โมเดล 3D           ← URL .glb หรือ Sketchfab embed URL
 *   K: สินค้าสีอื่น        ← รหัสสินค้า variant อื่นที่จับคู่กัน คั่นด้วย ", "
 *                            เช่น "L16-2156-BE, L16-2156-CE"
 *                            JS จะแปลงเป็น swatch link ให้อัตโนมัติ
 *
 * ตัวอย่างการกรอก "สินค้าสีอื่น":
 *   สินค้า A (รหัส X)  → สินค้าสีอื่น: "Y, Z"
 *   สินค้า B (รหัส Y)  → สินค้าสีอื่น: "X, Z"
 *   สินค้า C (รหัส Z)  → สินค้าสีอื่น: "X, Y"
 */

// ─── URL ของแต่ละ Sheet (เปลี่ยนเป็น URL ที่ Publish จริง) ───────────────────

const SHEET_URLS = {
  dhana: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3BasR4S6QzfdPX_X9pMjEazvTIjhde22mhw0ofbFXCGUVQ9j82J_-_zF2fiLYyKAuMEMDgvpt1j2X/pub?gid=0&single=true&output=csv",
  dm:    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3BasR4S6QzfdPX_X9pMjEazvTIjhde22mhw0ofbFXCGUVQ9j82J_-_zF2fiLYyKAuMEMDgvpt1j2X/pub?gid=1123707719&single=true&output=csv",
};

// ─── Cache ─────────────────────────────────────────────────────────────────────
const _cache = {};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * โหลด products ของ group ที่ระบุ
 * @param {"dhana"|"dm"} group
 * @returns {Promise<Product[]>}
 */
export async function loadProducts(group) {
  if (_cache[group]) return _cache[group];

  const url = SHEET_URLS[group];
  if (!url) throw new Error(`Unknown group: ${group}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const csv = await res.text();
  _cache[group] = parseCSV(csv);
  return _cache[group];
}

/**
 * ดึง unique ประเภทสินค้าใน group นั้น (สำหรับหน้า category)
 * @param {Product[]} products
 * @returns {string[]}
 */
export function getTypes(products) {
  const types = new Set(
    products
      .map((p) => p["ประเภทสินค้า"])
      .filter(Boolean)
  );
  return [...types];
}

/**
 * กรองสินค้าตาม ประเภทสินค้า
 * @param {Product[]} products
 * @param {string} type
 * @returns {Product[]}
 */
export function filterByType(products, type) {
  return products.filter(
    (p) => p["ประเภทสินค้า"]?.toLowerCase() === type.toLowerCase()
  );
}

/**
 * หาสินค้า 1 row ตาม รหัสสินค้า (แนวทาง B: 1 row ต่อ 1 สินค้า)
 * @param {Product[]} products
 * @param {string} code
 * @returns {Product|undefined}
 */
export function findByCode(products, code) {
  return products.find((p) => p["รหัสสินค้า"]?.trim() === code?.trim());
}

/**
 * แปลงค่าในคอลัมน์ "สินค้าสีอื่น" เป็น array ของรหัสสินค้า
 * รับค่าเช่น "L16-2156-BE, L16-2156-CE" → ["L16-2156-BE", "L16-2156-CE"]
 * @param {Product} product
 * @returns {string[]}
 */
export function getVariantCodes(product) {
  const raw = product["สินค้าสีอื่น"] ?? "";
  if (!raw.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * ดึง Product objects ของ variant ทั้งหมด (รวม current) เรียงตาม code
 * @param {Product[]} products   - สินค้าทั้งหมดใน group
 * @param {Product}   current    - สินค้าตัวปัจจุบัน
 * @returns {Product[]}          - [current, ...otherVariants] (deduplicated)
 */
export function getAllVariants(products, current) {
  const otherCodes = getVariantCodes(current);

  // รวม current + variants ที่ระบุ (กรองออกถ้าซ้ำ)
  const all = [current];
  otherCodes.forEach((c) => {
    const found = findByCode(products, c);
    if (found && found["รหัสสินค้า"] !== current["รหัสสินค้า"]) {
      all.push(found);
    }
  });
  return all;
}

/**
 * อ่าน query parameter จาก URL ปัจจุบัน
 * @param {string} key
 * @returns {string|null}
 */
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ─── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Parse CSV text → array of objects
 * ใช้ header row (แถวแรก) เป็น key
 *
 * @typedef {Object} Product
 * @property {string} date
 * @property {string} ชื่อสินค้า
 * @property {string} รหัสสินค้า
 * @property {string} size
 * @property {string} ประเภทสินค้า
 * @property {string} "ขนาดสินค้า (cm.)"
 * @property {string} finishing
 * @property {string} "finishing อื่นๆ"
 * @property {string} รูปภาพ
 * @property {string} "โมเดล 3D"
 * @property {string} สินค้าสีอื่น   ← รหัสสินค้า variant อื่น คั่นด้วย ", "
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map(clean);

  return lines
    .slice(1)
    .map((line) => {
      const values = splitLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = clean(values[i] ?? "");
      });
      return obj;
    })
    .filter((p) => p["ชื่อสินค้า"] || p["รหัสสินค้า"]); // กรองแถวว่าง
}

/** แยก CSV line โดยรองรับ quoted fields */
function splitLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

/** ตัด whitespace และ BOM */
function clean(str) {
  return (str ?? "").replace(/^\uFEFF/, "").trim();
}