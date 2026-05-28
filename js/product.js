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

function parseImageUrls(cell) {
  const raw = (cell || "").trim();
  if (!raw) return [];
  if (raw.includes("<img")) {
    const matches = [...raw.matchAll(/src=["']([^"']+)["']/g)];
    return matches.map(m => m[1]).filter(Boolean);
  }
  return raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
}

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

  const imageUrls  = parseImageUrls(row["รูปภาพ"]);
  const model3dUrl = parseModelUrl(row["โมเดล 3D"]);

  // สร้าง media list สำหรับ lightbox
  // รูปภาพก่อน ตามด้วย 3D (ถ้ามี)
  const mediaList = [
    ...imageUrls.map(url => ({ type: "image", src: url })),
    ...(model3dUrl ? [{ type: "model", src: model3dUrl }] : [])
  ];

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
    // คลิกรูปใหญ่ → เปิด lightbox ที่รูปปัจจุบัน
    mainImage.style.cursor = "zoom-in";
    mainImage.onclick = () => {
      const idx = mediaList.findIndex(m => m.src === mainImage.src);
      openLightbox(mediaList, idx >= 0 ? idx : 0);
    };
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

  // init lightbox
  initLightbox(mediaList);

  function switchToImage(url, btn) {
    mainImage.src = url;
    mainWrap.classList.remove("hidden");
    modelWrap.classList.add("hidden");
    setActive(btn);
  }

  function switchToModel(url, btn) {
    modelWrap.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
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
  const finLabel = currentRow["finishing"] || finishingCode || "—";
  document.getElementById("js-finishingName").textContent = finLabel;

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

    const imgs = parseImageUrls(v["รูปภาพ"]);
    const imgUrl = imgs[imgs.length - 1] || "";
    a.innerHTML = imgUrl
      ? `<img src="${imgUrl}" alt="${label}" /><span class="swatch__code">${label}</span>`
      : `<div class="swatch__no-img"></div><span class="swatch__code">${label}</span>`;

    swatchList.appendChild(a);
  });
}

// ─── Lightbox ──────────────────────────────────────────────────────────────────

let _media    = [];
let _index    = 0;
let _scale    = 1;
let _tx       = 0;
let _ty       = 0;
let _dragging = false;
let _startX   = 0;
let _startY   = 0;
let _initiated = false;

function initLightbox(mediaList) {
  _media = mediaList;

  // bind events ครั้งเดียว
  if (_initiated) return;
  _initiated = true;

  const lb         = document.getElementById("js-lightbox");
  const lbClose    = document.getElementById("js-lbClose");
  const lbPrev     = document.getElementById("js-lbPrev");
  const lbNext     = document.getElementById("js-lbNext");
  const lbZoomIn   = document.getElementById("js-lbZoomIn");
  const lbZoomOut  = document.getElementById("js-lbZoomOut");
  const lbReset    = document.getElementById("js-lbReset");
  const lbImg      = document.getElementById("js-lbImg");

  lbClose.onclick = closeLightbox;
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });

  lbPrev.onclick = () => openLightbox(_media, _index - 1);
  lbNext.onclick = () => openLightbox(_media, _index + 1);

  lbZoomIn.onclick  = () => applyZoom(0.25);
  lbZoomOut.onclick = () => applyZoom(-0.25);
  lbReset.onclick   = resetZoom;

  // drag
  lbImg.addEventListener("mousedown", (e) => {
    if (_scale <= 1) return;
    _dragging = true;
    _startX = e.clientX - _tx;
    _startY = e.clientY - _ty;
    lbImg.classList.add("dragging");
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!_dragging) return;
    _tx = e.clientX - _startX;
    _ty = e.clientY - _startY;
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    _dragging = false;
    lbImg.classList.remove("dragging");
  });

  // keyboard
  window.addEventListener("keydown", (e) => {
    if (lb.classList.contains("hidden")) return;
    if (e.key === "ArrowLeft")  openLightbox(_media, _index - 1);
    if (e.key === "ArrowRight") openLightbox(_media, _index + 1);
    if (e.key === "Escape")     closeLightbox();
  });
}

function openLightbox(mediaList, index) {
  if (index < 0 || index >= mediaList.length) return;
  _media = mediaList;
  _index = index;

  const lb          = document.getElementById("js-lightbox");
  const lbImgWrap   = document.getElementById("js-lbImgWrap");
  const lbModelWrap = document.getElementById("js-lbModelWrap");
  const lbImg       = document.getElementById("js-lbImg");
  const lbControls  = document.getElementById("js-lbControls");
  const lbPrev      = document.getElementById("js-lbPrev");
  const lbNext      = document.getElementById("js-lbNext");

  resetZoom();
  lb.classList.remove("hidden");

  const item = mediaList[index];

  if (item.type === "image") {
    lbImg.src = item.src;
    lbImgWrap.classList.remove("hidden");
    lbModelWrap.classList.add("hidden");
    lbModelWrap.innerHTML = "";
    lbControls.classList.remove("hidden");
  } else {
    // 3D model — ซ่อน zoom controls
    lbModelWrap.innerHTML = `<iframe src="${item.src}" allowfullscreen></iframe>`;
    lbModelWrap.classList.remove("hidden");
    lbImgWrap.classList.add("hidden");
    lbControls.classList.add("hidden");
  }

  // disable ปุ่มที่ขอบ ไม่วน
  lbPrev.disabled = (index === 0);
  lbNext.disabled = (index === mediaList.length - 1);
}

function closeLightbox() {
  const lb          = document.getElementById("js-lightbox");
  const lbModelWrap = document.getElementById("js-lbModelWrap");
  lb.classList.add("hidden");
  lbModelWrap.innerHTML = "";  // หยุด iframe เมื่อปิด
  resetZoom();
}

function applyZoom(delta) {
  _scale = Math.min(4, Math.max(1, _scale + delta));
  if (_scale === 1) { _tx = 0; _ty = 0; }
  applyTransform();
}

function resetZoom() {
  _scale = 1; _tx = 0; _ty = 0;
  applyTransform();
}

function applyTransform() {
  const img = document.getElementById("js-lbImg");
  if (img) img.style.transform = `translate(${_tx}px, ${_ty}px) scale(${_scale})`;
}
