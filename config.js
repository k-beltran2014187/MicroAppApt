/* Configuración de la nube (Supabase). Con los campos vacíos la app funciona en "modo local":
   los datos se guardan solo en este navegador. La clave "publishable" es pública por diseño;
   la seguridad la dan las reglas (RLS) de la base de datos. NUNCA pongas aquí la clave secret/service_role. */
window.ENGANCHE_CONFIG = {
  supabaseUrl: 'https://fzjyhrezqhmcmqyobelh.supabase.co',
  supabaseAnonKey: 'sb_publishable_OtFVHit_v9pfbZ_qkJFvqg_H_gBxkZM'
};
