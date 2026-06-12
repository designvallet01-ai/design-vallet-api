import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xxfjeysjcrgmukcpkmjk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_RveM2OwDIIMfY7KJfWXHNQ_iCkexI4r';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key are required to initialize the database connection.');
}

const db = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase Production Client Initialized.');

export default db;
export const isMock = false;
