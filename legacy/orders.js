// orders.js
import { supabase } from "./supabaseClient.js";

export async function fetchMyOrders() {
  // Get current logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
            id,
            created_at,
            status,
            order_number,
            order_amt,
            order_items (
                id,
                quantity,
                price,
                products ( name )
            )
        `,
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Error:", error.message);
    return [];
  }
  return data;
}
