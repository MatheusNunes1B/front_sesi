/**
 * supabase.js
 * Inicializa o cliente Supabase para uso no frontend.
 * Substitua as variáveis abaixo com os dados do seu projeto.
 */

const SUPABASE_URL  = 'https://svzbajwsraotjasiwkrg.supabase.co';      // ex: https://xyzxyz.supabase.co
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2emJhandzcmFvdGphc2l3a3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Nzc2MDcsImV4cCI6MjA5NzE1MzYwN30.-MwysYIe9-i1lMZOYl27FNEoT1pPtOu8oGpwuAadWGE'; // chave pública (anon/public)

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);