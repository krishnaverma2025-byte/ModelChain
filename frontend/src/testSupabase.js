import { supabase } from "./supabaseClient";

export async function testSupabase() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("❌ Supabase connection failed:", error);
    return;
  }

  console.log("✅ Supabase is connected!");
  console.log("Session:", data.session);
}