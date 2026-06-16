import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://uomfboryzwfnubvgabyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_7WUa8dw75nonkPIMWOTWqQ_lrgJPZLz";

// Create ONE global instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Attach globally for non-module scripts
window.supabaseClient = supabase;

