// ---------- Toast ----------
export function showToast(message, duration = 2000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style = `
    background: #333;
    color: #fff;
    padding: 10px 20px;
    margin-top: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = 1;
  });

  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

//---------- formetters (Presentation Layer) ---------
export function formatOrderNumber(num) {
  if (!num) return "N/A";
  // The 'padStart(4, "0")' ensures you get 0001, 0002, etc.
  return `ORD-${num.toString().padStart(4, "0")}`;
}

export function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString()}`;
}

// shared by dashboard and track modules for product review status
export function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

// gently scroll the active input into view after the keyboard opens in mobile landscape mode
// shared by cart and track js modules
export function enableMobileKeyboardScrollFix() {
  const isMobileLandscape = window.matchMedia(
    "(max-width: 920px) and (orientation: landscape)",
  ).matches;

  if (!isMobileLandscape) return;

  const fields = document.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    if (field.dataset.keyboardScrollFix === "true") return;

    field.dataset.keyboardScrollFix = "true";

    field.addEventListener("focus", () => {
      setTimeout(() => {
        const rect = field.getBoundingClientRect();

        const visibleHeight =
          window.visualViewport?.height || window.innerHeight;

        const bottomLimit = visibleHeight - 24;
        const topLimit = 70;

        if (rect.bottom > bottomLimit) {
          window.scrollBy({
            top: rect.bottom - bottomLimit,
            behavior: "smooth",
          });
        } else if (rect.top < topLimit) {
          window.scrollBy({
            top: rect.top - topLimit,
            behavior: "smooth",
          });
        }
      }, 350);
    });
  });
}
