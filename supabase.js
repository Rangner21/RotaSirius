const SUPABASE_URL = "https://lafpxxoyjuqtvwiqzoci.supabase.co";
const SUPABASE_KEY = "sb_publishable_AYcJoBpQTHM39IhvfnBuQg_BKC5rLNy";

const { createClient } = supabase;

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

