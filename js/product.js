/**
 * product.js
 * ==========
 * URL params:
 *   ?group=dhana|dm   → เลือก sheet
 *   ?code=25-864_SF8  → รหัสสินค้า (รวม finishing code)
 */

import { loadProducts, findByCode, getAllVariants, splitCode, getParam } from "./sheets.js";

const group = getParam("group") || "dhana";
const code  = getParam("code")  || "";

loadProducts(group)
  .then((products) => {
    const current = findByCode(products, code);
    if (!current) {
      document.body.innerHTML += `<p style="padding:2rem">[ไม่พบสินค้า รหัส: ${code}]</p>`;
      return;
    }
    const variants = getAllVariants(products, current);
    renderProduct(current, variants);
  })
  .catch((err) => console.error("product.js:", err));

// ─── render หลัก ──────────────────────────────────────────────────────────────

function renderProduct(row, variants) {
  const { finishing } = splitCode(row["รหัสสินค้า"]);

  document.title = `${row["ชื่อสินค้า"]} — Product Catalog`;
  document.getElementById("js-productName").textContent = row["ชื่อสินค้า"];
  document.getElementById("js-productSize").textContent = row["size"] || "";
  document.getElementById("js-productCode").textContent = row["รหัสสินค้า"];

  document.getElementById("js-sizeTableBody").innerHTML = `
    <tr>
      <td>${row["size"] || "—"}</td>
      <td>${row["ขนาดสินค้า (cm.)"] || "—"}</td>
    </tr>`;

  const dims = (row["ขนาดสินค้า (cm.)"] || "").split(/[xX×]/);
  document.getElementById("js-dimWidth").textContent  = dims[0]?.trim() || "—";
  document.getElementById("js-dimDepth").textContent  = dims[1]?.trim() || "—";
  document.getElementById("js-dimHeight").textContent = dims[2]?.trim() || "—";

  renderGallery(row);
  renderFinishing(row, finishing, variants);
}

// ─── Embed code parsers ────────────────────────────────────────────────────────

/**
 * รับ cell รูปภาพที่อาจเป็น:
 *   - URL ตรงๆ คั่นด้วย newline: "https://i.ibb.co/xxx.jpg"
 *   - embed code: '<img src="https://i.ibb.co/xxx.jpg" alt="..." />'
 *   - embed หลายรูปต่อกัน: '<img src="url1" ...><img src="url2" ...>'
 * → คืน array of URL
 */
function parseImageUrls(cell) {
  const raw = (cell || "").trim();
  if (!raw) return [];

  if (raw.includes("<img")) {
    // ดึง src ทุกตัวออกจาก embed code
    const matches = [...raw.matchAll(/src=["']([^"']+)["']/g)];
    return matches.map(m => m[1]).filter(Boolean);
  }

  // URL ธรรมดา คั่นด้วย newline
  return raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
}

/**
 * รับ cell โมเดล 3D ที่อาจเป็น:
 *   - URL ตรงๆ: "https://sketchfab.com/models/.../embed"
 *   - embed code: '<iframe src="..." ...></iframe>'
 * → คืน URL string
 */
