// checkout.js - Handles buyer lookup, registration, and checkout process

import { supabase } from "./supabase-loader.js";
import { showToast } from "./ui.js";
import { clearCartUI } from "./cart.js";

export let currentBuyer = null; // 'export' allows cart.js to SEE it
export let codeLookupActive = false;

// ---------- Buyer Lookup Logic ----------
export async function loadBuyerByCode(code, options = {}) {
  if (typeof options === "boolean") {
    options = { preserveForm: options };
  }

  const preserveForm = options.preserveForm === true;
  const silent = options.silent === true;

  if (!code) {
    resetBuyerUI();
    return false;
  }

  const box = document.getElementById("buyerBox");

  // REMOVE the glow immediately when a new search starts
  if (box) box.classList.remove("verified");

  codeLookupActive = true;
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .eq("buyer_code", code.trim())
    .maybeSingle();

  codeLookupActive = false;

  if (data) {
    if (!preserveForm) {
      currentBuyer = data;
      document.getElementById("firstName").value = data.first_name || "";
      document.getElementById("lastName").value = data.last_name || "";
      document.getElementById("birthMonth").value = data.birth_month || "";
      document.getElementById("favoriteWord").value = data.favorite_word || "";
      document.getElementById("mobilePhone").value = data.mobile_phone || "";
      document.getElementById("email").value = data.email || "";

      const shippingEl = document.getElementById("shippingAddress");
      const messageEl = document.getElementById("sellerMessage");

      if (shippingEl) shippingEl.value = data.address || "";
      if (messageEl) messageEl.value = data.seller_message || ""; // Match DB column name
    }
    // UI Reactions: Glow and Lock
    const identityFields = [
      "firstName",
      "lastName",
      "birthMonth",
      "favoriteWord",
    ];
    const logisticalFields = [
      "mobilePhone",
      "email",
      "shippingAddress",
      "sellerMessage",
    ];
    const box = document.getElementById("buyerBox");
    if (box) box.classList.add("verified");
    // 1. Identity Fields: Always locked if verified
    identityFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    // 2. Logistical Fields: Always open so verified users can update them
    logisticalFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    currentBuyer = data;
    const verifiedBuyerCode = data.buyer_code || code.trim();

    localStorage.setItem("buyer_code", verifiedBuyerCode);

    const codeInput = document.getElementById("buyerCodeInput");
    if (codeInput) {
      codeInput.value = verifiedBuyerCode;
    }
    showToast(`Welcome back, ${data.first_name}! ✨`);
    return true;
  } else {
    // TRIGGER CONFIRM DIRECTLY IN THE ELSE BLOCK
    resetBuyerUI();

    if (silent) {
      return false;
    }

    const proceedAsNew = confirm(
      `Buyer Code "${code}" not found.\n\nWould you like to register as a new customer instead?`,
    );

    if (proceedAsNew) {
      showToast("Please fill out the form to register.");
      document.getElementById("firstName")?.focus();
    } else {
      resetBuyerUI();
      showToast("Buyer Code not found.");
    }

    return false;
  }
}

function initializeBuyerForm() {
  const fields = [
    "firstName",
    "lastName",
    "favoriteWord",
    "shippingAddress",
    "birthMonth",
    "mobilePhone",
    "email",
    "sellerMessage",
  ];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = false;
      el.value = ""; // Clear any lingering data
    }
  });
  // Explicitly trigger birth month logic/focus here if needed
}
export function resetBuyerUI() {
  const box = document.getElementById("buyerBox");
  if (box) box.classList.remove("verified"); // Remove teal glow

  const allFields = [
    "firstName",
    "lastName",
    "birthMonth",
    "favoriteWord",
    "mobilePhone",
    "email",
    "shippingAddress",
    "sellerMessage",
  ];

  allFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = ""; // Clear values
      el.disabled = false; // UNLOCK everything for new registration
      el.style.borderColor = ""; // Resets the red error borders
    }
  });

  // Reset Birth Month dropdown
  const monthDropdown = document.getElementById("birthMonth");
  if (monthDropdown) monthDropdown.selectedIndex = 0;

  currentBuyer = null;
}

