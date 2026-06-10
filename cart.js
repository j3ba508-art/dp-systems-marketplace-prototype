// cart.js - Handles the shopping cart UI and interactions

import { supabase } from "./supabase-loader.js";
import { showToast, enableMobileKeyboardScrollFix } from "./ui.js";
import {
  loadBuyerByCode,
  checkout,
  resetBuyerUI,
  currentBuyer,
  codeLookupActive,
} from "./checkout.js";

// ---------- Toast Throttle ----------
let lastStockToastAt = 0;
let stockToastVisible = false;

function showStockLimitToast(message) {
  const now = Date.now();

  if (stockToastVisible || now - lastStockToastAt < 1500) {
    return;
  }

  stockToastVisible = true;
  lastStockToastAt = now;

  showToast(message);

  setTimeout(() => {
    stockToastVisible = false;
  }, 2200);
}

// ---------- Cart Validation ----------
function sanitizeLocalCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let changed = false;
  let hadStockAdjustment = false;

  cart = cart
    .map((item) => {
      const stock = Number(item.stock_quantity) || 0;
      let qty = Number(item.qty);

      if (stock <= 0) {
        changed = true;
        hadStockAdjustment = true;
        return null;
      }

      if (!Number.isFinite(qty) || qty < 1) {
        qty = 1;
        changed = true;
      }

      if (qty > stock) {
        qty = stock;
        changed = true;
        hadStockAdjustment = true;
      }

      return {
        ...item,
        qty,
      };
    })
    .filter(Boolean);

  if (changed) {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  if (hadStockAdjustment) {
    showStockLimitToast("Your cart was updated based on available stock.");
  }

  return cart;
}

