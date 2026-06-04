// mp.js - Marketplace Page (with toast & working Add to Cart)

import { supabase } from "./supabase-loader.js";
import { showToast } from "./ui.js";

/* ---------- Supabase Test ----------
async function testSupabase() {
  const { data, error } = await supabase
    .from('products')
    .select('*');

  window.products = data || [];
}
testSupabase();
*/

// ---------- Helpers ----------
function imgOrFallback(fileName) {
  if (!fileName) return "https://via.placeholder.com/150";
  return `https://uomfboryzwfnubvgabyg.supabase.co/storage/v1/object/public/product-images/${fileName}`;
}

function getRatingSummary(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      count: 0,
      average: 0,
      stars: "",
    };
  }

  const total = reviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0,
  );

  const average = total / reviews.length;
  const rounded = Math.round(average);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

  return {
    count: reviews.length,
    average,
    stars,
  };
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // CHANGE: Use .length to count items, not .reduce for quantities
  const uniqueItemCount = cart.length;

  const badge =
    document.querySelector(".cart-fab span") ||
    document.getElementById("cartCount");

  if (badge) {
    badge.innerText = uniqueItemCount;
    badge.style.display = uniqueItemCount > 0 ? "flex" : "none";
  }
}
// ---------- Products ----------
async function renderProducts() {
  const container = document.getElementById("productList");
  if (!container) return;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = "Failed to load products";
    console.error(error);
    return;
  }

  window.products = data || [];
  if (window.products.length === 0) {
    container.innerHTML = "<p>No available products right now.</p>";
    return;
  }

  const { data: approvedReviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("product_id, rating, comment, buyer_name, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (reviewsError) {
    console.error("Approved reviews fetch error:", reviewsError);
  }

  const reviewsByProductId = {};

  (approvedReviews || []).forEach((review) => {
    if (!reviewsByProductId[review.product_id]) {
      reviewsByProductId[review.product_id] = [];
    }

    reviewsByProductId[review.product_id].push(review);
  });

  container.innerHTML = "";

  window.products.forEach((p) => {
    const productReviews = reviewsByProductId[p.id] || [];
    const ratingSummary = getRatingSummary(productReviews);

    const ratingHtml =
      ratingSummary.count > 0
        ? `
          <div class="product-rating">
            <span class="rating-stars">${ratingSummary.stars}</span>
            <span class="rating-summary">
              ${ratingSummary.average.toFixed(1)} / 5 · ${ratingSummary.count}
              review${ratingSummary.count === 1 ? "" : "s"}
            </span>
          </div>
        `
        : `
          <div class="product-rating">
            <span class="rating-empty">No reviews yet</span>
          </div>
        `;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${imgOrFallback(p.image_url)}">
      <h4>${p.name}</h4>
      <p>₱${p.price}</p>
      ${ratingHtml}
      <button class="add-btn" data-id="${p.id}">Add to Cart</button>
    `;
    container.appendChild(div);
  });

  // Attach button events after rendering
  container.querySelectorAll("button.add-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const product = window.products.find((p) => String(p.id) === String(id));
      addToCart(product);
    });
  });
}

// ---------- Add to Cart ----------
function addToCart(product) {
  if (!product) {
    showToast("Product not found.");
    return;
  }

  if (!product.is_active || Number(product.stock_quantity) <= 0) {
    showToast("This product is currently unavailable.");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    const currentQty = Number(existing.qty) || 0;
    const availableStock = Number(product.stock_quantity) || 0;

    if (currentQty >= availableStock) {
      existing.stock_quantity = availableStock;
      existing.is_active = product.is_active;
      existing.price = product.price;
      existing.name = product.name;
      existing.image_url = product.image_url;
      existing.seller_id = product.seller_id;

      localStorage.setItem("cart", JSON.stringify(cart));

      showToast(
        `Only ${availableStock} available, and that quantity is already in your cart.`,
      );
      return;
    }

    existing.qty = currentQty + 1;
    existing.stock_quantity = availableStock;
    existing.is_active = product.is_active;
    existing.price = product.price;
    existing.name = product.name;
    existing.image_url = product.image_url;
    existing.seller_id = product.seller_id;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  // Update Badge
  updateCartBadge();

  // Bounce Effect
  const fab = document.querySelector(".cart-fab");
  fab.style.animation = "none";
  fab.offsetHeight; // trigger reflow
  fab.style.animation = "bounce 0.5s ease";

  showToast(`${product.name} added to tray! 💖`);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge(); // ✅ badge correct on load
  renderProducts();
});
