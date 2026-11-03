// Configuración de la base de datos (Supabase).
// Copia la "Project URL" y la clave "anon public" de supabase.com → tu proyecto → Project Settings → API.
// La clave anon es pública por diseño: la seguridad la dan las reglas (RLS) de supabase/esquema.sql.
// Si se dejan vacías, la app usa el almacenamiento de Claude cuando se abre desde su enlace.
window.CONCEJO_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
