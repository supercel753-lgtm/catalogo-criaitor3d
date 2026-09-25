
/*
==========================================
CRIAITOR 3D
CONFIGURAÇÃO SUPABASE - CLIENTES
==========================================

Conexão pública com o catálogo.

Os clientes podem consultar os produtos,
preços, fotografias e disponibilidade.

As permissões de alteração são controladas
pelas políticas de segurança do Supabase.

==========================================
*/


// ENDEREÇO DO PROJETO

const SUPABASE_URL =
    "https://odmshtzmvtgkuxnysqor.supabase.co";


// CHAVE PÚBLICA

const SUPABASE_PUBLIC_KEY =
    "sb_publishable_iGeAejP8oNb0hUy7FhThIQ_MMbzZV2c";


// INICIALIZAR CONEXÃO

window.sb = window.supabase.createClient(

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


// CONFIGURAÇÕES DO CATÁLOGO

window.CRIAITOR_SUPABASE_CONFIG = Object.freeze({

    bucket: "projetos",

    pastaImagens: "catalogo",

    tabelaCatalogo: "catalogo",

    registroCatalogo: 1

});
