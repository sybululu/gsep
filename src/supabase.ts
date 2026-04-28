import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supabase tables:
// - quiz_versions: id, name, questions, created_at, updated_at
// - images: version_id, image_id, content, created_at
// - admins: email, created_at

export const QUIZ_VERSIONS_TABLE = 'quiz_versions';
export const IMAGES_TABLE = 'images';
export const ADMINS_TABLE = 'admins';
