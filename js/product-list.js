/**
 * product-list.js
 * ===============
 * Logic สำหรับหน้า product-list.html
 * อ่าน ?group= และ ?type= → กรองสินค้า → render grid + table → จัดการ toggle
 */

import { loadProducts, filterByType, getParam } from "./sheets.js";

const group = getParam("group") || "dhana";
const type  = getParam("type")  || "";
const groupLabel = { dhana: "Dhana", dm: "DM" };

// ── อัพเดต UI ทันที ──────────────────────────────────────────────────────────
const groupLink   = document.getElementById("js-groupLink");
const typeLabel   = document.getElementById("js-typeLabel");
const listHeading = document.getElementById("js-listHeading");
const backBtn     = document.getElementById("js-backBtn");

groupLink.textContent = groupLabel[group] ?? group;
groupLink.href        = `category.html?group=${encodeURIComponent(group)}`;
typeLabel.textContent = type;
listHeading.textContent = type;
backBtn.href          = `category.html?group=${encodeURIComponent(group)}`;
document.title        = `${type} — ${groupLabel[group] ?? group}`;

// ── View Toggle ──────────────────────────────────────────────────────────────
const productGrid  = document.getElementById("js-productGrid");
const productTable = document.getElementById("js-productTable");
const btnGrid      = document.getElementById("btn-grid");
const btnList      = document.getElementById("btn-list");

btnGrid.addEventListener("click", () => setView("grid"));
btnList.addEventListener("click", () => setView("list"));

function setView(view) {
  const isGrid = view === "grid";
  productGrid.classList.toggle("hidden", !isGrid);
  productTable.classList.toggle("hidden", isGrid);
  btnGrid.classList.toggle("view-toggle__btn--active", isGrid);
  btnList.classList.toggle("view-toggle__btn--active", !isGrid);
  btnGrid.setAttribute("aria-pressed", isGrid);
  btnList.setAttribute("aria-pressed", !isGrid);
}

// ── โหลดและ render ────────────────────────────────────────────────────────────
const loading = document.getElementById("js-loading");
const emptyEl = document.getElementById("js-empty");
const errEl   = document.getElementById("js-error");
const tbody   = document.getElementById("js-productTableBody");

showLoading(true);

loadProducts(group)
  .then((products) => {
    showLoading(false);

    const items = filterByType(products, type);

    if (items.length === 0) {
      emptyEl.classList.remove("hidden");
      return;
    }

    // ล้าง mock HTML
    productGrid.innerHTML = "";
    tbody.innerHTML = "";

    items.forEach((p) => {
      productGrid.appendChild(makeGridCard(group, p));
      tbody.appendChild(makeTableRow(group, p));
    });

    // คลิก row ทั้งแถว
    tbody.querySelectorAll(".product-row").forEach((row) => {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => {
        window.location.href = row.dataset.href;
      });
    });

    // ── Search ──
    document.getElementById("js-searchInput")
      .addEventListener("input", function () {
        filterBySearch(this.value);
      });
    
  })
  .catch((err) => {
    showLoading(false);
    console.error(err);
    errEl.classList.remove("hidden");
  });

// ─── helpers ─────────────────────────────────────────────────────────────────

/** สร้าง URL ไปหน้า product โดยใช้ รหัสสินค้า เป็น key */
function productUrl(group, p) {
  return `product.html?group=${encodeURIComponent(group)}&code=${encodeURIComponent(p["รหัสสินค้า"])}`;
}

function makeGridCard(group, p) {
  const a = document.createElement("a");
  a.className = "product-card";
  a.href = productUrl(group, p);

  const imgSrc = parseFirstImage(p["รูปภาพ"]);
  const imgHtml = imgSrc
    ? `<img class="product-card__image" src="${imgSrc}" alt="${p["ชื่อสินค้า"]}" loading="lazy" />`
    : `<div class="product-card__no-image">[ไม่มีรูปภาพ]</div>`;

  a.innerHTML = `
    <div class="product-card__image-wrap">${imgHtml}</div>
    <div class="product-card__info">
      <span class="product-card__code">${p["รหัสสินค้า"]}${p["size"] ? " · " + p["size"] : ""}</span>
      <h3 class="product-card__name">${p["ชื่อสินค้า"]}</h3>
      ${p["finishing"] ? `<span class="product-card__finishing">${p["finishing"]}</span>` : ""}
    </div>
  `;
  return a;
}

function makeTableRow(group, p) {
  const tr = document.createElement("tr");
  tr.className = "product-row";
  tr.dataset.href = productUrl(group, p);

  const imgSrc = p["รูปภาพ"];
  const has3D  = !!p["โมเดล 3D"];

  tr.innerHTML = `
    <td class="col-thumb">
      ${imgSrc ? `<img src="${imgSrc}" alt="${p["ชื่อสินค้า"]}" />` : "[ไม่มีรูป]"}
    </td>
    <td class="col-name">${p["ชื่อสินค้า"]}</td>
    <td class="col-code">${p["รหัสสินค้า"]}</td>
    <td class="col-size">${p["size"]}</td>
    <td class="col-type">${p["ประเภทสินค้า"]}</td>
    <td class="col-dim">${p["ขนาดสินค้า (cm.)"]}</td>
    <td class="col-finish">${p["finishing"]}</td>
  `;
  return tr;
}

function showLoading(show) {
  loading.classList.toggle("hidden", show === false);
  productGrid.classList.toggle("hidden", show);
}

function filterBySearch(query) {
  const q = query.trim().toLowerCase();

  // กรอง grid cards
  productGrid.querySelectorAll(".product-card").forEach((card) => {
    const name = (card.querySelector(".product-card__name")?.textContent || "").toLowerCase();
    const code = (card.querySelector(".product-card__code")?.textContent || "").toLowerCase();
    card.style.display = (!q || name.includes(q) || code.includes(q)) ? "" : "none";
  });

  // กรอง table rows
  tbody.querySelectorAll(".product-row").forEach((row) => {
    const name = (row.querySelector(".col-name")?.textContent || "").toLowerCase();
    const code = (row.querySelector(".col-code")?.textContent || "").toLowerCase();
    row.style.display = (!q || name.includes(q) || code.includes(q)) ? "" : "none";
  });
}
