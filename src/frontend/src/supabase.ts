import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./settings";

export const supabase = createClient(supabaseUrl, supabaseKey);
