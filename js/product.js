/**
 * product.js
 * ==========
 * Logic สำหรับหน้า product.html (แนวทาง B: 1 row ต่อ 1 สินค้า)
 *
 * URL params:
 *   ?group=dhana|dm   → เลือก sheet
 *   ?code=L16-2156    → รหัสสินค้า → ดึง row เดียว
 *
 * swatch ต่างสี = link ไปหน้าใหม่ ?code=[รหัสจากคอลัมน์ "สินค้าสีอื่น"]
 * ไม่มี ?finishing= อีกต่อไป
 */

import { loadProducts, findByCode, getAllVariants, getParam } from "./sheets.js";

const group = getParam("group") || "dhana";
const code  = getParam("code")  || "";

// ── โหลดข้อมูล ────────────────────────────────────────────────────────────────
loadProducts(group)
  .then((products) => {

    // ดึง row ของสินค้าตัวนี้ (1 row เท่านั้น)
    const current = findByCode(products, code);
    if (!current) {
      document.body.innerHTML += "<p style='padding:2rem'>[ไม่พบสินค้า รหัส: " + code + "]</p>";
      return;
    }

    // ดึง variant ทั้งหมด: [current] + สินค้าที่ระบุใน "สินค้าสีอื่น"
    const variants = getAllVariants(products, current);

    renderProduct(current, variants);
  })
  .catch((err) => {
    console.error("product.js error:", err);
  });

// ─── render หลัก ──────────────────────────────────────────────────────────────