function parseModelUrl(cell) {
  const raw = (cell || "").trim();
  if (!raw) return "";

  if (raw.includes("<iframe")) {
    const m = raw.match(/src=["']([^"']+)["']/);
    return m ? m[1] : "";
  }

  return raw;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function renderGallery(row) {
  const thumbStrip = document.getElementById("js-thumbStrip");
  const mainImage  = document.getElementById("js-mainImage");
  const mainWrap   = document.getElementById("js-mainImageWrap");
  const modelWrap  = document.getElementById("js-modelWrap");

  console.log("raw รูปภาพ:", row["รูปภาพ"]);
  console.log("raw โมเดล 3D:", row["โมเดล 3D"]);
  const imageUrls  = parseImageUrls(row["รูปภาพ"]);
  const model3dUrl = parseModelUrl(row["โมเดล 3D"]);
  console.log("imageUrls:", imageUrls);
  console.log("model3dUrl:", model3dUrl);

  thumbStrip.innerHTML = "";

  imageUrls.forEach((url, i) => {
    const btn = document.createElement("button");
    btn.className = "thumb" + (i === 0 ? " thumb--active" : "");
    btn.innerHTML = `<img src="${url}" alt="มุมมอง ${i + 1}" loading="lazy" />`;
    btn.addEventListener("click", () => switchToImage(url, btn));
    thumbStrip.appendChild(btn);
  });

  if (imageUrls.length > 0) {
    mainImage.src = imageUrls[0];
    mainImage.alt = document.getElementById("js-productName").textContent;
  } else {
    mainWrap.innerHTML = "<div class='no-image'>[ไม่มีรูปภาพ]</div>";
  }

  if (model3dUrl) {
    const btn3d = document.createElement("button");
    btn3d.className = "thumb thumb--3d";
    btn3d.innerHTML = `<span class="thumb__label">360°</span>`;
    btn3d.addEventListener("click", () => switchToModel(model3dUrl, btn3d));
    thumbStrip.appendChild(btn3d);
  }

  function switchToImage(url, btn) {
    mainImage.src = url;
    mainWrap.classList.remove("hidden");
    modelWrap.classList.add("hidden");
    setActive(btn);
  }

  function switchToModel(url, btn) {
    modelWrap.innerHTML = url.includes("sketchfab.com")
      ? `<iframe src="${url}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`
      : `<model-viewer src="${url}" alt="3D" auto-rotate camera-controls style="width:100%;height:100%;"></model-viewer>`;
    mainWrap.classList.add("hidden");
    modelWrap.classList.remove("hidden");
    setActive(btn);
  }

  function setActive(btn) {
    thumbStrip.querySelectorAll(".thumb").forEach(b => b.classList.remove("thumb--active"));
    btn.classList.add("thumb--active");
  }
}

// ─── Finishing & Variants ──────────────────────────────────────────────────────

function renderFinishing(currentRow, finishingCode, variants) {
  // ชื่อ finishing ของสินค้าตัวนี้ (ข้อความ ไม่คลิก)
  const finLabel = currentRow["finishing"] || finishingCode || "—";
  document.getElementById("js-finishingName").textContent = finLabel;

  // variant สีอื่น (เฉพาะ row ที่ไม่ใช่ตัวปัจจุบัน)
  const variantsSection = document.getElementById("js-variantsSection");
  const swatchList      = document.getElementById("js-swatchList");

  const currentCode = (currentRow["รหัสสินค้า"] || "").trim();
  const others = variants.filter(v => (v["รหัสสินค้า"] || "").trim() !== currentCode);

  if (others.length === 0) {
    variantsSection.classList.add("hidden");
    return;
  }

  variantsSection.classList.remove("hidden");
  swatchList.innerHTML = "";

  others.forEach((v) => {
    const href = `product.html?group=${encodeURIComponent(group)}&code=${encodeURIComponent(v["รหัสสินค้า"])}`;
    const { finishing: fin } = splitCode(v["รหัสสินค้า"]);
    const label = v["finishing"] || fin || v["ชื่อสินค้า"] || v["รหัสสินค้า"];

    const a = document.createElement("a");
    a.className = "swatch";
    a.href  = href;
    a.title = label;

    // ใช้ parseImageUrls เพื่อดึงรูปแรกของ variant นั้น
    const imgs = parseImageUrls(v["รูปภาพ"]);
    const imgUrl = imgs[imgs.length - 1] || "";
    a.innerHTML = imgUrl
      ? `<img src="${imgUrl}" alt="${label}" /><span class="swatch__code">${label}</span>`
      : `<div class="swatch__no-img"></div><span class="swatch__code">${label}</span>`;

    swatchList.appendChild(a);
  });
}
