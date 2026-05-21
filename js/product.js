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
    // ดึง variant ทั้งหมดที่มี base code เดียวกัน (auto จาก _)
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

  // ตาราง size
  document.getElementById("js-sizeTableBody").innerHTML = `
    <tr>
      <td>${row["size"] || "—"}</td>
      <td>${row["ขนาดสินค้า (cm.)"] || "—"}</td>
    </tr>`;

  // Dimensions
  const dims = (row["ขนาดสินค้า (cm.)"] || "").split(/[xX×]/);
  document.getElementById("js-dimWidth").textContent  = dims[0]?.trim() || "—";
  document.getElementById("js-dimDepth").textContent  = dims[1]?.trim() || "—";
  document.getElementById("js-dimHeight").textContent = dims[2]?.trim() || "—";

  renderGallery(row);
  renderFinishing(row, finishing, variants);
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function renderGallery(row) {
  const thumbStrip = document.getElementById("js-thumbStrip");
  const mainImage  = document.getElementById("js-mainImage");
  const mainWrap   = document.getElementById("js-mainImageWrap");
  const modelWrap  = document.getElementById("js-modelWrap");

  const imageUrls  = (row["รูปภาพ"] || "").split(",").map(s => s.trim()).filter(Boolean);
  const model3dUrl = (row["โมเดล 3D"] || "").trim();

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
  // 1) ชื่อ finishing ของสินค้าตัวนี้ (ข้อความ ไม่คลิก)
  //    ใช้คอลัมน์ "finishing" ก่อน ถ้าว่างใช้ finishing code จากรหัส
  const finLabel = currentRow["finishing"] || finishingCode || "—";
  document.getElementById("js-finishingName").textContent = finLabel;

  // 2) variant สีอื่น (เฉพาะ row ที่ไม่ใช่ตัวปัจจุบัน)
  const variantsSection = document.getElementById("js-variantsSection");
  const swatchList      = document.getElementById("js-swatchList");
  const countEl         = document.getElementById("js-finishingCount");

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

    const a = document.createElement("a");
    a.className = "swatch";
    a.href  = href;
    // label = คอลัมน์ finishing → finishing code จากรหัส → ชื่อสินค้า
    const label = v["finishing"] || fin || v["ชื่อสินค้า"] || v["รหัสสินค้า"];
    a.title = label;

    const imgUrl = (v["รูปภาพ"] || "").split(",")[0].trim();
    a.innerHTML = imgUrl
      ? `<img src="${imgUrl}" alt="${label}" /><span class="swatch__code">${label}</span>`
      : `<div class="swatch__no-img"></div><span class="swatch__code">${label}</span>`;

    swatchList.appendChild(a);
  });

  countEl.textContent = `${variants.length} options`;
}