// ---------- Checkout Process ----------
export async function checkout() {
  // 1. Check if the cart has items
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    showToast("Your cart is empty!");
    return;
  }

  // 2. Identify the Seller (Context for actual 4-table schema)
  // For now, we use a placeholder or the ID from products
  const sellerId = cart[0].seller_id;

  // 3. Calculate Grand Total (Derived State)
  const grandTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0,
  );

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerText = "Processing...";
  }

  // 4. Capture Buyer Details from the DOM
  try {
    // 1. ALL current form values
    const fName = document.getElementById("firstName").value.trim();
    const lName = document.getElementById("lastName").value.trim();
    const bMonth = document.getElementById("birthMonth").value;
    const fWord = document.getElementById("favoriteWord").value.trim();
    const rawPhone = document.getElementById("mobilePhone").value.trim();
    const emailVal = document.getElementById("email").value.trim();

    // If email is provided, it MUST be valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailVal !== "" && !emailRegex.test(emailVal)) {
      showToast("Please enter a valid email address (e.g., name@example.com)");
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = "Place Order";
      }
      return;
    }

    // Unified capture for textareas
    const shpAdd =
      document.getElementById("shippingAddress")?.value.trim() || "";
    const sellerMsg =
      document.getElementById("sellerMessage")?.value.trim() ||
      document.getElementById("message")?.value.trim() ||
      "";

    // Clean the phone immediately
    const phone = rawPhone.replace(/\D/g, "");

    if (codeLookupActive) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) {
      showToast(
        "Your cart is empty! Please pick some charms before checking out.",
      );
      const cartTop = document.getElementById("cartTopTitle");
      if (cartTop) cartTop.focus();

      const buyerBox = document.getElementById("buyerBox");
      if (buyerBox) {
        buyerBox.style.opacity = "0.4";
        buyerBox.style.pointerEvents = "none";
        buyerBox.style.filter = "blur(1px)";
      }
      return;
    }

    const codeInput = document.getElementById("buyerCodeInput");
    const enteredCode = codeInput ? codeInput.value.trim() : "";

    // If everything is blank, ask to register
    if (!enteredCode && !currentBuyer && !fName && !shpAdd) {
      const proceedAsNew = confirm(
        "No Buyer Code entered. Register as a new buyer?",
      );
      if (proceedAsNew) {
        resetBuyerUI();
        showToast("Please fill out the form to register.");
      }
      return;
    }

    // 2. VERIFIED BUYER LOGIC: Update logistics and Finish
    if (currentBuyer) {
      const currentAddress = (currentBuyer.address || "").trim();
      const currentMsg = (currentBuyer.seller_message || "").trim();
      const currentPhone = (currentBuyer.mobile_phone || "").trim();
      const currentEmail = (currentBuyer.email || "").trim();

      // Compare what's on screen vs what we loaded from DB
      const hasChanged =
        shpAdd !== (currentBuyer.address || "").trim() ||
        sellerMsg !== (currentBuyer.seller_message || "").trim() ||
        phone !== (currentBuyer.mobile_phone || "").trim() ||
        emailVal !== (currentBuyer.email || "").trim();

      if (hasChanged) {
        const { data: updatedData, error: updateError } = await supabase
          .from("buyers")
          .update({
            address: shpAdd,
            seller_message: sellerMsg,
            mobile_phone: phone,
            email: emailVal.trim() === "" ? null : emailVal,
          })
          .eq("id", currentBuyer.id)
          .select();

        if (updateError) {
          console.error("DATABASE WRITE ERROR:", updateError.message);
          console.warn(
            "Profile sync failed (Constraint Error), but proceeding to sale:",
            updateError.message,
          );
          showToast(
            "Note: Profile details couldn't be updated, but we're proceeding with your order...",
          );
        } else if (updatedData && updatedData.length > 0) {
          currentBuyer = updatedData[0]; // Mirror the DB exactly
          showToast("Profile updated with your latest info! ✨");
        } else {
          console.warn("Update ignored by server. Check RLS Policies.");
          showToast("Update rejected by server.");
        }
      }
      // Final COMMIT: Finish the order
      return completeOrder();
    }

    // 3. REGISTRATION VALIDATION: Required fields check
    const requiredFields = [
      { val: fName, id: "firstName" },
      { val: lName, id: "lastName" },
      { val: bMonth, id: "birthMonth" },
      { val: fWord, id: "favoriteWord" },
      { val: rawPhone, id: "mobilePhone" },
      { val: shpAdd, id: "shippingAddress" },
    ];

    let hasError = false;
    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (el && (!field.val || field.val === "")) {
        el.classList.add("invalid-field");
        hasError = true;
        el.oninput = function () {
          this.classList.remove("invalid-field");
        };
      }
    });

    if (hasError) {
      showToast("Error: All fields marked with red are required.");
      return;
    }

    if (phone.length !== 11 || !phone.startsWith("09")) {
      showToast("Mobile number must be 11 digits starting with 09.");
      return;
    }

    // 4. Generate Code & Save New Profile
    const generatedCode =
      "B" +
      fName.substring(0, 3).toUpperCase() +
      bMonth.padStart(2, "0") +
      fWord.substring(0, 6).toUpperCase();

    const { data, error } = await supabase
      .from("buyers")
      .insert([
        {
          buyer_code: generatedCode,
          first_name: fName,
          last_name: lName,
          birth_month: bMonth,
          favorite_word: fWord,
          mobile_phone: phone,
          email: emailVal.trim() === "" ? null : emailVal,
          address: shpAdd || "N/A",
          seller_message: sellerMsg,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Handle unique constraint conflict
        const useExisting = confirm(
          `The code "${generatedCode}" is already taken.\n\n• Click OK to use this profile.\n• Click Cancel to try a different Favorite Word.`,
        );
        if (useExisting) {
          await loadBuyerByCode(generatedCode, true);
          if (currentBuyer) {
            // 2. IMPORTANT: Update the existing record with the NEW form values
            const { data: updatedData, error: syncError } = await supabase
              .from("buyers")
              .update({
                mobile_phone: phone, // The cleaned phone from your form
                email: emailVal || null, // The email from your form
                address: shpAdd, // The address from your form
                seller_message: sellerMsg, // The message from your form
              })
              .eq("id", currentBuyer.id)
              .select();

            if (syncError) {
              console.error("SUPABASE UPDATE REJECTED:", syncError.message);
              showToast("Sync failed:" + syncError.message);
            } else if (updatedData && updatedData.length > 0) {
              // Success verified by the database
              showToast("Profile synced with your latest info! ✨");

              // Update local state with the actual data returned from DB
              currentBuyer = updatedData[0];
            } else {
              // If no error but no data, RLS is likely still blocking the write
              console.warn(
                "Update accepted by client but ignored by server. Check RLS 'WITH CHECK' expression.",
              );
              showToast("Database sync ignored. Please check permissions.");
            }

            return completeOrder();
          }
        }
      } else {
        showToast("Error creating profile: " + error.message);
      }
      return;
    }

    // 5. Registration Success
    currentBuyer = data;
    localStorage.setItem("buyer_code", generatedCode);

    // Update the UI immediately so they see the code in the box
    if (codeInput) codeInput.value = generatedCode;

    // Use a blocking alert so they MUST see the code before the redirect
    alert(
      `Registration Successful!\n\nYour permanent Buyer Code is: ${generatedCode}\n\nPlease save this code for future orders.`,
    );

    completeOrder();
  } catch (err) {
    console.error("Checkout Crash:", err);
    showToast("Something went wrong. Please try again.");
  } finally {
    if (checkoutBtn) {
      // Restore the button text with the current total
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      let total = 0;
      cart.forEach((item) => (total += Number(item.price) * Number(item.qty)));

      checkoutBtn.disabled = false;
      checkoutBtn.innerText = `Place Order (₱${total.toLocaleString()})`;
    }
  }
}

