import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.warn(
		"Missing Supabase environment variables. " +
		"Server-side Supabase features will not work. " +
		"Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
	);
}

// Service role client has elevated permissions - use carefully
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
	? createClient(supabaseUrl, supabaseServiceKey)
	: null;

