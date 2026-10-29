// conexion.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://evkespjlgxdeofkafbjz.supabase.co';
const supabaseKey = 'sb_publishable_WUsoToc9MSaja54-6Sksog_WAKHQidy';

export const supabase = createClient(supabaseUrl, supabaseKey);