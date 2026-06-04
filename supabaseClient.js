// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uomfboryzwfnubvgabyg.supabase.co";
const supabaseKey = "sb_publishable_7WUa8dw75nonkPIMWOTWqQ_lrgJPZLz";

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Supabase URL is:", supabaseUrl);

window.supabase = supabase;
