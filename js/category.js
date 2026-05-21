/**
 * category.js
 * ===========
 * Logic สำหรับหน้า category.html
 * อ่าน ?group= → โหลด CSV → ดึง unique ประเภทสินค้า → render type-card
 */

import { loadProducts, getTypes, getParam } from "./sheets.js";

const group = getParam("group") || "dhana"; // "dhana" | "dm"
const groupLabel = { dhana: "Dhana", dm: "DM" };

// ── อัพเดต UI ก่อนโหลดข้อมูล ──────────────────────────────────────────────────
document.getElementById("js-groupLabel").textContent = groupLabel[group] ?? group;
document.getElementById("js-categoryHeading").textContent = groupLabel[group] ?? group;
// อัพเดต link ใน breadcrumb (ถ้าต้องการ)
document.title = `${groupLabel[group] ?? group} — Product Catalog`;

// ── โหลดและ render ──────────────────────────────────────────────────────────────
const grid    = document.getElementById("js-typeGrid");
const loading = document.getElementById("js-loading");
const errEl   = document.getElementById("js-error");

showLoading(true);

loadProducts(group)
  .then((products) => {
    showLoading(false);

    const types = getTypes(products);
    if (types.length === 0) {
      grid.innerHTML = "<p>[ไม่พบประเภทสินค้า]</p>";
      return;
    }

    // ล้าง mock HTML แล้ว render จริง
    grid.innerHTML = "";
    types.forEach((type) => {
      const card = makeTypeCard(group, type);
      grid.appendChild(card);
    });
  })
  .catch((err) => {
    showLoading(false);
    console.error(err);
    errEl.classList.remove("hidden");
  });

// ─── helpers ────────────────────────────────────────────────────────────────────

function makeTypeCard(group, type) {
  const a = document.createElement("a");
  a.className = "type-card";
  a.href = `product-list.html?group=${encodeURIComponent(group)}&type=${encodeURIComponent(type)}`;
  a.innerHTML = `
    <div class="type-card__icon-area">
      <div class="type-card__placeholder-img">[${type}]</div>
    </div>
    <span class="type-card__label">${type}</span>
  `;
  return a;
}

function showLoading(show) {
  loading.classList.toggle("hidden", !show);
  grid.classList.toggle("hidden", show);
}
