
/*
=============================================
CRIAITOR 3D
SINCRONIZAÇÃO DA EMPRESA
=============================================

VERSÃO: 3.0

SUPABASE:

Tabela: public.catalogo
Registro: id = 1

Colunas utilizadas:

- produtos
- versao

ARQUIVOS COMPATÍVEIS:

- supabase-config.js
- catalogo.js
- admin.js
- fotos-empresa.js

FUNCIONALIDADES:

1. Recarregar catálogo do Supabase.
2. Acompanhar alterações em tempo real.
3. Atualizar os produtos do painel.
4. Informar o status da sincronização.
5. Evitar conflitos durante a edição.
6. Verificar atualizações ao retornar ao site.

IMPORTANTE:

O admin.js gerencia:

- Login;
- Logout;
- Cadastro de produtos;
- Salvamento no Supabase;
- Controle de versão.

Este arquivo não duplica essas funções.

=============================================
*/


(function () {

    "use strict";


    // ======================================
    // 1. CONFIGURAÇÕES
    // ======================================

    const CONFIG = {

        empresa: "CriAItor 3D",

        tabela: "catalogo",

        registro: 1,

        colunaVersao: "versao",

        canal: "criaitor3d-sync-empresa",

        tempoEspera: 500

    };


    // ======================================
    // 2. CONEXÃO SUPABASE
    // ======================================

    const sb = window.sb;


    // ======================================
    // 3. ESTADO DA SINCRONIZAÇÃO
    // ======================================

    const estado = {

        conectado: false,

        sincronizando: false,

        atualizacaoPendente: false,

        ultimaVersao: null,

        ultimaSincronizacao: null,

        canalRealtime: null,

        temporizador: null

    };


    // ======================================
    // 4. ELEMENTOS DO HTML
    // ======================================

    const $ = seletor => {

        return document.querySelector(seletor);

    };


    const painelEmpresa = $(".app");

    const modalProduto = $("#modal-produto");

    const paginaSincronizacao = $("#publicar");


    // ======================================
    // 5. ACESSO AO ADMIN.JS
    // ======================================

    function obterAdmin() {

        const admin = window.CRIAITOR_ADMIN;


        if (!admin) {

            throw new Error(

                "O admin.js não foi inicializado."

            );

        }


        if (

            typeof admin.recarregar !== "function" ||

            typeof admin.getVersao !== "function" ||

            typeof admin.getUsuario !== "function"

        ) {

            throw new Error(

                "A API do admin.js não é compatível " +
                "com esta versão da sincronização."

            );

        }


        return admin;

    }


    // ======================================
    // 6. VERIFICAR SE O ADMIN ESTÁ CONECTADO
    // ======================================

    function administradorConectado() {

        try {

            const admin = obterAdmin();

            const usuario = admin.getUsuario();


            if (!usuario) {

                return false;

            }


            if (painelEmpresa.hidden) {

                return false;

            }


            if (

                typeof ADMIN_UID !== "undefined" &&

                usuario.id !== ADMIN_UID

            ) {

                return false;

            }


            return true;


        } catch (erro) {

            return false;

        }

    }


    // ======================================
    // 7. VERIFICAR SE HÁ EDIÇÃO EM ANDAMENTO
    // ======================================

    function produtoEmEdicao() {

        return Boolean(

            modalProduto &&

            modalProduto.open

        );

    }


    // ======================================
    // 8. ÁREA VISUAL DE SINCRONIZAÇÃO
    // ======================================

    function criarInterface() {

        if ($("#controles-sync-empresa")) {

            return;

        }


        const painel = paginaSincronizacao

            ?.querySelector(".painel");


        if (!painel) {

            console.warn(

                "Área de sincronização não encontrada."

            );

            return;

        }


        const controles = document.createElement("div");


        controles.id = "controles-sync-empresa";


        controles.innerHTML = `

            <div class="sync-empresa">

                <h3>

                    Estado da sincronização

                </h3>


                <p
                    id="status-sync"
                    role="status"
                    aria-live="polite"
                >

                    Aguardando conexão...

                </p>


                <p>

                    <strong>

                        Versão do catálogo:

                    </strong>

                    <span id="versao-sync">

                        —

                    </span>

                </p>


                <p>

                    <strong>

                        Última sincronização:

                    </strong>

                    <span id="ultima-sync">

                        —

                    </span>

                </p>


                <div class="grupo-botoes">

                    <button

                        type="button"

                        class="botao botao-laranja"

                        id="botao-recarregar-sync"

                    >

                        Recarregar catálogo da nuvem

                    </button>

                </div>

            </div>

        `;


        painel.appendChild(controles);


        // ==================================
        // EVENTO DO BOTÃO
        // ==================================

        const botao = $("#botao-recarregar-sync");


        botao.addEventListener(

            "click",

            async () => {

                try {

                    await recarregarCatalogo(true);

                } catch (erro) {

                    console.error(erro);

                }

            }

        );

    }


    // ======================================
    // 9. ATUALIZAR MENSAGENS
    // ======================================

    function mostrarStatus(mensagem, erro = false) {

        const elemento = $("#status-sync");


        if (!elemento) {

            return;

        }


        elemento.textContent = mensagem;


        elemento.style.color = erro

            ? "#ff8e8e"

            : "#91e4b1";

    }


    // ======================================
    // 10. ATUALIZAR INDICADORES
    // ======================================

    function atualizarIndicadores() {

        const versao = $("#versao-sync");

        const ultima = $("#ultima-sync");


        if (versao) {

            versao.textContent =

                estado.ultimaVersao ?? "—";

        }


        if (ultima) {

            ultima.textContent =

                estado.ultimaSincronizacao

                    ? estado.ultimaSincronizacao

                        .toLocaleString("pt-BR")

                    : "—";

        }

    }


    // ======================================
    // 11. CONTROLAR BOTÃO
    // ======================================

    function bloquearBotao(bloquear) {

        const botao = $("#botao-recarregar-sync");


        if (!botao) {

            return;

        }


        botao.disabled = bloquear;


        botao.textContent = bloquear

            ? "Sincronizando..."

            : "Recarregar catálogo da nuvem";

    }


    // ======================================
    // 12. RECARREGAR CATÁLOGO
    // ======================================

    async function recarregarCatalogo(

        manual = false

    ) {

        // Não sincronizar sem login.

        if (!administradorConectado()) {

            if (manual) {

                mostrarStatus(

                    "Entre com sua conta administrativa.",

                    true

                );

            }


            return false;

        }


        // Evitar atualizações simultâneas.

        if (estado.sincronizando) {

            estado.atualizacaoPendente = true;

            return false;

        }


        // Não substituir dados do formulário
        // enquanto um produto é editado.

        if (produtoEmEdicao()) {

            estado.atualizacaoPendente = true;


            if (manual) {

                mostrarStatus(

                    "Conclua ou cancele a edição do " +
                    "produto antes de recarregar."

                );

            }


            return false;

        }


        estado.sincronizando = true;


        bloquearBotao(true);


        mostrarStatus(

            "Carregando produtos do Supabase..."

        );


        try {

            const admin = obterAdmin();


            // O admin.js realiza a consulta
            // ao Supabase e atualiza o painel.

            await admin.recarregar();


            // Obter a versão carregada.

            estado.ultimaVersao =

                admin.getVersao();


            // Registrar a sincronização.

            estado.ultimaSincronizacao =

                new Date();


            estado.atualizacaoPendente = false;


            atualizarIndicadores();


            mostrarStatus(

                "Catálogo atualizado com sucesso!"

            );


            return true;


        } catch (erro) {

            console.error(

                "Erro na sincronização:",

                erro

            );


            estado.atualizacaoPendente = true;


            mostrarStatus(

                "Não foi possível atualizar: " +

                erro.message,

                true

            );


            return false;


        } finally {

            estado.sincronizando = false;


            bloquearBotao(false);

        }

    }


    // ======================================
    // 13. VERIFICAR VERSÃO DO CATÁLOGO
    // ======================================

    async function verificarVersaoRemota() {

        if (!administradorConectado()) {

            return;

        }


        if (produtoEmEdicao()) {

            estado.atualizacaoPendente = true;

            return;

        }


        if (estado.sincronizando) {

            return;

        }


        try {

            const { data, error } = await sb

                .from(CONFIG.tabela)

                .select(CONFIG.colunaVersao)

                .eq("id", CONFIG.registro)

                .single();


            if (error) {

                throw error;

            }


            if (!data) {

                throw new Error(

                    "Registro do catálogo não encontrado."

                );

            }


            const versaoRemota = Number(

                data.versao

            );


            const versaoLocal = Number(

                obterAdmin().getVersao()

            );


            // Recarregar somente quando
            // o banco contém outra versão.

            if (

                versaoRemota !== versaoLocal

            ) {

                await recarregarCatalogo();

            } else {

                estado.ultimaVersao =

                    versaoLocal;


                atualizarIndicadores();


                if (estado.conectado) {

                    mostrarStatus(

                        "Catálogo sincronizado."

                    );

                }

            }


        } catch (erro) {

            console.warn(

                "Falha ao verificar catálogo:",

                erro

            );


            mostrarStatus(

                "Não foi possível verificar atualizações.",

                true

            );

        }

    }


    // ======================================
    // 14. AGENDAR VERIFICAÇÃO
    // ======================================

    function agendarVerificacao() {

        clearTimeout(

            estado.temporizador

        );


        estado.temporizador = setTimeout(

            async () => {

                await verificarVersaoRemota();

            },

            CONFIG.tempoEspera

        );

    }


    // ======================================
    // 15. SINCRONIZAÇÃO EM TEMPO REAL
    // ======================================

    function iniciarRealtime() {

        if (!sb) {

            mostrarStatus(

                "Supabase não inicializado.",

                true

            );

            return;

        }


        if (estado.canalRealtime) {

            return;

        }


        estado.canalRealtime = sb

            .channel(CONFIG.canal)


            // Monitorar alterações
            // na tabela catalogo.

            .on(

                "postgres_changes",

                {

                    event: "UPDATE",

                    schema: "public",

                    table: CONFIG.tabela,

                    filter: "id=eq.1"

                },

                payload => {

                    if (!administradorConectado()) {

                        return;

                    }


                    // Se estiver editando,
                    // adiar a atualização.

                    if (produtoEmEdicao()) {

                        estado.atualizacaoPendente = true;

                        return;

                    }


                    // Atualizar o catálogo
                    // quando o Supabase
                    // informar uma alteração.

                    agendarVerificacao();

                }

            )


            // Acompanhar conexão Realtime.

            .subscribe(

                status => {

                    if (status === "SUBSCRIBED") {

                        estado.conectado = true;


                        mostrarStatus(

                            "Conectado ao Supabase Realtime."

                        );


                        agendarVerificacao();

                    }


                    if (

                        status === "CHANNEL_ERROR" ||

                        status === "TIMED_OUT"

                    ) {

                        estado.conectado = false;


                        mostrarStatus(

                            "Conexão em tempo real indisponível. " +
                            "O catálogo poderá ser recarregado manualmente.",

                            true

                        );

                    }


                    if (status === "CLOSED") {

                        estado.conectado = false;

                    }

                }

            );

    }


    // ======================================
    // 16. FINALIZAR EDIÇÃO DE PRODUTO
    // ======================================

    function configurarAtualizacaoAposEdicao() {

        if (!modalProduto) {

            return;

        }


        modalProduto.addEventListener(

            "close",

            () => {

                if (

                    estado.atualizacaoPendente &&

                    administradorConectado()

                ) {

                    // Aguarda o salvamento do produto
                    // e verifica se o catálogo remoto
                    // possui uma versão diferente.

                    clearTimeout(

                        estado.temporizador

                    );


                    estado.temporizador = setTimeout(

                        verificarVersaoRemota,

                        1500

                    );

                }

            }

        );

    }


    // ======================================
    // 17. RETORNAR À ABA DO NAVEGADOR
    // ======================================

    function configurarRetornoPagina() {

        document.addEventListener(

            "visibilitychange",

            () => {

                if (

                    !document.hidden &&

                    administradorConectado()

                ) {

                    agendarVerificacao();

                }

            }

        );


        window.addEventListener(

            "pageshow",

            () => {

                if (administradorConectado()) {

                    agendarVerificacao();

                }

            }

        );


        window.addEventListener(

            "online",

            () => {

                if (administradorConectado()) {

                    mostrarStatus(

                        "Conexão restabelecida. " +
                        "Verificando o catálogo..."

                    );


                    agendarVerificacao();

                }

            }

        );

    }


    // ======================================
    // 18. MONITORAR ALTERAÇÕES NA SESSÃO
    // ======================================

    function configurarSessao() {

        if (!sb) {

            return;

        }


        sb.auth.onAuthStateChange(

            (evento, sessao) => {

                // O admin.js é responsável
                // pela autenticação.
                //
                // Este módulo apenas acompanha
                // o estado da conexão.

                if (!sessao) {

                    estado.conectado = false;


                    mostrarStatus(

                        "Sessão administrativa encerrada."

                    );


                    return;

                }


                if (

                    evento === "SIGNED_IN" ||

                    evento === "TOKEN_REFRESHED"

                ) {

                    agendarVerificacao();

                }

            }

        );

    }


    // ======================================
    // 19. API DE SINCRONIZAÇÃO
    // ======================================

    window.CRIAITOR_SYNC = {

        // Recarregar produtos do Supabase.

        recarregar: () =>

            recarregarCatalogo(true),


        // Consultar versão remota.

        verificarAtualizacoes:

            verificarVersaoRemota,


        // Consultar status.

        obterStatus: () => ({

            conectado: estado.conectado,

            sincronizando: estado.sincronizando,

            atualizacaoPendente:

                estado.atualizacaoPendente,

            ultimaVersao: estado.ultimaVersao,

            ultimaSincronizacao:

                estado.ultimaSincronizacao

        })

    };


    // ======================================
    // 20. INICIALIZAR
    // ======================================

    function iniciar() {

        if (!sb) {

            console.error(

                "CriAItor 3D: conexão Supabase ausente."

            );

            return;

        }


        criarInterface();


        configurarAtualizacaoAposEdicao();


        configurarRetornoPagina();


        configurarSessao();


        iniciarRealtime();


        console.info(

            "CriAItor 3D: módulo de sincronização inicializado."

        );

    }


    // ======================================
    // 21. CARREGAMENTO DO ARQUIVO
    // ======================================

    if (document.readyState === "loading") {

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

})();