// --- Validate cart items against Supabase records ----------
async function syncCartWithCurrentProducts() {
  let cart = sanitizeLocalCart();

  if (cart.length === 0) {
    return cart;
  }

  const productIds = cart.map((item) => item.id).filter(Boolean);

  if (productIds.length === 0) {
    localStorage.removeItem("cart");
    return [];
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, image_url, stock_quantity, is_active, seller_id")
    .in("id", productIds);

  if (error) {
    console.error("Cart stock sync failed:", error);
    showStockLimitToast("Could not verify current stock. Please try again.");
    return cart;
  }

  const productMap = new Map(
    (products || []).map((product) => [String(product.id), product]),
  );

  let changed = false;
  let hadStockAdjustment = false;

  const syncedCart = cart
    .map((item) => {
      const product = productMap.get(String(item.id));

      if (!product) {
        changed = true;
        hadStockAdjustment = true;
        return null;
      }

      const stock = Number(product.stock_quantity) || 0;
      let qty = Number(item.qty);

      if (product.is_active !== true || stock <= 0) {
        changed = true;
        hadStockAdjustment = true;
        return null;
      }

      if (!Number.isFinite(qty) || qty < 1) {
        qty = 1;
        changed = true;
      }

      if (qty > stock) {
        qty = stock;
        changed = true;
        hadStockAdjustment = true;
      }

      return {
        ...item,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock_quantity: stock,
        is_active: product.is_active,
        seller_id: product.seller_id,
        qty,
      };
    })
    .filter(Boolean);

  if (changed) {
    localStorage.setItem("cart", JSON.stringify(syncedCart));
  }

  if (hadStockAdjustment) {
    showStockLimitToast("Your cart was updated based on current stock.");
  }

  return syncedCart;
}

// ---------- Render Validated Cart ----------
function renderCart() {
  const container = document.getElementById("cart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!container) return;

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  container.innerHTML = "";
  let grandTotal = 0;

  cart.forEach((item, index) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    grandTotal += price * qty;

    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
            <div class="item-info">
                <strong>${item.name}</strong><br>
                <small>₱${item.price.toLocaleString()}</small>
            </div>
            <div class="cart-controls">
                <button class="qty-btn minus" onclick="updateQty(${index}, -1)">-</button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn plus" onclick="updateQty(${index}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${index})">X</button>
            </div>
        `;
    container.appendChild(row);
  });

  if (checkoutBtn) {
    checkoutBtn.innerText = `Place Order (₱${grandTotal.toLocaleString()})`;
  }
}

function updateInterface() {
  const cart = sanitizeLocalCart();
  renderCart();
  const container = document.getElementById("cart");
  const buyerBox = document.getElementById("buyerBox");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (cart.length === 0) {
    // 1. Show the centered empty state (The one with the emoji 😉)
    container.innerHTML = `
      <div class="empty-state-container">
          <p style="font-weight: bold; color: #555;">Nothing to see here.</p>
          <p style="font-weight: bold; color: #555;">Pick some charms to get started.</p>
          <button id="backToShopBtn" class="btn-primary" onclick="window.location.href='mp.html'">
              BACK TO SHOP
          </button>
          <div style="font-size: 40px; margin-top: 15px;">😉</div>
      </div>
    `;

    // 2. Ghost the Buyer Information
    if (buyerBox) {
      buyerBox.style.opacity = "0.3";
      buyerBox.style.pointerEvents = "none";
      buyerBox.style.filter = "grayscale(100%)";
    }

    // 3. Reset the Order Button
    if (checkoutBtn) {
      checkoutBtn.innerText = "Place Order (₱0.00)";
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = "0.5";
    }

    // 4. Shift Focus
    setTimeout(() => {
      const shopBtn = document.getElementById("backToShopBtn");
      if (shopBtn) shopBtn.focus();
    }, 100);
  } else {
    // 5. If NOT empty, Restore the UI and render the items
    if (buyerBox) {
      buyerBox.style.opacity = "1";
      buyerBox.style.pointerEvents = "auto";
      buyerBox.style.filter = "none";
    }
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = "1";
    }
    // renderCart();
  }
}

window.updateInterface = updateInterface;

// Change quantity
window.updateQty = (index, change) => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const item = cart[index];

  if (!item) return;

  const currentQty = Number(item.qty) || 0;
  const stock = Number(item.stock_quantity) || 0;
  const nextQty = currentQty + change;

  // Minus behavior: remove item if buyer goes below 1
  if (nextQty <= 0) {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateInterface();
    return;
  }

  // Plus behavior: block quantity above known stock
  if (change > 0 && nextQty > stock) {
    showStockLimitToast(
      `Only ${stock} available, and it is already in your cart.`,
    );
    return;
  }

  item.qty = nextQty;

  localStorage.setItem("cart", JSON.stringify(cart));
  updateInterface();
};

// Remove item
window.removeFromCart = (index) => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateInterface();
};

function saveAndRefresh(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

export function clearCartUI() {
  localStorage.removeItem("cart");
  updateInterface(); // refresh UI to show an empty cart
}

// ---------- Initialization ----------
async function init() {
  // 1. Sync cart first, then render cart UI
  await syncCartWithCurrentProducts();
  updateInterface();

  // 2. Enable mobile landscape keyboard scroll helper
  // enableMobileKeyboardScrollFix();

  // 3. Attach checkout button
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.onclick = checkout;
  }

  // 4. Get buyer code input before using it
  const codeInput = document.getElementById("buyerCodeInput");

  if (!codeInput) {
    console.error("buyerCodeInput not found.");
    return;
  }

  // 5. Restore remembered buyer code silently
  const saved = localStorage.getItem("buyer_code");

  if (saved) {
    codeInput.value = saved;

    const buyerFound = await loadBuyerByCode(saved, { silent: true });

    if (!buyerFound) {
      localStorage.removeItem("buyer_code");
      codeInput.value = "";
      resetBuyerUI();
    }
  } else {
    resetBuyerUI();
  }

  // 6. Attach buyer code listeners always, whether saved code exists or not
  codeInput.addEventListener("input", () => {
    if (codeInput.value.trim() === "") {
      localStorage.removeItem("buyer_code");
      resetBuyerUI();
    }
  });

  codeInput.addEventListener("blur", async () => {
    const code = codeInput.value.trim();

    if (code && (!currentBuyer || currentBuyer.buyer_code !== code)) {
      await loadBuyerByCode(code);
    }
  });
}

// Ensure init runs after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else window.onload = init;

// Expose functions to the HTML scope
window.loadBuyerByCode = loadBuyerByCode;
window.checkout = checkout;
window.resetBuyerUI = resetBuyerUI;
window.clearCartUI = clearCartUI;
