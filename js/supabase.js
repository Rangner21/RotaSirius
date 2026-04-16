const SUPABASE_URL = "https://lafpxxoyjuqtvwiqzoci.supabase.co";
// ATENÇÃO: Verifique sua chave API. Chaves do Supabase geralmente começam com 'eyJ...'
const SUPABASE_KEY = "sb_publishable_AYcJoBpQTHM39IhvfnBuQg_BKC5rLNy";

const { createClient } = supabase;

if (SUPABASE_KEY.startsWith('sb_')) {
    console.error("ALERTA: A SUPABASE_KEY parece ser uma chave do Stripe, não do Supabase. O banco de dados não funcionará no GitHub.");
}

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
