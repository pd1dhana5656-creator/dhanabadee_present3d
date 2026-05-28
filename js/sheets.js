/**
 * sheets.js
 * =========
 * Helper โหลดและ parse ข้อมูลจาก Google Sheets (Published CSV)
 *
 * Schema คอลัมน์ (ทั้ง sheet "dhana" และ "dm"):
 *   A: date
 *   B: ชื่อสินค้า
 *   C: รหัสสินค้า  ← รูปแบบ "25-864_SF8"
 *                    ส่วนหน้า _ = base code (25-864)
 *                    ส่วนหลัง _ = finishing code (SF8)
 *                    ถ้าไม่มี _ = สินค้าไม่มี variant สี
 *   D: size
 *   E: ประเภทสินค้า
 *   F: ขนาดสินค้า (cm.)
 *   G: finishing
 *   H: รูปภาพ       ← URL จาก Google Drive / imgbb (หลาย URL คั่นด้วย , ได้)
 *   I: โมเดล 3D    ← URL .glb หรือ Sketchfab embed URL
 */

const SHEET_URLS = {
  dhana: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3BasR4S6QzfdPX_X9pMjEazvTIjhde22mhw0ofbFXCGUVQ9j82J_-_zF2fiLYyKAuMEMDgvpt1j2X/pub?gid=0&single=true&output=csv",
  dm:    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3BasR4S6QzfdPX_X9pMjEazvTIjhde22mhw0ofbFXCGUVQ9j82J_-_zF2fiLYyKAuMEMDgvpt1j2X/pub?gid=1123707719&single=true&output=csv",
};

const _cache = {};

// ─── Public API ────────────────────────────────────────────────────────────────

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

/** ดึง unique ประเภทสินค้า (สำหรับหน้า category) */
export function getTypes(products) {
  return [...new Set(products.map((p) => p["ประเภทสินค้า"]).filter(Boolean))];
}

/** กรองสินค้าตาม ประเภทสินค้า */
export function filterByType(products, type) {
  return products.filter(
    (p) => (p["ประเภทสินค้า"] || "").toLowerCase() === type.toLowerCase()
  );
}

/** หาสินค้า 1 row ตาม รหัสสินค้า */
export function findByCode(products, code) {
  return products.find(
    (p) => (p["รหัสสินค้า"] || "").trim() === (code || "").trim()
  );
}

/**
 * แยก รหัสสินค้า ออกเป็น base code และ finishing code
 * "25-864_SF8" → { base: "25-864", finishing: "SF8" }
 * "25-864"     → { base: "25-864", finishing: "" }
 */
export function splitCode(code) {
  const str = (code || "").trim();
  const idx = str.lastIndexOf("_");
  if (idx === -1) return { base: str, finishing: "" };
  return {
    base:      str.slice(0, idx),
    finishing: str.slice(idx + 1),
  };
}

/**
 * ดึง variant ทั้งหมดที่มี base code เดียวกัน (รวมตัวปัจจุบัน)
 * เช่น "25-864_SF8", "25-864_WD10", "25-864_SN9" จะถูกจัดกลุ่มด้วยกัน
 */
export function getAllVariants(products, current) {
  const { base } = splitCode(current["รหัสสินค้า"]);
  if (!base) return [current];

  return products.filter((p) => {
    const { base: b } = splitCode(p["รหัสสินค้า"]);
    return b === base;
  });
}

/** อ่าน query parameter จาก URL */
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function parseCSV(csvText) {
  // ใช้ regex เดียวกับโปรเจคก่อนหน้า:
  // ตัด row โดยไม่ตัด newline ที่อยู่ใน quoted field
  const rows = csvText.trim().split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  if (rows.length < 2) return [];

  const headers = splitRow(rows[0]).map(clean);

  return rows
    .slice(1)
    .map((row) => {
      const values = splitRow(row);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = clean(values[i] ?? ""); });
      return obj;
    })
    .filter((p) => p["ชื่อสินค้า"] || p["รหัสสินค้า"]);
}

// ตัด column โดยไม่ตัด comma ที่อยู่ใน quoted field
function splitRow(row) {
  return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
}

function clean(str) {
  // ลบ BOM, ลบ quote รอบนอก, แปลง "" → " ภายใน, trim
  let s = (str ?? "").replace(/^\uFEFF/, "").trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  return s.trim();
}
