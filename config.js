/*
 * Global leaderboard settings (Supabase).
 *
 * This is the same Supabase project as the two artery games. This game keeps its scores
 * in its own table (disorders_scores), so run supabase/leaderboard.sql once in that
 * project to turn its leaderboard on. Until then, scores stay on each device and are
 * sent automatically once the table exists. See README.md.
 *
 * The publishable key is meant to be public: the database rules in
 * supabase/leaderboard.sql only let it read scores and add new ones.
 * Never put a secret key (sb_secret_...) or the service_role key here.
 */
window.LEADERBOARD = {
  supabaseUrl: 'https://vpsyvzxsqmyavwpagnxc.supabase.co',
  supabaseKey: 'sb_publishable_jRcRRGaaj-_5b390WQ-PLw_zEglHBOj'
};
