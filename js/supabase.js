const SUPABASE_URL = "https://lafpxxoyjuqtvwiqzoci.supabase.co";
// Substitua a string abaixo pela sua 'anon public' key que começa com 'ey...'
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZnB4eG95anVxdHZ3aXF6b2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTk5NDksImV4cCI6MjA5MTgzNTk0OX0.__NyJl3dlJhUcW2yoV9vUrdKBcFjbzigvgg_FdfVSYI";

if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro: Biblioteca Supabase não encontrada. Verifique o index.html.");
    window.supabaseClient = null;
}