function renderProduct(row, variants) {
  // ── title / ชื่อ / รหัส ──
  document.title = `${row["ชื่อสินค้า"]} ${row["รหัสสินค้า"]} — Product Catalog`;
  document.getElementById("js-productName").textContent = row["ชื่อสินค้า"];
  document.getElementById("js-productSize").textContent = row["size"];
  document.getElementById("js-productCode").textContent = row["รหัสสินค้า"];

  // ── ตาราง size/ขนาด (แถวเดียว เพราะ 1 row = 1 สินค้า) ──
  const tbody = document.getElementById("js-sizeTableBody");
  tbody.innerHTML = `
    <tr>
      <td>${row["size"] || "—"}</td>
      <td>${row["ขนาดสินค้า (cm.)"] || "—"}</td>
    </tr>
  `;

  // ── Dimensions ──
  const dims = parseDimensions(row["ขนาดสินค้า (cm.)"]);
  document.getElementById("js-dimWidth").textContent  = dims[0] ?? "—";
  document.getElementById("js-dimDepth").textContent  = dims[1] ?? "—";
  document.getElementById("js-dimHeight").textContent = dims[2] ?? "—";

  // ── Gallery ──
  renderGallery(row);

  // ── Swatches ──
  renderSwatches(row, variants);
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function renderGallery(row) {
  const thumbStrip = document.getElementById("js-thumbStrip");
  const mainImage  = document.getElementById("js-mainImage");
  const mainWrap   = document.getElementById("js-mainImageWrap");
  const modelWrap  = document.getElementById("js-modelWrap");

  // รูปภาพ: หลาย URL คั่นด้วย comma ได้
  const imageUrls = row["รูปภาพ"]
    ? row["รูปภาพ"].split(",").map((u) => u.trim()).filter(Boolean)
    : [];

  const model3dUrl = (row["โมเดล 3D"] || "").trim();

  thumbStrip.innerHTML = "";

  // ── thumb รูปภาพ ──
  imageUrls.forEach((url, i) => {
    const btn = document.createElement("button");
    btn.className = "thumb" + (i === 0 ? " thumb--active" : "");
    btn.innerHTML = `<img src="${url}" alt="มุมมอง ${i + 1}" loading="lazy" />`;
    btn.addEventListener("click", () => switchToImage(url, btn));
    thumbStrip.appendChild(btn);
  });

  // ตั้ง main image เป็นรูปแรก
  if (imageUrls.length > 0) {
    mainImage.src = imageUrls[0];
    mainImage.alt = document.getElementById("js-productName").textContent;
  } else {
    mainWrap.innerHTML = "<div class='no-image'>[ไม่มีรูปภาพ]</div>";
  }

  // ── thumb 3D ──
  if (model3dUrl) {
    const btn3d = document.createElement("button");
    btn3d.className = "thumb thumb--3d";
    btn3d.innerHTML = `<span class="thumb__label">360°</span>`;
    btn3d.addEventListener("click", () => switchToModel(model3dUrl, btn3d));
    thumbStrip.appendChild(btn3d);
  }

  // ── helper functions ──

  function switchToImage(url, btn) {
    mainImage.src = url;
    mainWrap.classList.remove("hidden");
    modelWrap.classList.add("hidden");
    setActiveThumb(btn);
  }

  function switchToModel(url, btn) {
    // Sketchfab → iframe | ไฟล์ .glb/.gltf → model-viewer
    if (url.includes("sketchfab.com")) {
      modelWrap.innerHTML = `
        <iframe
          src="${url}"
          frameborder="0"
          allowfullscreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          style="width:100%;height:100%;"
        ></iframe>`;
    } else {
      modelWrap.innerHTML = `
        <model-viewer
          src="${url}"
          alt="3D model"
          auto-rotate
          camera-controls
          style="width:100%;height:100%;"
        ></model-viewer>`;
    }
    mainWrap.classList.add("hidden");
    modelWrap.classList.remove("hidden");
    setActiveThumb(btn);
  }

  function setActiveThumb(activeBtn) {
    thumbStrip.querySelectorAll(".thumb").forEach((b) =>
      b.classList.remove("thumb--active")
    );
    activeBtn.classList.add("thumb--active");
  }
}

// ─── Swatches ─────────────────────────────────────────────────────────────────

function renderSwatches(currentRow, variants) {
  const swatchList   = document.getElementById("js-swatchList");
  const countEl      = document.getElementById("js-finishingCount");
  const otherSection = document.getElementById("js-finishingOther");
  const otherValueEl = otherSection.querySelector(".finishing-other__value");

  swatchList.innerHTML = "";

  variants.forEach((v) => {
    const isCurrent = v["รหัสสินค้า"] === currentRow["รหัสสินค้า"];

    // URL ของหน้าสินค้านั้น
    const href = `product.html?group=${encodeURIComponent(group)}&code=${encodeURIComponent(v["รหัสสินค้า"])}`;

    const a = document.createElement("a");
    a.className = "swatch" + (isCurrent ? " swatch--active" : "");
    a.title = `${v["ชื่อสินค้า"]} — ${v["finishing"] || v["รหัสสินค้า"]}`;

    // ถ้าเป็น swatch ตัวปัจจุบัน → ไม่ต้องให้คลิกออกไปหน้าอื่น
    if (isCurrent) {
      a.setAttribute("aria-current", "true");
      a.setAttribute("href", "#");
      a.addEventListener("click", (e) => e.preventDefault());
    } else {
      a.href = href;
    }

    // รูป swatch = รูปภาพแรกของสินค้า variant นั้น
    const swatchImg = v["รูปภาพ"]?.split(",")[0]?.trim() || "";
    const finLabel  = v["finishing"] || v["รหัสสินค้า"];

    a.innerHTML = swatchImg
      ? `<img src="${swatchImg}" alt="${finLabel}" /><span class="swatch__code">${finLabel}</span>`
      : `<span class="swatch__code">${finLabel}</span>`;

    swatchList.appendChild(a);
  });

  // จำนวน variants ทั้งหมด
  countEl.textContent = variants.length > 1 ? `${variants.length} options` : "";

  // finishing อื่นๆ (ช่องหมายเหตุ)
  const other = (currentRow["finishing อื่นๆ"] || "").trim();
  if (other) {
    otherValueEl.textContent = other;
    otherSection.classList.remove("hidden");
  } else {
    otherSection.classList.add("hidden");
  }
}

// ─── helper ───────────────────────────────────────────────────────────────────

/** Parse "14.00x17.00x33.00" → ["14.00", "17.00", "33.00"] */
function parseDimensions(str) {
  if (!str) return [];
  return str.split(/[xX×*]/).map((s) => s.trim());
}
