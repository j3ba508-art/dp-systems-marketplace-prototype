import { supabase } from "./supabaseClient.js";
import { initProductOverlay, openProductOverlay } from "./productOverlay.js";

console.log("🔥 products.js LOADED");

const IS_DEV_MODE = false;
const MOCK_SELLER_ID = "e46d0f68-6b7d-49b1-9caa-21e158bcbf72";

let currentSellerId = null;
let cachedProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔥 DOM READY");
  const sellerId = await getSellerId();
  currentSellerId = sellerId;

  initProductOverlay(sellerId);
  initGridClickHandler();
  loadSellerProducts(sellerId);
});

async function getSellerId() {
  if (IS_DEV_MODE) return MOCK_SELLER_ID;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    window.location.href = "seller-login.html";
    return;
  }

  return user.id;
}

async function loadSellerProducts() {
  console.log("🔥 loadSellerProducts RUNNING");
  const grid = document.getElementById("productGrid");
  const counter = document.getElementById("product-count");

  grid.innerHTML = "Loading...";

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", currentSellerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    grid.innerHTML = "Error loading products";
    return;
  }

  counter.innerText = data.length;

  cachedProducts = data;

  console.table(
    data.map((p, index) => ({
      index,
      name: p.name,
      created_at: p.created_at,
      id: p.id,
    })),
  );

  renderGrid(data);
}

function renderGrid(products) {
  const grid = document.getElementById("productGrid");

  grid.innerHTML = products
    .map((p) => {
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(p.image_url);

      return `
        <div class="product-card" data-id="${p.id}">
          <img src="${data.publicUrl}" />
          <div class="info">
            <h3>${p.name}</h3>
            <p>₱${p.price}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

/* ---------------- EVENTS ---------------- */

function initGridClickHandler() {
  document.getElementById("productGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;

    const id = card.dataset.id;
    const product = cachedProducts.find((p) => p.id === id);

    openProductOverlay("edit", product);
  });
}
