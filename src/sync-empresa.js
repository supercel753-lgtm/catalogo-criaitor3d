(function () {

"use strict";


const sb =
    window.sb;


const admin =
    window.CRIAITOR_ADMIN;


const CONFIG = {

    tabela:

        window.CRIAITOR_SUPABASE_CONFIG
            ?.tabelaCatalogo ||
        "catalogo",

    registro:

        window.CRIAITOR_SUPABASE_CONFIG
            ?.registroCatalogo ||
        1,

    canal:
        "criaitor3d-sync-empresa"

};


let canal =
    null;


let verificando =
    false;


/* =====================================================
   STATUS
===================================================== */

function status(

    mensagem,

    erro = false

) {

    const elemento =
        document.querySelector(
            "#status-sync"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.style.color =

        erro

            ? "#ff9797"

            : "#91e4b1";

}


/* =====================================================
   VERIFICAR VERSÃO
===================================================== */

async function verificarVersao() {

    if (

        !sb ||
        !admin ||
        verificando

    ) {

        return;

    }


    verificando =
        true;


    try {

        const {

            data,

            error

        } = await sb

            .from(CONFIG.tabela)

            .select("versao")

            .eq(
                "id",
                CONFIG.registro
            )

            .single();


        if (error) {

            throw error;

        }


        const versaoRemota =

            Number(
                data.versao
            ) || 0;


        const versaoLocal =

            Number(
                admin.getVersao()
            ) || 0;


        if (

            versaoRemota !==
            versaoLocal

        ) {

            status(
                "Nova versão encontrada. Atualizando..."
            );


            await admin.recarregar();


            status(

                "Catálogo atualizado • versão " +

                versaoRemota

            );


        } else {

            status(

                "Sincronizado • versão " +

                versaoLocal

            );

        }


    } catch (erro) {

        console.warn(
            "Erro de sincronização:",
            erro
        );


        status(

            "Falha ao verificar sincronização",

            true

        );


    } finally {

        verificando =
            false;

    }

}


/* =====================================================
   REALTIME
===================================================== */

function iniciarRealtime() {

    if (

        !sb ||
        canal

    ) {

        return;

    }


    canal = sb

        .channel(
            CONFIG.canal
        )

        .on(

            "postgres_changes",

            {

                event:
                    "UPDATE",

                schema:
                    "public",

                table:
                    CONFIG.tabela,

                filter:
                    `id=eq.${CONFIG.registro}`

            },

            () => {

                verificarVersao();

            }

        )

        .subscribe(

            resultado => {

                if (

                    resultado ===
                    "SUBSCRIBED"

                ) {

                    status(
                        "Atualização automática ativa"
                    );

                }

            }

        );

}


/* =====================================================
   EVENTOS
===================================================== */

document.addEventListener(

    "visibilitychange",

    () => {

        if (!document.hidden) {

            verificarVersao();

        }

    }

);


window.addEventListener(

    "online",

    verificarVersao

);


window.addEventListener(

    "pageshow",

    verificarVersao

);


/* =====================================================
   INICIAR
===================================================== */

function iniciar() {

    if (

        !sb ||
        !admin

    ) {

        console.warn(

            "CriAItor Sync: aguardando dependências."

        );

        return;

    }


    iniciarRealtime();


    verificarVersao();


    setInterval(

        verificarVersao,

        30000

    );

}


if (

    document.readyState ===
    "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        iniciar,

        {
            once: true
        }

    );

} else {

    iniciar();

}


/* =====================================================
   API
===================================================== */

window.CRIAITOR_SYNC = {

    verificar:
        verificarVersao,

    recarregar:

        async () => {

            await admin.recarregar();

            await verificarVersao();

        }

};

})();
