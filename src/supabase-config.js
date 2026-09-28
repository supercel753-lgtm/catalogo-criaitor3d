const SUPABASE_URL =
    "https://odmshtzmvtgkuxnysqor.supabase.co";

const SUPABASE_PUBLIC_KEY =
    "sb_publishable_iGeAejP8oNb0hUy7FhThIQ_MMbzZV2c";

window.sb =
    window.supabase.createClient(

        SUPABASE_URL,

        SUPABASE_PUBLIC_KEY,

        {

            auth: {

                persistSession: false,

                autoRefreshToken: false,

                detectSessionInUrl: false

            }

        }

    );


window.CRIAITOR_SUPABASE_CONFIG =
    Object.freeze({

        bucket:
            "projetos",

        pastaImagens:
            "catalogo",

        tabelaCatalogo:
            "catalogo",

        registroCatalogo:
            1

    });