// ---------- Checkout Stock Validation ----------
async function validateCartBeforeOrder(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const productIds = cart.map((item) => item.id).filter(Boolean);

  if (productIds.length === 0) {
    localStorage.removeItem("cart");
    throw new Error("Your cart contains invalid items.");
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, image_url, stock_quantity, is_active, seller_id")
    .in("id", productIds);

  if (error) {
    console.error("Checkout stock validation failed:", error);
    throw new Error("Could not verify product stock. Please try again.");
  }

  const productMap = new Map(
    (products || []).map((product) => [String(product.id), product]),
  );

  const correctedCart = [];
  const problems = [];

  for (const item of cart) {
    const product = productMap.get(String(item.id));

    if (!product) {
      problems.push(
        `${item.name || "This product"} is no longer available and was removed from your cart.`,
      );
      continue;
    }

    const stock = Number(product.stock_quantity) || 0;
    const qty = Number(item.qty) || 0;

    if (product.is_active !== true || stock <= 0) {
      problems.push(
        `${product.name || item.name || "This product"} is no longer available and was removed from your cart.`,
      );
      continue;
    }

    if (qty < 1) {
      problems.push(`${product.name} has an invalid quantity.`);
      continue;
    }

    if (qty > stock) {
      problems.push(`Only ${stock} left for ${product.name}.`);

      correctedCart.push({
        ...item,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock_quantity: stock,
        is_active: product.is_active,
        seller_id: product.seller_id,
        qty: stock,
      });

      continue;
    }

    correctedCart.push({
      ...item,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: stock,
      is_active: product.is_active,
      seller_id: product.seller_id,
      qty,
    });
  }

  if (problems.length > 0) {
    if (correctedCart.length > 0) {
      localStorage.setItem("cart", JSON.stringify(correctedCart));
    } else {
      localStorage.removeItem("cart");
    }

    const message =
      problems.length === 1
        ? problems[0]
        : "Some cart items changed. Please review your cart.";

    throw new Error(message);
  }

  localStorage.setItem("cart", JSON.stringify(correctedCart));
  return correctedCart;
}

// ---------- Deduct Stock After Successful Order ----------
async function deductStockForItems(items) {
  for (const item of items) {
    const productId = item.id;
    const qty = Number(item.qty) || 0;
    const currentStock = Number(item.stock_quantity) || 0;
    const newStock = currentStock - qty;

    if (!productId || qty <= 0) {
      throw new Error(
        `${item.name || "An item"} has invalid stock deduction data.`,
      );
    }

    if (newStock < 0) {
      throw new Error(`Not enough stock left for ${item.name}.`);
    }

    console.warn("📦 DEDUCTING STOCK:", {
      name: item.name,
      productId,
      currentStock,
      qty,
      newStock,
    });

    const { data, error } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", productId)
      .select("id, name, stock_quantity");

    if (error || !data || data.length === 0) {
      console.error("Stock deduction failed:", error);
      throw new Error(
        `Could not update stock for ${item.name}. Please try again.`,
      );
    }

    console.warn("✅ STOCK UPDATED:", data[0]);
  }
}

// Final checkout is handled by a Supabase RPC transaction.
// The database validates stock, creates seller-split orders,
// inserts order_items, deducts stock, and rolls back everything on failure.
async function saveOrderToDatabase() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (!currentBuyer) throw new Error("No buyer identified");

    const validatedCart = await validateCartBeforeOrder(cart);

    const rpcItems = validatedCart.map((item) => ({
      product_id: item.id,
      quantity: Number(item.qty),
    }));

    const { data: createdOrderNumbers, error } = await supabase.rpc(
      "create_order_transaction",
      {
        p_buyer_id: currentBuyer.id,
        p_items: rpcItems,
      },
    );

    if (error) {
      console.error("RPC order transaction failed:", error);
      showToast(error.message || "Order could not be completed.");
      return [];
    }

    localStorage.removeItem("cart");
    return createdOrderNumbers || [];
    // Prep to redirect to track page (using the first order number as the primary focus)
  } catch (err) {
    console.warn("Order was not saved:", err);
    showToast(err.message || "Order could not be saved.", 6000);
    return false;
  }
}

