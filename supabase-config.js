
const SUPABASE_URL = "https://odmshtzmvtgkuxnysqor.supabase.co";

const SUPABASE_PUBLIC_KEY = "sb_publishable_iGeAejP8oNb0hUy7FhThIQ_MMbzZV2c";

const ADMIN_UID = "99d25baa-5916-4c09-86cb-14e33b887752";

window.sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
