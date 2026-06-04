// auth-guard.js
import { supabase } from "./supabaseClient.js";

export async function checkAuthAndOnboarding() {
  const path = window.location.pathname;

  if (path.includes("seller-login.html")) {
    console.log("Guard: On login page, ignoring guard.");
    return; // Stop here, do not run the rest of the guard
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 1. AUTH GUARD: If not logged in, force to login
  if (!session) {
    if (path !== "/seller-login.html") {
      window.location.href = "./seller-login.html";
    }
    return;
  }

  // 2. DATA CHECK: Verify seller record exists
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  // If no seller, force to onboarding
  if (!seller && path !== "/onboarding.html") {
    window.location.href = "./onboarding.html";
    return;
  }

  // 3. REDIRECT GUARD: If logged in AND seller exists, don't allow login/onboarding pages
  if (path === "/seller-login.html" || path === "/onboarding.html") {
    window.location.href = "./dashboard.html";
    return;
  }
  // If we reached here, they are a seller and on a valid page.
  document.body.style.display = "flex";
  console.log("Welcome, Seller!");
}