async function completeOrder() {
  const createdOrderNumbers = await saveOrderToDatabase();

  if (createdOrderNumbers && createdOrderNumbers.length > 0) {
    const numbersList = createdOrderNumbers.join(", ");
    const hasMultipleOrders = createdOrderNumbers.length > 1;

    alert(
      "Thank you for your order!!\n\n" +
        `Your order number${hasMultipleOrders ? "s are" : " is"}: ${numbersList}\n\n` +
        `Save ${hasMultipleOrders ? "these numbers" : "this number"} to track your package${hasMultipleOrders ? "s" : ""}.`,
    );

    clearCartUI();

    window.location.href = `track.html?id=${createdOrderNumbers[0]}`;
    return;
  }

  // Failure path: saveOrderToDatabase already showed the specific reason.
  // Refresh cart UI because validation may have corrected/removed cart items.
  if (typeof window.updateInterface === "function") {
    window.updateInterface();
  }

  const checkoutBtn = document.getElementById("checkoutBtn");

  if (checkoutBtn) {
    if (cart.length === 0) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerText = "Cart is Empty";
    } else {
      checkoutBtn.disabled = false;
      checkoutBtn.innerText = "Try Placing Order Again";
    }
  }

  console.warn(
    "Order not placed: checkout validation failed or order was not saved.",
  );
}
