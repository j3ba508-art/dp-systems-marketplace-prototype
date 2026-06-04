// Identity model:
// products.seller_id and orders.seller_id reference profiles.id,
// and profiles.id equals auth.users.id.
// Therefore product/order ownership uses currentUser.id.
// sellers.id is only for seller profile/details, not product/order ownership.

// productOverlay.js
import { supabase } from "./supabaseClient.js";

let currentSellerId = null;
let selectedFileObject = null;
let editProductId = null;

let touched = {
  name: false,
  desc: false,
  price: false,
  stock: false,
  image: false,
};

window._productOverlayValidate = () => {};

export function initProductOverlay(sellerId) {
  currentSellerId = sellerId;

  const overlay = document.getElementById("productOverlay");
  const closeBtn = document.getElementById("closeOverlayBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteProductBtn = document.getElementById("deleteProductBtn");
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const form = document.getElementById("productForm");
  const preview = document.getElementById("imagePreview");
  const addNewBtn = document.getElementById("addNewBtn");
  const descInput = document.getElementById("p-desc");
  const priceInput = document.getElementById("p-price");
  const stockInput = document.getElementById("p-stock");
  const fileInput = document.getElementById("p-image");
  const overlayTitle = document.getElementById("overlayTitle");

  if (
    !overlay ||
    !form ||
    !preview ||
    !fileInput ||
    !priceInput ||
    !stockInput ||
    !descInput
  ) {
    console.warn("productOverlay: required DOM not found");
    return;
  }

  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  function clampNonNegative(e) {
    if (e.target.value < 0) e.target.value = 0;
  }

  priceInput.addEventListener("input", clampNonNegative);
  stockInput.addEventListener("input", clampNonNegative);

  function showFieldToast(input, message) {
    const toast = document.createElement("div");
    toast.className = "field-toast";
    toast.textContent = message;

    input.parentElement.style.position = "relative";
    input.parentElement.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }

  function validateForm() {
    form.querySelectorAll(".field-toast").forEach((t) => t.remove());

    const name = document.getElementById("p-name").value.trim();
    const descInput = form.querySelector("#p-desc");

    const descOk = descInput.value.trim() !== "";
    const price = parseFloat(priceInput.value);
    const stockRaw = stockInput.value;

    const stock = stockRaw === "" ? 0 : parseInt(stockRaw); // allow empty -> 0

    const priceOk = !isNaN(price) && price >= 0;
    const stockOk = !isNaN(stock) && stock >= 0;
    const nameOk = name.length > 0;

    const hasImage =
      selectedFileObject || preview.style.backgroundImage.includes("url(");

    const imageOk = editProductId ? hasImage : !!selectedFileObject;

    submitBtn.disabled = !(nameOk && descOk && priceOk && stockOk && imageOk);
    // TOASTS ONLY AFTER INTERACTION
    if (!nameOk && touched.name) {
      showFieldToast(document.getElementById("p-name"), "Name is required");
    }

    if (!descOk && touched.desc) {
      showFieldToast(descInput, "Description is required");
    }

    if (!priceOk && touched.price) {
      descOk && showFieldToast(priceInput, "Price must be 0 or higher");
    }

    if (!stockOk && touched.stock) {
      showFieldToast(
        stockInput,
        "Stock must be 0 or higher (or leave blank for 0)",
      );
    }

    // IMAGE RULE (ONLY ADD MODE)
    if (!editProductId && !imageOk && touched.image) {
      showFieldToast(fileInput, "Image is required");
    }
  }

  document.getElementById("p-name").addEventListener("input", () => {
    touched.name = true;
    validateForm();
  });

  descInput.addEventListener("input", () => {
    touched.desc = true;
    validateForm();
  });

  priceInput.addEventListener("input", () => {
    touched.price = true;
    validateForm();
  });

  stockInput.addEventListener("input", () => {
    touched.stock = true;
    validateForm();
  });

  document.getElementById("p-name").addEventListener("blur", () => {
    touched.name = true;
    validateForm();
  });

  descInput.addEventListener("blur", () => {
    touched.desc = true;
    validateForm();
  });

  priceInput.addEventListener("blur", () => {
    touched.price = true;
    validateForm();
  });

  stockInput.addEventListener("blur", () => {
    touched.stock = true;
    validateForm();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) return;

    touched.image = true;
    handleFileSelection(file, preview);
    validateForm();
  });

  // OPEN
  addNewBtn?.addEventListener("click", () => {
    editProductId = null;
    selectedFileObject = null;
    form.reset();

    touched = {
      name: false,
      price: false,
      stock: false,
      image: false,
    };

    preview.style.backgroundImage = "none";
    preview.querySelector("span").style.display = "block";
    overlay.classList.remove("hidden");

    validateForm();
  });

  // CLOSE
  const close = () => {
    submitBtn.disabled = true;
    overlay.classList.add("hidden");
    form.reset();
    selectedFileObject = null;
    editProductId = null;

    touched = {
      name: false,
      price: false,
      stock: false,
      image: false,
    };

    preview.style.backgroundImage = "none";
    preview.querySelector("span").style.display = "block";

    validateForm();
  };

  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // DRAG OVER
  preview.addEventListener("dragover", (e) => {
    e.preventDefault();
    preview.classList.add("dragover");
  });

  preview.addEventListener("dragleave", () => {
    preview.classList.remove("dragover");
  });

  // DROP
  preview.addEventListener("drop", (e) => {
    e.preventDefault();
    preview.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    if (file) {
      touched.image = true;
      handleFileSelection(file, preview);
      validateForm();
    }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (submitBtn.disabled) return;

    if (!currentSellerId) {
      alert("Overlay not initialized correctly.");
      return;
    }

    const name = document.getElementById("p-name").value;
    const price = parseFloat(document.getElementById("p-price").value);
    const stockValue = document.getElementById("p-stock").value.trim();
    const stock = stockValue === "" ? 0 : parseInt(stockValue);
    const desc = document.getElementById("p-desc").value;

    let imageFileName = null;

    if (selectedFileObject) {
      const ext = selectedFileObject.name.split(".").pop();
      imageFileName = `${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(imageFileName, selectedFileObject);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }
    }

    const payload = {
      name,
      description: desc,
      price,
      stock_quantity: stock,
      seller_id: currentSellerId,
    };

    if (imageFileName) payload.image_url = imageFileName;

    const query = editProductId
      ? supabase.from("products").update(payload).eq("id", editProductId)
      : supabase.from("products").insert(payload);

    const { error } = await query;
    if (error) {
      alert(error.message);
      return;
    }

    close(); // instead of reload
    await window.refreshSellerProducts?.();
  };

  // DELETE handlers

  deleteProductBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editProductId) {
      console.warn("No product selected for delete.");
      return;
    }

    deleteConfirmModal.classList.remove("hidden");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmModal.classList.add("hidden");
  });

  deleteConfirmModal.addEventListener("click", (e) => {
    if (e.target === deleteConfirmModal) {
      deleteConfirmModal.classList.add("hidden");
    }
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!editProductId) {
      console.warn("No product selected for delete.");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", editProductId);

    if (error) {
      console.error("Delete failed:", error);
      alert("Could not delete product.");
      return;
    }

    deleteConfirmModal.classList.add("hidden");
    close();

    await window.refreshSellerProducts();
  });

  window._productOverlayValidate = validateForm;
}

function handleFileSelection(file, preview) {
  selectedFileObject = file;

  const reader = new FileReader();
  reader.onload = (event) => {
    preview.style.backgroundImage = `url(${event.target.result})`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
    preview.querySelector("span").style.display = "none";
  };

  reader.readAsDataURL(file);
  window._productOverlayValidate?.();
}

export function openProductOverlay(mode = "add", product = null) {
  selectedFileObject = null;
  document.getElementById("p-image").value = "";

  const overlay = document.getElementById("productOverlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const deleteProductBtn = document.getElementById("deleteProductBtn");
  const submitBtn = document.querySelector(
    "#productForm button[type='submit']",
  );

  editProductId = mode === "edit" && product ? product.id : null;

  // Set modal title and button text based on mode
  if (mode === "edit" && product) {
    overlayTitle.textContent = "Edit Product";
    submitBtn.textContent = "Update Product";
    deleteProductBtn.classList.remove("hidden");
  } else {
    overlayTitle.textContent = "Add Product";
    submitBtn.textContent = "Save Product";
    deleteProductBtn.classList.add("hidden");
  }

  if (product) {
    document.getElementById("p-name").value = product.name || "";
    document.getElementById("p-desc").value = product.description || "";
    document.getElementById("p-price").value = product.price || "";
    document.getElementById("p-stock").value = product.stock_quantity || "";
  } else {
    document.getElementById("p-name").value = "";
    document.getElementById("p-desc").value = "";
    document.getElementById("p-price").value = "";
    document.getElementById("p-stock").value = "";
  }

  const preview = document.getElementById("imagePreview");
  preview.style.backgroundImage = "none";
  preview.querySelector("span").style.display = "block";

  if (product?.image_url) {
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(product.image_url);

    preview.style.backgroundImage = `url(${data.publicUrl})`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
    preview.querySelector("span").style.display = "none";
  }

  overlay.classList.remove("hidden");
  window._productOverlayValidate?.();
}
