/*
========================================================
CRIAITOR 3D
PAINEL ADMINISTRATIVO
========================================================

VERSÃO 4.0

MÓDULOS:

- Login administrativo
- Produtos
- Estoque
- Pedidos
- Custos
- Simulador de custo de impressão
- Filamentos
- Controle de peso dos filamentos
- Custo por grama
- Exportação CSV
- Backup
- Supabase
- Compatibilidade com fotos-empresa.js
- Compatibilidade com sync-empresa.js

IMPORTANTE:

PRODUTOS:
Supabase

FOTOS:
Supabase Storage
bucket: projetos
pasta: catalogo

CUSTOS:
LocalStorage

FILAMENTOS:
LocalStorage

========================================================
*/

(function () {

"use strict";

/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const CONFIG = {

    tabela: "catalogo",

    registro: 1,

    tituloEmpresa: "CriAItor 3D"

};

const supabase = window.sb;

const UID_ADMIN =

    typeof ADMIN_UID !== "undefined"

        ? ADMIN_UID

        : window.ADMIN_UID || "";


/* =====================================================
   ATALHOS
===================================================== */

const $ = seletor =>

    document.querySelector(seletor);

const $$ = seletor =>

    Array.from(
        document.querySelectorAll(seletor)
    );


/* =====================================================
   ESTADO
===================================================== */

const estado = {

    usuario: null,

    produtos: [],

    pedidos: [],

    custos: [],

    filamentos: [],

    versao: 0,

    produtoEditando: null,

    pedidoEditando: null,

    custoEditando: null,

    filamentoEditando: null,

    salvando: false,

    paginaAtual: "dashboard"

};


/* =====================================================
   UTILITÁRIOS
===================================================== */

function escaparHTML(valor) {

    return String(valor ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#39;");

}


function dinheiro(valor) {

    return new Intl.NumberFormat(

        "pt-BR",

        {

            style: "currency",

            currency: "BRL"

        }

    ).format(

        Number(valor) || 0

    );

}


function numero(valor) {

    const convertido = Number(valor);

    return Number.isFinite(convertido)

        ? convertido

        : 0;

}


function criarID() {

    if (crypto.randomUUID) {

        return crypto.randomUUID();

    }

    return (

        Date.now().toString(36) +

        Math.random().toString(36).slice(2)

    );

}


function agoraISO() {

    return new Date().toISOString();

}


function dataHoje() {

    return new Date()

        .toISOString()

        .slice(0, 10);

}


function formatarData(valor) {

    if (!valor) {

        return "—";

    }

    let data;

    if (String(valor).length === 10) {

        data = new Date(

            valor + "T12:00:00"

        );

    } else {

        data = new Date(valor);

    }

    if (

        Number.isNaN(
            data.getTime()
        )

    ) {

        return "—";

    }

    return data.toLocaleDateString(
        "pt-BR"
    );

}


function imagemSegura(valor) {

    const endereco = String(

        valor || ""

    ).trim();

    if (

        endereco.startsWith("https://") ||

        endereco.startsWith("http://localhost") ||

        endereco.startsWith("assets/") ||

        endereco.startsWith("./assets/")

    ) {

        return endereco;

    }

    return "";

}


/* =====================================================
   NOTIFICAÇÕES
===================================================== */

let temporizadorNotificacao;


function avisar(

    mensagem,

    erro = false

) {

    const notificacao =

        $("#notificacao");

    if (!notificacao) {

        console[

            erro
                ? "error"
                : "log"

        ](mensagem);

        return;

    }

    notificacao.textContent =

        mensagem;

    notificacao.classList.toggle(

        "erro",

        erro

    );

    notificacao.classList.add(

        "visivel"

    );

    clearTimeout(

        temporizadorNotificacao

    );

    temporizadorNotificacao =

        setTimeout(

            () => {

                notificacao.classList.remove(

                    "visivel"

                );

            },

            4200

        );

}


/* =====================================================
   VALIDAR CONFIGURAÇÃO
===================================================== */

function verificarConfiguracao() {

    if (!supabase) {

        throw new Error(

            "Supabase não inicializado. " +

            "Verifique supabase-config.js."

        );

    }

    if (!UID_ADMIN) {

        throw new Error(

            "ADMIN_UID não foi configurada."

        );

    }

}


/* =====================================================
   LOGIN
===================================================== */

function criarTelaLogin() {

    if ($("#tela-login")) {

        return;

    }

    const tela = document.createElement(

        "section"

    );

    tela.id = "tela-login";

    tela.className = "tela-login";

    tela.innerHTML = `

        <form
            id="form-login"
            class="form-login"
        >

            <div class="login-marca">

                <img
                    src="assets/logo-criaitor3d.jpg"
                    alt="CriAItor 3D"
                    class="logo-empresa"
                    draggable="false"
                >

            </div>

            <h2>
                Painel administrativo
            </h2>

            <p>

                Entre com sua conta administrativa
                para gerenciar a CriAItor 3D.

            </p>

            <label for="email-login">

                E-mail

            </label>

            <input
                type="email"
                id="email-login"
                autocomplete="username"
                required
            >

            <label for="senha-login">

                Senha

            </label>

            <input
                type="password"
                id="senha-login"
                autocomplete="current-password"
                required
            >

            <button
                type="submit"
                id="botao-login"
            >

                Entrar no painel

            </button>

            <p
                id="mensagem-login"
                role="status"
                aria-live="polite"
            ></p>

        </form>

    `;

    document.body.prepend(

        tela

    );

}


/* =====================================================
   ESTILOS EXTRAS
   CUSTOS + FILAMENTOS
===================================================== */

function injetarEstilosExtras() {

    if (

        $("#criaitor-estilos-gestao")

    ) {

        return;

    }

    const style = document.createElement(

        "style"

    );

    style.id =

        "criaitor-estilos-gestao";

    style.textContent = `

        .gestao-resumos {

            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 15px;

            margin-bottom: 22px;

        }


        .gestao-card {

            padding: 20px;

            background: var(--painel, #211829);

            border:
                1px solid
                var(--borda, #493550);

            border-radius: 15px;

        }


        .gestao-card span {

            display: block;

            color:
                var(--cinza, #b8a8c3);

            font-size: 10px;

            font-weight: 900;

            letter-spacing: 1px;

        }


        .gestao-card strong {

            display: block;

            margin-top: 10px;

            font-size: 26px;

        }


        .gestao-toolbar {

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            flex-wrap: wrap;

            gap: 12px;

            margin-bottom: 18px;

        }


        .gestao-toolbar input,
        .gestao-toolbar select {

            min-height: 42px;

            padding: 10px 12px;

            background:
                var(--campo, #302438);

            color: white;

            border:
                1px solid
                var(--borda, #493550);

            border-radius: 9px;

        }


        .simulador-grid {

            display: grid;

            grid-template-columns:
                repeat(3, minmax(0, 1fr));

            gap: 14px;

        }


        .simulador-grid label {

            display: flex;

            flex-direction: column;

            gap: 7px;

            color: #e8d7ee;

            font-size: 12px;

            font-weight: 800;

        }


        .simulador-grid input,
        .simulador-grid select {

            width: 100%;

            min-height: 43px;

            padding: 11px;

            background:
                var(--campo, #302438);

            color: white;

            border:
                1px solid #6c5177;

            border-radius: 9px;

        }


        .resultado-custo {

            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 12px;

            margin-top: 18px;

        }


        .resultado-custo div {

            padding: 14px;

            background: #191221;

            border:
                1px solid
                var(--borda, #493550);

            border-radius: 10px;

        }


        .resultado-custo span {

            display: block;

            color:
                var(--cinza, #b8a8c3);

            font-size: 10px;

            font-weight: 800;

        }


        .resultado-custo strong {

            display: block;

            margin-top: 6px;

            color:
                var(--laranja, #ff8927);

            font-size: 18px;

        }


        .barra-estoque {

            width: 100%;

            height: 8px;

            margin-top: 7px;

            overflow: hidden;

            background: #34283c;

            border-radius: 999px;

        }


        .barra-estoque > span {

            display: block;

            height: 100%;

            background:
                var(--roxo, #b12bff);

            border-radius: 999px;

        }


        .estoque-baixo {

            color: #ffb0b0;

            font-weight: 800;

        }


        .estoque-ok {

            color: #91e4b1;

            font-weight: 800;

        }


        @media
        (max-width: 900px) {

            .gestao-resumos,
            .resultado-custo {

                grid-template-columns:
                    repeat(
                        2,
                        minmax(0, 1fr)
                    );

            }

            .simulador-grid {

                grid-template-columns:
                    1fr 1fr;

            }

        }


        @media
        (max-width: 600px) {

            .gestao-resumos,
            .resultado-custo,
            .simulador-grid {

                grid-template-columns:
                    1fr;

            }

        }

    `;

    document.head.appendChild(

        style

    );

}


/* =====================================================
   CRIAR ABAS
===================================================== */

function criarAreasExtras() {

    const menu = $(".menu");

    const main = $("main");

    if (

        !menu ||

        !main

    ) {

        return;

    }


    /* =================================================
       BOTÕES DO MENU
    ================================================= */

    if (

        !menu.querySelector(
            '[data-pagina="custos"]'
        )

    ) {

        menu.insertAdjacentHTML(

            "beforeend",

            `

            <button
                type="button"
                class="menu-item"
                data-pagina="custos"
            >

                ◫ Custos

            </button>


            <button
                type="button"
                class="menu-item"
                data-pagina="filamentos"
            >

                ◉ Filamentos

            </button>

            `

        );

    }


    /* =================================================
       PÁGINA CUSTOS
    ================================================= */

    if (!$("#custos")) {

        main.insertAdjacentHTML(

            "beforeend",

            `

            <section
                class="pagina"
                id="custos"
                hidden
            >

                <div class="cabecalho-pagina">

                    <div>

                        <span class="subtitulo">

                            GESTÃO FINANCEIRA

                        </span>

                        <h1>

                            Controle de

                            <em>custos.</em>

                        </h1>

                        <p>

                            Registre despesas e
                            estime o custo de produção
                            das suas impressões.

                        </p>

                    </div>


                    <div class="grupo-botoes">

                        <button
                            type="button"
                            class="botao botao-secundario"
                            id="exportar-custos"
                        >

                            Exportar CSV

                        </button>


                        <button
                            type="button"
                            class="botao botao-laranja"
                            id="novo-custo"
                        >

                            + Adicionar custo

                        </button>

                    </div>

                </div>


                <!-- RESUMOS -->

                <div class="gestao-resumos">

                    <div class="gestao-card">

                        <span>
                            CUSTOS NO MÊS
                        </span>

                        <strong id="custos-mes">

                            R$ 0,00

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            CUSTOS FIXOS
                        </span>

                        <strong id="custos-fixos">

                            R$ 0,00

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            CUSTOS VARIÁVEIS
                        </span>

                        <strong id="custos-variaveis">

                            R$ 0,00

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            LANÇAMENTOS
                        </span>

                        <strong id="total-custos">

                            0

                        </strong>

                    </div>

                </div>


                <!-- SIMULADOR -->

                <div class="painel">

                    <h2>

                        Simulador de custo
                        de impressão

                    </h2>

                    <p>

                        Selecione um filamento
                        cadastrado e informe o
                        consumo da impressão.

                    </p>


                    <div class="simulador-grid">

                        <label>

                            Filamento

                            <select
                                id="sim-filamento"
                            ></select>

                        </label>


                        <label>

                            Material usado (g)

                            <input
                                type="number"
                                id="sim-gramas"
                                min="0"
                                step="0.01"
                                value="0"
                            >

                        </label>


                        <label>

                            Tempo de impressão (h)

                            <input
                                type="number"
                                id="sim-horas"
                                min="0"
                                step="0.01"
                                value="0"
                            >

                        </label>


                        <label>

                            Potência média (W)

                            <input
                                type="number"
                                id="sim-potencia"
                                min="0"
                                step="1"
                                value="100"
                            >

                        </label>


                        <label>

                            Energia (R$/kWh)

                            <input
                                type="number"
                                id="sim-energia"
                                min="0"
                                step="0.01"
                                value="1"
                            >

                        </label>


                        <label>

                            Acréscimo (%)

                            <input
                                type="number"
                                id="sim-margem"
                                min="0"
                                step="1"
                                value="0"
                            >

                        </label>

                    </div>


                    <div class="resultado-custo">

                        <div>

                            <span>
                                MATERIAL
                            </span>

                            <strong
                                id="sim-custo-material"
                            >

                                R$ 0,00

                            </strong>

                        </div>


                        <div>

                            <span>
                                ENERGIA
                            </span>

                            <strong
                                id="sim-custo-energia"
                            >

                                R$ 0,00

                            </strong>

                        </div>


                        <div>

                            <span>
                                CUSTO DIRETO
                            </span>

                            <strong
                                id="sim-custo-direto"
                            >

                                R$ 0,00

                            </strong>

                        </div>


                        <div>

                            <span>

                                VALOR COM
                                ACRÉSCIMO

                            </span>

                            <strong
                                id="sim-preco-sugerido"
                            >

                                R$ 0,00

                            </strong>

                        </div>

                    </div>

                </div>


                <!-- TABELA -->

                <div class="painel">

                    <div class="gestao-toolbar">

                        <input
                            type="search"
                            id="buscar-custo"
                            placeholder="Buscar custo..."
                        >


                        <select id="filtro-custo">

                            <option value="Todos">

                                Todos os tipos

                            </option>

                            <option value="Fixo">

                                Fixo

                            </option>

                            <option value="Variável">

                                Variável

                            </option>

                        </select>

                    </div>


                    <div class="tabela-container">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        DESCRIÇÃO
                                    </th>

                                    <th>
                                        CATEGORIA
                                    </th>

                                    <th>
                                        TIPO
                                    </th>

                                    <th>
                                        VALOR
                                    </th>

                                    <th>
                                        DATA
                                    </th>

                                    <th>
                                        AÇÕES
                                    </th>

                                </tr>

                            </thead>

                            <tbody
                                id="tabela-custos"
                            ></tbody>

                        </table>

                    </div>

                </div>

            </section>

            `

        );

    }


    /* =================================================
       FILAMENTOS
    ================================================= */

    if (!$("#filamentos")) {

        main.insertAdjacentHTML(

            "beforeend",

            `

            <section
                class="pagina"
                id="filamentos"
                hidden
            >

                <div class="cabecalho-pagina">

                    <div>

                        <span class="subtitulo">

                            ESTOQUE DE
                            MATÉRIA-PRIMA

                        </span>

                        <h1>

                            Controle de

                            <em>filamentos.</em>

                        </h1>

                        <p>

                            Acompanhe material,
                            cor, custo por grama
                            e quantidade disponível.

                        </p>

                    </div>


                    <div class="grupo-botoes">

                        <button
                            type="button"
                            class="botao botao-secundario"
                            id="exportar-filamentos"
                        >

                            Exportar CSV

                        </button>


                        <button
                            type="button"
                            class="botao botao-laranja"
                            id="novo-filamento"
                        >

                            + Adicionar filamento

                        </button>

                    </div>

                </div>


                <div class="gestao-resumos">

                    <div class="gestao-card">

                        <span>
                            ROLOS CADASTRADOS
                        </span>

                        <strong
                            id="total-filamentos"
                        >

                            0

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            PESO DISPONÍVEL
                        </span>

                        <strong
                            id="peso-filamentos"
                        >

                            0 kg

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            VALOR DO ESTOQUE
                        </span>

                        <strong
                            id="valor-filamentos"
                        >

                            R$ 0,00

                        </strong>

                    </div>


                    <div class="gestao-card">

                        <span>
                            ESTOQUE BAIXO
                        </span>

                        <strong
                            id="filamentos-baixos"
                        >

                            0

                        </strong>

                    </div>

                </div>


                <div class="painel">

                    <div class="gestao-toolbar">

                        <input
                            type="search"
                            id="buscar-filamento"
                            placeholder="Buscar marca, material ou cor..."
                        >


                        <select
                            id="filtro-material"
                        >

                            <option value="Todos">

                                Todos os materiais

                            </option>

                        </select>

                    </div>


                    <div class="tabela-container">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        FILAMENTO
                                    </th>

                                    <th>
                                        MATERIAL
                                    </th>

                                    <th>
                                        COR
                                    </th>

                                    <th>
                                        RESTANTE
                                    </th>

                                    <th>
                                        CUSTO/GRAMA
                                    </th>

                                    <th>
                                        STATUS
                                    </th>

                                    <th>
                                        AÇÕES
                                    </th>

                                </tr>

                            </thead>

                            <tbody
                                id="tabela-filamentos"
                            ></tbody>

                        </table>

                    </div>

                </div>

            </section>

            `

        );

    }

}


/* =====================================================
   MODAL CUSTOS + FILAMENTOS
===================================================== */

function criarModaisExtras() {

    if (!$("#modal-custo")) {

        document.body.insertAdjacentHTML(

            "beforeend",

            `

            <dialog
                class="modal"
                id="modal-custo"
            >

                <form id="form-custo">

                    <div class="modal-cabecalho">

                        <h2 id="titulo-modal-custo">

                            Novo custo

                        </h2>

                        <button
                            type="button"
                            class="fechar-modal"
                            data-fechar="modal-custo"
                        >
                            ×
                        </button>

                    </div>


                    <div class="campos">

                        <label class="campo campo-inteiro">

                            Descrição

                            <input
                                type="text"
                                name="descricao"
                                maxlength="120"
                                required
                            >

                        </label>


                        <label class="campo">

                            Categoria

                            <input
                                type="text"
                                name="categoria"
                                maxlength="60"
                                placeholder="Energia, embalagem..."
                                required
                            >

                        </label>


                        <label class="campo">

                            Tipo

                            <select
                                name="tipo"
                                required
                            >

                                <option
                                    value="Variável"
                                >

                                    Variável

                                </option>

                                <option
                                    value="Fixo"
                                >

                                    Fixo

                                </option>

                            </select>

                        </label>


                        <label class="campo">

                            Valor (R$)

                            <input
                                type="number"
                                name="valor"
                                min="0"
                                step="0.01"
                                required
                            >

                        </label>


                        <label class="campo">

                            Data

                            <input
                                type="date"
                                name="data"
                                required
                            >

                        </label>


                        <label class="campo campo-inteiro">

                            Observações

                            <textarea
                                name="observacoes"
                                rows="3"
                                maxlength="400"
                            ></textarea>

                        </label>

                    </div>


                    <div class="modal-acoes">

                        <button
                            type="button"
                            class="botao botao-secundario"
                            data-fechar="modal-custo"
                        >

                            Cancelar

                        </button>

                        <button
                            type="submit"
                            class="botao botao-laranja"
                        >

                            Salvar custo

                        </button>

                    </div>

                </form>

            </dialog>

            `

        );

    }


    if (!$("#modal-filamento")) {

        document.body.insertAdjacentHTML(

            "beforeend",

            `

            <dialog
                class="modal"
                id="modal-filamento"
            >

                <form id="form-filamento">

                    <div class="modal-cabecalho">

                        <h2
                            id="titulo-modal-filamento"
                        >

                            Novo filamento

                        </h2>

                        <button
                            type="button"
                            class="fechar-modal"
                            data-fechar="modal-filamento"
                        >

                            ×

                        </button>

                    </div>


                    <div class="campos">

                        <label class="campo">

                            Marca

                            <input
                                type="text"
                                name="marca"
                                maxlength="80"
                                required
                            >

                        </label>


                        <label class="campo">

                            Material

                            <input
                                type="text"
                                name="material"
                                placeholder="PLA, PETG..."
                                required
                            >

                        </label>


                        <label class="campo">

                            Cor

                            <input
                                type="text"
                                name="cor"
                                required
                            >

                        </label>


                        <label class="campo">

                            Diâmetro (mm)

                            <input
                                type="number"
                                name="diametro"
                                min="1"
                                max="3"
                                step="0.01"
                                value="1.75"
                                required
                            >

                        </label>


                        <label class="campo">

                            Peso original (g)

                            <input
                                type="number"
                                name="pesoOriginal"
                                min="1"
                                step="1"
                                value="1000"
                                required
                            >

                        </label>


                        <label class="campo">

                            Peso restante (g)

                            <input
                                type="number"
                                name="pesoRestante"
                                min="0"
                                step="1"
                                value="1000"
                                required
                            >

                        </label>


                        <label class="campo">

                            Valor pago (R$)

                            <input
                                type="number"
                                name="valorPago"
                                min="0"
                                step="0.01"
                                required
                            >

                        </label>


                        <label class="campo">

                            Avisar abaixo de (g)

                            <input
                                type="number"
                                name="limiteBaixo"
                                min="0"
                                step="1"
                                value="200"
                                required
                            >

                        </label>


                        <label class="campo campo-inteiro">

                            Observações

                            <textarea
                                name="observacoes"
                                rows="3"
                                maxlength="400"
                            ></textarea>

                        </label>

                    </div>


                    <div class="modal-acoes">

                        <button
                            type="button"
                            class="botao botao-secundario"
                            data-fechar="modal-filamento"
                        >

                            Cancelar

                        </button>

                        <button
                            type="submit"
                            class="botao botao-laranja"
                        >

                            Salvar filamento

                        </button>

                    </div>

                </form>

            </dialog>

            `

        );

    }

}


/* =====================================================
   LOGIN
===================================================== */

async function realizarLogin(evento) {

    evento.preventDefault();

    const email =

        $("#email-login")
            .value
            .trim();

    const senha =

        $("#senha-login")
            .value;

    const botao =

        $("#botao-login");

    const mensagem =

        $("#mensagem-login");


    botao.disabled = true;

    mensagem.textContent =

        "Verificando acesso...";


    try {

        verificarConfiguracao();


        const {

            data,

            error

        } = await supabase.auth
            .signInWithPassword({

                email,

                password: senha

            });


        if (error) {

            throw error;

        }


        if (

            !data.user ||

            data.user.id !== UID_ADMIN

        ) {

            await supabase.auth.signOut();

            throw new Error(

                "Esta conta não possui " +
                "acesso administrativo."

            );

        }


        estado.usuario = data.user;

        $("#senha-login").value = "";

        await entrarPainel();


    } catch (erro) {

        console.error(

            "Erro no login:",

            erro

        );

        mensagem.textContent =

            erro.message;

    } finally {

        botao.disabled = false;

    }

}


/* =====================================================
   SESSÃO
===================================================== */

async function verificarSessao() {

    verificarConfiguracao();


    const {

        data,

        error

    } = await supabase.auth
        .getUser();


    if (

        error ||

        !data.user

    ) {

        return null;

    }


    if (

        data.user.id !== UID_ADMIN

    ) {

        await supabase.auth.signOut();

        return null;

    }


    return data.user;

}


/* =====================================================
   LOGIN / LOGOUT
===================================================== */

function mostrarLogin() {

    estado.usuario = null;

    estado.produtos = [];

    estado.pedidos = [];

    estado.custos = [];

    estado.filamentos = [];


    const app = $(".app");

    const tela = $("#tela-login");


    if (app) {

        app.hidden = true;

    }


    if (tela) {

        tela.hidden = false;

    }

}


async function entrarPainel() {

    const usuario =

        await verificarSessao();


    if (!usuario) {

        mostrarLogin();

        return;

    }


    estado.usuario = usuario;


    await carregarCatalogo();


    carregarDadosLocais();


    $("#tela-login").hidden = true;

    $(".app").hidden = false;


    abrirPagina("dashboard");

    atualizarPainel();

}


async function sairPainel() {

    try {

        await supabase.auth
            .signOut();

    } finally {

        mostrarLogin();

    }

}


/* =====================================================
   BOTÃO SAIR
===================================================== */

function criarBotaoSair() {

    if ($("#botao-sair")) {

        return;

    }


    const topbar = $(".topbar");


    if (!topbar) {

        return;

    }


    const botao =

        document.createElement(
            "button"
        );


    botao.id = "botao-sair";

    botao.type = "button";

    botao.className =

        "botao botao-secundario";

    botao.textContent = "Sair";


    botao.addEventListener(

        "click",

        sairPainel

    );


    topbar.appendChild(

        botao

    );

}


/* =====================================================
   SUPABASE - CATÁLOGO
===================================================== */

async function carregarCatalogo() {

    const {

        data,

        error

    } = await supabase

        .from(CONFIG.tabela)

        .select(
            "id, produtos, versao"
        )

        .eq(
            "id",
            CONFIG.registro
        )

        .single();


    if (error) {

        throw new Error(

            "Erro ao carregar catálogo: " +

            error.message

        );

    }


    if (

        !Array.isArray(
            data.produtos
        )

    ) {

        throw new Error(

            "A coluna produtos precisa " +

            "conter uma lista JSON."

        );

    }


    estado.produtos =

        data.produtos;


    estado.versao =

        Number(data.versao) || 0;


    atualizarPainel();

}


/* =====================================================
   SALVAR CATÁLOGO
===================================================== */

async function salvarCatalogo(

    novosProdutos

) {

    if (estado.salvando) {

        throw new Error(

            "Já existe uma alteração " +

            "em andamento."

        );

    }


    const usuario =

        await verificarSessao();


    if (!usuario) {

        throw new Error(

            "Sua sessão expirou. " +

            "Faça login novamente."

        );

    }


    estado.salvando = true;


    try {

        const novaVersao =

            estado.versao + 1;


        const {

            data,

            error

        } = await supabase

            .from(CONFIG.tabela)

            .update({

                produtos: novosProdutos,

                versao: novaVersao

            })

            .eq(
                "id",
                CONFIG.registro
            )

            .eq(
                "versao",
                estado.versao
            )

            .select(
                "produtos, versao"
            );


        if (error) {

            throw error;

        }


        if (

            !data ||

            data.length === 0

        ) {

            throw new Error(

                "O catálogo foi alterado " +

                "em outra sessão. " +

                "Recarregue antes de salvar."

            );

        }


        estado.produtos =

            data[0].produtos;


        estado.versao =

            Number(
                data[0].versao
            );


        atualizarPainel();


        return data[0];


    } finally {

        estado.salvando = false;

    }

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function abrirPagina(nome) {

    estado.paginaAtual = nome;


    $$(".pagina")
        .forEach(

            pagina => {

                const ativa =

                    pagina.id === nome;


                pagina.hidden =

                    !ativa;


                pagina.classList.toggle(

                    "ativa",

                    ativa

                );

            }

        );


    $$("[data-pagina]")
        .forEach(

            botao => {

                botao.classList.toggle(

                    "ativo",

                    botao.dataset.pagina ===
                        nome

                );

            }

        );


    const titulos = {

        dashboard:
            "Visão geral",

        produtos:
            "Produtos",

        pedidos:
            "Pedidos",

        publicar:
            "Sincronização",

        custos:
            "Custos",

        filamentos:
            "Filamentos"

    };


    const titulo =

        $("#titulo-pagina");


    if (titulo) {

        titulo.textContent =

            titulos[nome] || nome;

    }

}


/* =====================================================
   LOCALSTORAGE
===================================================== */

function chaveLocal(tipo) {

    const uid =

        estado.usuario?.id ||

        "sem_usuario";


    return (

        "criaitor3d_" +

        tipo +

        "_" +

        uid

    );

}


function lerListaLocal(tipo) {

    try {

        const dados =

            localStorage.getItem(
                chaveLocal(tipo)
            );


        const lista =

            dados

                ? JSON.parse(dados)

                : [];


        return Array.isArray(lista)

            ? lista

            : [];


    } catch {

        return [];

    }

}


function salvarListaLocal(

    tipo,

    lista

) {

    localStorage.setItem(

        chaveLocal(tipo),

        JSON.stringify(lista)

    );

}


function carregarDadosLocais() {

    estado.pedidos =

        lerListaLocal("pedidos");


    estado.custos =

        lerListaLocal("custos");


    estado.filamentos =

        lerListaLocal("filamentos");

}


/* =====================================================
   PERSISTÊNCIA
===================================================== */

function persistirPedidos() {

    salvarListaLocal(

        "pedidos",

        estado.pedidos

    );

    atualizarPainel();

}


function persistirCustos() {

    salvarListaLocal(

        "custos",

        estado.custos

    );

    atualizarPainel();

}


function persistirFilamentos() {

    salvarListaLocal(

        "filamentos",

        estado.filamentos

    );

    atualizarPainel();

}


/* =====================================================
   DASHBOARD
===================================================== */

function atualizarIndicadores() {

    const visiveis =

        estado.produtos.filter(

            produto =>

                produto.disponivel !==
                    false

        );


    const estoque =

        estado.produtos.reduce(

            (

                total,

                produto

            ) =>

                total +

                numero(
                    produto.estoque
                ),

            0

        );


    const pedidosAbertos =

        estado.pedidos.filter(

            pedido =>

                ![

                    "Entregue",

                    "Cancelado"

                ].includes(
                    pedido.status
                )

        );


    if ($("#total-produtos")) {

        $("#total-produtos")
            .textContent =

            estado.produtos.length;

    }


    if ($("#total-visiveis")) {

        $("#total-visiveis")
            .textContent =

            visiveis.length;

    }


    if ($("#total-estoque")) {

        $("#total-estoque")
            .textContent =

            estoque;

    }


    if ($("#total-pedidos")) {

        $("#total-pedidos")
            .textContent =

            pedidosAbertos.length;

    }

}


/* =====================================================
   PRODUTOS RECENTES
===================================================== */

function renderizarProdutosRecentes() {

    const container =

        $("#produtos-recentes");


    if (!container) {

        return;

    }


    const produtos =

        estado.produtos

            .slice(-5)

            .reverse();


    if (!produtos.length) {

        container.innerHTML = `

            <p>

                Você ainda não cadastrou
                produtos.

            </p>

        `;

        return;

    }


    container.innerHTML =

        produtos.map(

            produto => {

                const imagem =

                    imagemSegura(
                        produto.imagem
                    );


                return `

                    <div
                        class="produto-recente"
                    >

                        ${

                            imagem

                                ? `

                                    <img
                                        src="${escaparHTML(
                                            imagem
                                        )}"
                                        alt=""
                                        loading="lazy"
                                    >

                                `

                                : ""

                        }


                        <div
                            class="produto-recente-info"
                        >

                            <strong>

                                ${escaparHTML(
                                    produto.nome
                                )}

                            </strong>

                            <span>

                                ${escaparHTML(
                                    produto.categoria
                                )}

                            </span>

                        </div>


                        <b>

                            ${dinheiro(
                                produto.preco
                            )}

                        </b>

                    </div>

                `;

            }

        ).join("");

}


/* =====================================================
   TABELA PRODUTOS
===================================================== */

function renderizarProdutos() {

    const tabela =

        $("#tabela-produtos");


    if (!tabela) {

        return;

    }


    const busca =

        (
            $("#buscar-produto")
                ?.value || ""
        )

        .trim()

        .toLowerCase();


    const produtos =

        estado.produtos.filter(

            produto => {

                const nome =

                    String(
                        produto.nome || ""
                    )

                    .toLowerCase();


                const categoria =

                    String(
                        produto.categoria || ""
                    )

                    .toLowerCase();


                return (

                    nome.includes(busca) ||

                    categoria.includes(busca)

                );

            }

        );


    if ($("#contador-produtos")) {

        $("#contador-produtos")
            .textContent =

            produtos.length === 1

                ? "1 produto"

                : produtos.length +
                    " produtos";

    }


    if (!produtos.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum produto encontrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        produtos.map(

            produto => {

                const imagem =

                    imagemSegura(
                        produto.imagem
                    );


                return `

                    <tr>

                        <td>

                            <div
                                class="produto-celula"
                            >

                                ${

                                    imagem

                                        ? `

                                            <img
                                                src="${escaparHTML(
                                                    imagem
                                                )}"
                                                alt=""
                                            >

                                        `

                                        : ""

                                }


                                <div>

                                    <strong>

                                        ${escaparHTML(
                                            produto.nome
                                        )}

                                    </strong>

                                    <small>

                                        ${escaparHTML(
                                            produto.prazo ||
                                            ""
                                        )}

                                    </small>

                                </div>

                            </div>

                        </td>


                        <td>

                            ${escaparHTML(
                                produto.categoria
                            )}

                        </td>


                        <td>

                            ${dinheiro(
                                produto.preco
                            )}

                        </td>


                        <td>

                            ${numero(
                                produto.estoque
                            )}

                        </td>


                        <td>

                            <span class="${
                                produto.disponivel !== false
                                    ? "visivel"
                                    : "oculto"
                            }">

                                ${
                                    produto.disponivel !== false
                                        ? "Visível"
                                        : "Oculto"
                                }

                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="botao-pequeno"
                                data-acao-produto="editar"
                                data-id="${escaparHTML(
                                    produto.id
                                )}"
                            >

                                Editar

                            </button>


                            <button
                                type="button"
                                class="botao-pequeno botao-excluir"
                                data-acao-produto="excluir"
                                data-id="${escaparHTML(
                                    produto.id
                                )}"
                            >

                                Excluir

                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("");

}


/* =====================================================
   PRODUTOS
===================================================== */

function abrirNovoProduto() {

    estado.produtoEditando = null;


    const form =

        $("#form-produto");


    form.reset();


    $("#titulo-modal-produto")
        .textContent =

        "Novo produto";


    $("#modal-produto")
        .showModal();

}


function editarProduto(id) {

    const produto =

        estado.produtos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!produto) {

        avisar(

            "Produto não encontrado.",

            true

        );

        return;

    }


    estado.produtoEditando =

        produto.id;


    const form =

        $("#form-produto");


    form.reset();


    const campos =

        form.elements;


    campos.nome.value =

        produto.nome || "";


    campos.categoria.value =

        produto.categoria || "";


    campos.preco.value =

        numero(
            produto.preco
        );


    campos.estoque.value =

        numero(
            produto.estoque
        );


    campos.prazo.value =

        produto.prazo || "";


    campos.imagem.value =

        produto.imagem || "";


    campos.descricao.value =

        produto.descricao || "";


    campos.disponivel.checked =

        produto.disponivel !== false;


    campos.destaque.checked =

        produto.destaque === true;


    campos.imagem.dispatchEvent(

        new Event("change")

    );


    $("#titulo-modal-produto")
        .textContent =

        "Editar produto";


    $("#modal-produto")
        .showModal();

}


async function salvarProduto(

    evento

) {

    evento.preventDefault();


    const form =

        $("#form-produto");


    const botao =

        form.querySelector(

            'button[type="submit"]'

        );


    if (estado.salvando) {

        return;

    }


    botao.disabled = true;


    try {

        const campos =

            form.elements;


        const nome =

            campos.nome.value.trim();


        const categoria =

            campos.categoria
                .value
                .trim();


        const preco =

            Number(
                campos.preco.value
            );


        const estoque =

            Number(
                campos.estoque.value
            );


        if (

            !nome ||

            !categoria

        ) {

            throw new Error(

                "Preencha nome e categoria."

            );

        }


        if (

            !Number.isFinite(preco) ||

            preco < 0

        ) {

            throw new Error(

                "Informe um preço válido."

            );

        }


        if (

            !Number.isInteger(estoque) ||

            estoque < 0

        ) {

            throw new Error(

                "Informe um estoque válido."

            );

        }


        const anterior =

            estado.produtos.find(

                produto =>

                    String(produto.id) ===

                    String(
                        estado.produtoEditando
                    )

            );


        const produto = {

            ...(anterior || {}),

            id:

                anterior?.id ||

                criarID(),

            nome,

            categoria,

            preco,

            estoque,

            prazo:

                campos.prazo
                    .value
                    .trim(),

            imagem:

                campos.imagem
                    .value
                    .trim(),

            descricao:

                campos.descricao
                    .value
                    .trim(),

            disponivel:

                campos.disponivel
                    .checked,

            destaque:

                campos.destaque
                    .checked,

            atualizado_em:

                agoraISO()

        };


        let novosProdutos;


        if (anterior) {

            novosProdutos =

                estado.produtos.map(

                    item =>

                        String(item.id) ===
                        String(anterior.id)

                            ? produto

                            : item

                );

        } else {

            novosProdutos = [

                ...estado.produtos,

                produto

            ];

        }


        await salvarCatalogo(

            novosProdutos

        );


        $("#modal-produto")
            .close();


        estado.produtoEditando =

            null;


        avisar(

            "Produto salvo com sucesso!"

        );


    } catch (erro) {

        console.error(erro);


        avisar(

            "Erro ao salvar produto: " +

            erro.message,

            true

        );


    } finally {

        botao.disabled = false;

    }

}


async function excluirProduto(id) {

    const produto =

        estado.produtos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!produto) {

        return;

    }


    if (

        !confirm(

            `Deseja excluir "${produto.nome}"?`

        )

    ) {

        return;

    }


    try {

        const novosProdutos =

            estado.produtos.filter(

                item =>

                    String(item.id) !==
                    String(id)

            );


        await salvarCatalogo(

            novosProdutos

        );


        avisar(

            "Produto excluído."

        );


    } catch (erro) {

        avisar(

            erro.message,

            true

        );

    }

}


/* =====================================================
   PEDIDOS
===================================================== */

function renderizarPedidos() {

    const tabela =

        $("#tabela-pedidos");


    if (!tabela) {

        return;

    }


    if (!estado.pedidos.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum pedido registrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        [...estado.pedidos]

        .reverse()

        .map(

            pedido => `

                <tr>

                    <td>

                        <strong>

                            ${escaparHTML(
                                pedido.cliente
                            )}

                        </strong>

                        <small>

                            ${escaparHTML(
                                pedido.contato
                            )}

                        </small>

                    </td>

                    <td>

                        ${escaparHTML(
                            pedido.itens
                        )}

                    </td>

                    <td>

                        ${dinheiro(
                            pedido.valor
                        )}

                    </td>

                    <td>

                        <span class="etiqueta">

                            ${escaparHTML(
                                pedido.status
                            )}

                        </span>

                    </td>

                    <td>

                        ${formatarData(
                            pedido.data
                        )}

                    </td>

                    <td>

                        <button
                            type="button"
                            class="botao-pequeno"
                            data-acao-pedido="editar"
                            data-id="${escaparHTML(
                                pedido.id
                            )}"
                        >

                            Editar

                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-acao-pedido="excluir"
                            data-id="${escaparHTML(
                                pedido.id
                            )}"
                        >

                            Excluir

                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


function abrirNovoPedido() {

    estado.pedidoEditando = null;

    $("#form-pedido").reset();

    $("#modal-pedido")
        .showModal();

}


function editarPedido(id) {

    const pedido =

        estado.pedidos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!pedido) {

        return;

    }


    estado.pedidoEditando =

        pedido.id;


    const form =

        $("#form-pedido");


    form.reset();


    const campos =

        form.elements;


    campos.cliente.value =

        pedido.cliente || "";


    campos.contato.value =

        pedido.contato || "";


    campos.itens.value =

        pedido.itens || "";


    campos.valor.value =

        numero(
            pedido.valor
        );


    campos.status.value =

        pedido.status || "Novo";


    $("#modal-pedido")
        .showModal();

}


function salvarPedido(evento) {

    evento.preventDefault();


    try {

        const campos =

            $("#form-pedido")
                .elements;


        const anterior =

            estado.pedidos.find(

                item =>

                    String(item.id) ===

                    String(
                        estado.pedidoEditando
                    )

            );


        const pedido = {

            ...(anterior || {}),

            id:

                anterior?.id ||

                criarID(),

            cliente:

                campos.cliente
                    .value
                    .trim(),

            contato:

                campos.contato
                    .value
                    .trim(),

            itens:

                campos.itens
                    .value
                    .trim(),

            valor:

                numero(
                    campos.valor.value
                ),

            status:

                campos.status.value,

            data:

                anterior?.data ||

                agoraISO(),

            atualizado_em:

                agoraISO()

        };


        if (

            !pedido.cliente ||

            !pedido.itens

        ) {

            throw new Error(

                "Preencha cliente e produtos."

            );

        }


        if (anterior) {

            estado.pedidos =

                estado.pedidos.map(

                    item =>

                        String(item.id) ===
                        String(anterior.id)

                            ? pedido

                            : item

                );

        } else {

            estado.pedidos.push(

                pedido

            );

        }


        persistirPedidos();


        $("#modal-pedido")
            .close();


        estado.pedidoEditando =

            null;


        avisar(

            "Pedido salvo!"

        );


    } catch (erro) {

        avisar(

            erro.message,

            true

        );

    }

}


function excluirPedido(id) {

    if (

        !confirm(
            "Deseja excluir este pedido?"
        )

    ) {

        return;

    }


    estado.pedidos =

        estado.pedidos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    persistirPedidos();


    avisar(

        "Pedido excluído."

    );

}


/* =====================================================
   CUSTOS
===================================================== */

function custosDoMesAtual() {

    const agora = new Date();

    const ano =

        agora.getFullYear();

    const mes =

        agora.getMonth();


    return estado.custos.filter(

        custo => {

            if (!custo.data) {

                return false;

            }


            const data =

                new Date(

                    custo.data +
                    "T12:00:00"

                );


            return (

                data.getFullYear() === ano &&

                data.getMonth() === mes

            );

        }

    );

}


function renderizarResumoCustos() {

    if (!$("#custos-mes")) {

        return;

    }


    const lista =

        custosDoMesAtual();


    const total =

        lista.reduce(

            (soma, item) =>

                soma +

                numero(item.valor),

            0

        );


    const fixos =

        lista

        .filter(

            item =>

                item.tipo === "Fixo"

        )

        .reduce(

            (soma, item) =>

                soma +

                numero(item.valor),

            0

        );


    const variaveis =

        lista

        .filter(

            item =>

                item.tipo === "Variável"

        )

        .reduce(

            (soma, item) =>

                soma +

                numero(item.valor),

            0

        );


    $("#custos-mes")
        .textContent =

        dinheiro(total);


    $("#custos-fixos")
        .textContent =

        dinheiro(fixos);


    $("#custos-variaveis")
        .textContent =

        dinheiro(variaveis);


    $("#total-custos")
        .textContent =

        estado.custos.length;

}


function renderizarCustos() {

    const tabela =

        $("#tabela-custos");


    if (!tabela) {

        return;

    }


    const busca =

        (
            $("#buscar-custo")
                ?.value || ""
        )

        .trim()

        .toLowerCase();


    const filtro =

        $("#filtro-custo")
            ?.value ||

        "Todos";


    const lista =

        [...estado.custos]

        .filter(

            item => {

                const texto =

                    `${item.descricao} ${item.categoria} ${item.tipo}`

                    .toLowerCase();


                return (

                    (
                        !busca ||

                        texto.includes(busca)
                    )

                    &&

                    (
                        filtro === "Todos" ||

                        item.tipo === filtro
                    )

                );

            }

        )

        .sort(

            (a, b) =>

                String(b.data)

                .localeCompare(
                    String(a.data)
                )

        );


    if (!lista.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum custo encontrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        lista.map(

            item => `

                <tr>

                    <td>

                        <strong>

                            ${escaparHTML(
                                item.descricao
                            )}

                        </strong>

                        ${

                            item.observacoes

                                ? `

                                    <small>

                                        ${escaparHTML(
                                            item.observacoes
                                        )}

                                    </small>

                                `

                                : ""

                        }

                    </td>

                    <td>

                        ${escaparHTML(
                            item.categoria
                        )}

                    </td>

                    <td>

                        <span class="etiqueta">

                            ${escaparHTML(
                                item.tipo
                            )}

                        </span>

                    </td>

                    <td>

                        ${dinheiro(
                            item.valor
                        )}

                    </td>

                    <td>

                        ${formatarData(
                            item.data
                        )}

                    </td>

                    <td>

                        <button
                            type="button"
                            class="botao-pequeno"
                            data-acao-custo="editar"
                            data-id="${escaparHTML(
                                item.id
                            )}"
                        >

                            Editar

                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-acao-custo="excluir"
                            data-id="${escaparHTML(
                                item.id
                            )}"
                        >

                            Excluir

                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


function abrirNovoCusto() {

    estado.custoEditando = null;


    const form =

        $("#form-custo");


    form.reset();


    form.elements.data.value =

        dataHoje();


    $("#titulo-modal-custo")
        .textContent =

        "Novo custo";


    $("#modal-custo")
        .showModal();

}


function editarCusto(id) {

    const custo =

        estado.custos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!custo) {

        return;

    }


    estado.custoEditando =

        custo.id;


    const form =

        $("#form-custo");


    form.reset();


    form.elements.descricao.value =

        custo.descricao || "";


    form.elements.categoria.value =

        custo.categoria || "";


    form.elements.tipo.value =

        custo.tipo || "Variável";


    form.elements.valor.value =

        numero(custo.valor);


    form.elements.data.value =

        custo.data ||
        dataHoje();


    form.elements.observacoes.value =

        custo.observacoes || "";


    $("#titulo-modal-custo")
        .textContent =

        "Editar custo";


    $("#modal-custo")
        .showModal();

}


function salvarCusto(evento) {

    evento.preventDefault();


    const campos =

        $("#form-custo")
            .elements;


    const anterior =

        estado.custos.find(

            item =>

                String(item.id) ===

                String(
                    estado.custoEditando
                )

        );


    const custo = {

        ...(anterior || {}),

        id:

            anterior?.id ||

            criarID(),

        descricao:

            campos.descricao
                .value
                .trim(),

        categoria:

            campos.categoria
                .value
                .trim(),

        tipo:

            campos.tipo.value,

        valor:

            numero(
                campos.valor.value
            ),

        data:

            campos.data.value,

        observacoes:

            campos.observacoes
                .value
                .trim(),

        atualizado_em:

            agoraISO()

    };


    if (

        !custo.descricao ||

        !custo.categoria ||

        !custo.data

    ) {

        avisar(

            "Preencha os campos obrigatórios.",

            true

        );

        return;

    }


    if (custo.valor < 0) {

        avisar(

            "Valor inválido.",

            true

        );

        return;

    }


    if (anterior) {

        estado.custos =

            estado.custos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? custo

                        : item

            );

    } else {

        estado.custos.push(

            custo

        );

    }


    persistirCustos();


    $("#modal-custo")
        .close();


    estado.custoEditando =

        null;


    avisar(

        "Custo salvo!"

    );

}


function excluirCusto(id) {

    if (

        !confirm(
            "Deseja excluir este custo?"
        )

    ) {

        return;

    }


    estado.custos =

        estado.custos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    persistirCustos();


    avisar(

        "Custo excluído."

    );

}


/* =====================================================
   FILAMENTOS
===================================================== */

function custoPorGramaFilamento(

    item

) {

    const peso =

        numero(
            item.pesoOriginal
        );


    const valor =

        numero(
            item.valorPago
        );


    return peso > 0

        ? valor / peso

        : 0;

}


function valorEstoqueFilamento(

    item

) {

    return (

        custoPorGramaFilamento(item) *

        numero(
            item.pesoRestante
        )

    );

}


function filamentoBaixo(item) {

    return (

        numero(
            item.pesoRestante
        )

        <=

        numero(
            item.limiteBaixo
        )

    );

}


function renderizarResumoFilamentos() {

    if (!$("#total-filamentos")) {

        return;

    }


    const peso =

        estado.filamentos.reduce(

            (soma, item) =>

                soma +

                numero(
                    item.pesoRestante
                ),

            0

        );


    const valor =

        estado.filamentos.reduce(

            (soma, item) =>

                soma +

                valorEstoqueFilamento(
                    item
                ),

            0

        );


    const baixos =

        estado.filamentos.filter(

            filamentoBaixo

        ).length;


    $("#total-filamentos")
        .textContent =

        estado.filamentos.length;


    $("#peso-filamentos")
        .textContent =

        (
            peso / 1000
        ).toLocaleString(

            "pt-BR",

            {

                maximumFractionDigits: 2

            }

        ) +

        " kg";


    $("#valor-filamentos")
        .textContent =

        dinheiro(valor);


    $("#filamentos-baixos")
        .textContent =

        baixos;

}


function atualizarFiltroMateriais() {

    const select =

        $("#filtro-material");


    if (!select) {

        return;

    }


    const atual =

        select.value ||

        "Todos";


    const materiais =

        Array.from(

            new Set(

                estado.filamentos

                .map(

                    item =>

                        String(
                            item.material || ""
                        ).trim()

                )

                .filter(Boolean)

            )

        )

        .sort(

            (a, b) =>

                a.localeCompare(

                    b,

                    "pt-BR"

                )

        );


    select.innerHTML = `

        <option value="Todos">

            Todos os materiais

        </option>

        ${

            materiais.map(

                material => `

                    <option
                        value="${escaparHTML(
                            material
                        )}"
                    >

                        ${escaparHTML(
                            material
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    select.value =

        materiais.includes(atual)

            ? atual

            : "Todos";

}


function renderizarFilamentos() {

    const tabela =

        $("#tabela-filamentos");


    if (!tabela) {

        return;

    }


    atualizarFiltroMateriais();


    const busca =

        (
            $("#buscar-filamento")
                ?.value || ""
        )

        .trim()

        .toLowerCase();


    const filtro =

        $("#filtro-material")
            ?.value ||

        "Todos";


    const lista =

        estado.filamentos.filter(

            item => {

                const texto =

                    `${item.marca} ${item.material} ${item.cor}`

                    .toLowerCase();


                return (

                    (
                        !busca ||

                        texto.includes(busca)
                    )

                    &&

                    (
                        filtro === "Todos" ||

                        item.material === filtro
                    )

                );

            }

        );


    if (!lista.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="7">

                    Nenhum filamento cadastrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        lista.map(

            item => {

                const original =

                    Math.max(

                        1,

                        numero(
                            item.pesoOriginal
                        )

                    );


                const restante =

                    Math.max(

                        0,

                        numero(
                            item.pesoRestante
                        )

                    );


                const percentual =

                    Math.max(

                        0,

                        Math.min(

                            100,

                            (
                                restante /
                                original
                            ) * 100

                        )

                    );


                const baixo =

                    filamentoBaixo(
                        item
                    );


                return `

                    <tr>

                        <td>

                            <strong>

                                ${escaparHTML(
                                    item.marca
                                )}

                            </strong>

                            <small>

                                ${numero(
                                    item.diametro
                                ).toLocaleString(
                                    "pt-BR"
                                )}
                                mm

                            </small>

                        </td>


                        <td>

                            ${escaparHTML(
                                item.material
                            )}

                        </td>


                        <td>

                            ${escaparHTML(
                                item.cor
                            )}

                        </td>


                        <td>

                            <strong>

                                ${restante.toLocaleString(
                                    "pt-BR"
                                )}
                                g

                            </strong>

                            <small>

                                de
                                ${original.toLocaleString(
                                    "pt-BR"
                                )}
                                g

                            </small>


                            <div
                                class="barra-estoque"
                            >

                                <span
                                    style="
                                        width:
                                        ${percentual}%
                                    "
                                ></span>

                            </div>

                        </td>


                        <td>

                            ${dinheiro(
                                custoPorGramaFilamento(
                                    item
                                )
                            )}

                        </td>


                        <td>

                            <span class="${
                                baixo
                                    ? "estoque-baixo"
                                    : "estoque-ok"
                            }">

                                ${
                                    baixo
                                        ? "Baixo"
                                        : "OK"
                                }

                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="botao-pequeno"
                                data-acao-filamento="editar"
                                data-id="${escaparHTML(
                                    item.id
                                )}"
                            >

                                Editar

                            </button>


                            <button
                                type="button"
                                class="botao-pequeno botao-excluir"
                                data-acao-filamento="excluir"
                                data-id="${escaparHTML(
                                    item.id
                                )}"
                            >

                                Excluir

                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("");

}


function abrirNovoFilamento() {

    estado.filamentoEditando =

        null;


    const form =

        $("#form-filamento");


    form.reset();


    form.elements.diametro.value =

        "1.75";


    form.elements.pesoOriginal.value =

        "1000";


    form.elements.pesoRestante.value =

        "1000";


    form.elements.limiteBaixo.value =

        "200";


    $("#titulo-modal-filamento")
        .textContent =

        "Novo filamento";


    $("#modal-filamento")
        .showModal();

}


function editarFilamento(id) {

    const filamento =

        estado.filamentos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!filamento) {

        return;

    }


    estado.filamentoEditando =

        filamento.id;


    const form =

        $("#form-filamento");


    form.reset();


    form.elements.marca.value =

        filamento.marca || "";


    form.elements.material.value =

        filamento.material || "";


    form.elements.cor.value =

        filamento.cor || "";


    form.elements.diametro.value =

        numero(
            filamento.diametro
        ) || 1.75;


    form.elements.pesoOriginal.value =

        numero(
            filamento.pesoOriginal
        ) || 1000;


    form.elements.pesoRestante.value =

        numero(
            filamento.pesoRestante
        );


    form.elements.valorPago.value =

        numero(
            filamento.valorPago
        );


    form.elements.limiteBaixo.value =

        numero(
            filamento.limiteBaixo
        ) || 200;


    form.elements.observacoes.value =

        filamento.observacoes || "";


    $("#titulo-modal-filamento")
        .textContent =

        "Editar filamento";


    $("#modal-filamento")
        .showModal();

}


function salvarFilamento(evento) {

    evento.preventDefault();


    const campos =

        $("#form-filamento")
            .elements;


    const anterior =

        estado.filamentos.find(

            item =>

                String(item.id) ===

                String(
                    estado.filamentoEditando
                )

        );


    const filamento = {

        ...(anterior || {}),

        id:

            anterior?.id ||

            criarID(),

        marca:

            campos.marca
                .value
                .trim(),

        material:

            campos.material
                .value
                .trim(),

        cor:

            campos.cor
                .value
                .trim(),

        diametro:

            numero(
                campos.diametro.value
            ),

        pesoOriginal:

            numero(
                campos.pesoOriginal.value
            ),

        pesoRestante:

            numero(
                campos.pesoRestante.value
            ),

        valorPago:

            numero(
                campos.valorPago.value
            ),

        limiteBaixo:

            numero(
                campos.limiteBaixo.value
            ),

        observacoes:

            campos.observacoes
                .value
                .trim(),

        atualizado_em:

            agoraISO()

    };


    if (

        !filamento.marca ||

        !filamento.material ||

        !filamento.cor

    ) {

        avisar(

            "Preencha marca, material e cor.",

            true

        );

        return;

    }


    if (

        filamento.pesoOriginal <= 0 ||

        filamento.pesoRestante < 0 ||

        filamento.valorPago < 0

    ) {

        avisar(

            "Confira peso e valor.",

            true

        );

        return;

    }


    if (

        filamento.pesoRestante >

        filamento.pesoOriginal

    ) {

        avisar(

            "O peso restante não pode ser " +

            "maior que o original.",

            true

        );

        return;

    }


    if (anterior) {

        estado.filamentos =

            estado.filamentos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? filamento

                        : item

            );

    } else {

        estado.filamentos.push(

            filamento

        );

    }


    persistirFilamentos();


    $("#modal-filamento")
        .close();


    estado.filamentoEditando =

        null;


    avisar(

        "Filamento salvo!"

    );

}


function excluirFilamento(id) {

    if (

        !confirm(
            "Deseja excluir este filamento?"
        )

    ) {

        return;

    }


    estado.filamentos =

        estado.filamentos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    persistirFilamentos();


    avisar(

        "Filamento excluído."

    );

}


/* =====================================================
   SIMULADOR DE CUSTO
===================================================== */

function renderizarSeletorSimulador() {

    const select =

        $("#sim-filamento");


    if (!select) {

        return;

    }


    const atual =

        select.value;


    select.innerHTML = `

        <option value="">

            Selecione um filamento

        </option>

        ${

            estado.filamentos.map(

                item => `

                    <option
                        value="${escaparHTML(
                            item.id
                        )}"
                    >

                        ${escaparHTML(
                            item.material
                        )}
                        -
                        ${escaparHTML(
                            item.cor
                        )}
                        -
                        ${escaparHTML(
                            item.marca
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    if (

        estado.filamentos.some(

            item =>

                String(item.id) ===
                String(atual)

        )

    ) {

        select.value = atual;

    }

}


function calcularSimulador() {

    const select =

        $("#sim-filamento");


    if (!select) {

        return;

    }


    const filamento =

        estado.filamentos.find(

            item =>

                String(item.id) ===
                String(select.value)

        );


    const gramas =

        Math.max(

            0,

            numero(
                $("#sim-gramas")
                    ?.value
            )

        );


    const horas =

        Math.max(

            0,

            numero(
                $("#sim-horas")
                    ?.value
            )

        );


    const potencia =

        Math.max(

            0,

            numero(
                $("#sim-potencia")
                    ?.value
            )

        );


    const tarifa =

        Math.max(

            0,

            numero(
                $("#sim-energia")
                    ?.value
            )

        );


    const margem =

        Math.max(

            0,

            numero(
                $("#sim-margem")
                    ?.value
            )

        );


    const material =

        filamento

            ? gramas *

                custoPorGramaFilamento(
                    filamento
                )

            : 0;


    const energia =

        (
            potencia /
            1000
        )

        *

        horas

        *

        tarifa;


    const direto =

        material +

        energia;


    const sugerido =

        direto *

        (
            1 +

            margem / 100
        );


    $("#sim-custo-material")
        .textContent =

        dinheiro(material);


    $("#sim-custo-energia")
        .textContent =

        dinheiro(energia);


    $("#sim-custo-direto")
        .textContent =

        dinheiro(direto);


    $("#sim-preco-sugerido")
        .textContent =

        dinheiro(sugerido);

}


/* =====================================================
   ATUALIZAR TELA
===================================================== */

function atualizarPainel() {

    atualizarIndicadores();

    renderizarProdutosRecentes();

    renderizarProdutos();

    renderizarPedidos();

    renderizarResumoCustos();

    renderizarCustos();

    renderizarResumoFilamentos();

    renderizarFilamentos();

    renderizarSeletorSimulador();

    calcularSimulador();


    const data =

        $("#data-atual");


    if (data) {

        data.textContent =

            new Date()

            .toLocaleDateString(

                "pt-BR",

                {

                    day: "2-digit",

                    month: "long",

                    year: "numeric"

                }

            );

    }

}


/* =====================================================
   EXPORTAÇÃO
===================================================== */

function baixarArquivo(

    nome,

    conteudo,

    tipo

) {

    const blob =

        new Blob(

            [conteudo],

            {

                type: tipo

            }

        );


    const url =

        URL.createObjectURL(
            blob
        );


    const link =

        document.createElement(
            "a"
        );


    link.href = url;

    link.download = nome;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(

        () =>

            URL.revokeObjectURL(
                url
            ),

        1000

    );

}


function campoCSV(valor) {

    let texto =

        String(valor ?? "");


    if (

        /^[\s]*[=+\-@]/
        .test(texto)

    ) {

        texto = "'" + texto;

    }


    return (

        '"' +

        texto.replaceAll(

            '"',

            '""'

        ) +

        '"'

    );

}


function exportarCatalogo() {

    baixarArquivo(

        "catalogo.js",

        "window.CRIAITOR_CATALOGO = " +

        JSON.stringify(

            estado.produtos,

            null,

            2

        ) +

        ";\n",

        "text/javascript;charset=utf-8"

    );

}


function exportarPedidos() {

    const cabecalho = [

        "Cliente",

        "Contato",

        "Produtos",

        "Valor",

        "Status",

        "Data"

    ];


    const linhas =

        estado.pedidos.map(

            item => [

                item.cliente,

                item.contato,

                item.itens,

                item.valor,

                item.status,

                formatarData(
                    item.data
                )

            ]

            .map(campoCSV)

            .join(";")

        );


    baixarArquivo(

        "pedidos-criaitor3d.csv",

        "\uFEFF" +

        [

            cabecalho

                .map(campoCSV)

                .join(";"),

            ...linhas

        ].join("\r\n"),

        "text/csv;charset=utf-8"

    );

}


function exportarCustos() {

    const cabecalho = [

        "Descrição",

        "Categoria",

        "Tipo",

        "Valor",

        "Data",

        "Observações"

    ];


    const linhas =

        estado.custos.map(

            item => [

                item.descricao,

                item.categoria,

                item.tipo,

                item.valor,

                item.data,

                item.observacoes

            ]

            .map(campoCSV)

            .join(";")

        );


    baixarArquivo(

        "custos-criaitor3d.csv",

        "\uFEFF" +

        [

            cabecalho

                .map(campoCSV)

                .join(";"),

            ...linhas

        ].join("\r\n"),

        "text/csv;charset=utf-8"

    );

}


function exportarFilamentos() {

    const cabecalho = [

        "Marca",

        "Material",

        "Cor",

        "Diâmetro",

        "Peso original",

        "Peso restante",

        "Valor pago",

        "Custo por grama"

    ];


    const linhas =

        estado.filamentos.map(

            item => [

                item.marca,

                item.material,

                item.cor,

                item.diametro,

                item.pesoOriginal,

                item.pesoRestante,

                item.valorPago,

                custoPorGramaFilamento(
                    item
                )

            ]

            .map(campoCSV)

            .join(";")

        );


    baixarArquivo(

        "filamentos-criaitor3d.csv",

        "\uFEFF" +

        [

            cabecalho

                .map(campoCSV)

                .join(";"),

            ...linhas

        ].join("\r\n"),

        "text/csv;charset=utf-8"

    );

}


/* =====================================================
   BACKUP
===================================================== */

function exportarBackup() {

    const backup = {

        empresa:

            CONFIG.tituloEmpresa,

        data:

            agoraISO(),

        versaoCatalogo:

            estado.versao,

        produtos:

            estado.produtos,

        pedidos:

            estado.pedidos,

        custos:

            estado.custos,

        filamentos:

            estado.filamentos

    };


    baixarArquivo(

        "backup-criaitor3d.json",

        JSON.stringify(

            backup,

            null,

            2

        ),

        "application/json;charset=utf-8"

    );


    avisar(

        "Backup exportado."

    );

}


async function restaurarBackup(

    evento

) {

    const arquivo =

        evento.target.files?.[0];


    if (!arquivo) {

        return;

    }


    try {

        const backup =

            JSON.parse(

                await arquivo.text()

            );


        if (

            !Array.isArray(
                backup.pedidos
            )

            &&

            !Array.isArray(
                backup.custos
            )

            &&

            !Array.isArray(
                backup.filamentos
            )

        ) {

            throw new Error(

                "Backup incompatível."

            );

        }


        if (

            !confirm(

                "Restaurar pedidos, custos " +

                "e filamentos? " +

                "Os produtos do Supabase " +

                "não serão alterados."

            )

        ) {

            return;

        }


        if (

            Array.isArray(
                backup.pedidos
            )

        ) {

            estado.pedidos =

                backup.pedidos;

        }


        if (

            Array.isArray(
                backup.custos
            )

        ) {

            estado.custos =

                backup.custos;

        }


        if (

            Array.isArray(
                backup.filamentos
            )

        ) {

            estado.filamentos =

                backup.filamentos;

        }


        salvarListaLocal(

            "pedidos",

            estado.pedidos

        );


        salvarListaLocal(

            "custos",

            estado.custos

        );


        salvarListaLocal(

            "filamentos",

            estado.filamentos

        );


        atualizarPainel();


        avisar(

            "Backup restaurado."

        );


    } catch (erro) {

        avisar(

            "Erro no backup: " +

            erro.message,

            true

        );


    } finally {

        evento.target.value = "";

    }

}


/* =====================================================
   EVENTOS
===================================================== */

function configurarEventos() {

    /* MENU */

    document.addEventListener(

        "click",

        evento => {

            const pagina =

                evento.target.closest(
                    "[data-pagina]"
                );


            if (pagina) {

                abrirPagina(

                    pagina.dataset.pagina

                );

                return;

            }


            const ir =

                evento.target.closest(
                    "[data-ir]"
                );


            if (ir) {

                abrirPagina(

                    ir.dataset.ir

                );

                return;

            }


            const fechar =

                evento.target.closest(
                    "[data-fechar]"
                );


            if (fechar) {

                const modal =

                    document.getElementById(

                        fechar.dataset.fechar

                    );


                if (modal?.open) {

                    modal.close();

                }

            }

        }

    );


    /* PRODUTOS */

    $("#novo-produto")
        ?.addEventListener(

            "click",

            abrirNovoProduto

        );


    $("#novo-produto-topo")
        ?.addEventListener(

            "click",

            abrirNovoProduto

        );


    $("#form-produto")
        ?.addEventListener(

            "submit",

            salvarProduto

        );


    $("#buscar-produto")
        ?.addEventListener(

            "input",

            renderizarProdutos

        );


    $("#tabela-produtos")
        ?.addEventListener(

            "click",

            evento => {

                const botao =

                    evento.target.closest(
                        "[data-acao-produto]"
                    );


                if (!botao) {

                    return;

                }


                if (

                    botao.dataset
                        .acaoProduto ===
                    "editar"

                ) {

                    editarProduto(

                        botao.dataset.id

                    );

                } else {

                    excluirProduto(

                        botao.dataset.id

                    );

                }

            }

        );


    /* PEDIDOS */

    $("#novo-pedido")
        ?.addEventListener(

            "click",

            abrirNovoPedido

        );


    $("#form-pedido")
        ?.addEventListener(

            "submit",

            salvarPedido

        );


    $("#tabela-pedidos")
        ?.addEventListener(

            "click",

            evento => {

                const botao =

                    evento.target.closest(
                        "[data-acao-pedido]"
                    );


                if (!botao) {

                    return;

                }


                if (

                    botao.dataset
                        .acaoPedido ===
                    "editar"

                ) {

                    editarPedido(

                        botao.dataset.id

                    );

                } else {

                    excluirPedido(

                        botao.dataset.id

                    );

                }

            }

        );


    /* CUSTOS */

    $("#novo-custo")
        ?.addEventListener(

            "click",

            abrirNovoCusto

        );


    $("#form-custo")
        ?.addEventListener(

            "submit",

            salvarCusto

        );


    $("#buscar-custo")
        ?.addEventListener(

            "input",

            renderizarCustos

        );


    $("#filtro-custo")
        ?.addEventListener(

            "change",

            renderizarCustos

        );


    $("#tabela-custos")
        ?.addEventListener(

            "click",

            evento => {

                const botao =

                    evento.target.closest(
                        "[data-acao-custo]"
                    );


                if (!botao) {

                    return;

                }


                if (

                    botao.dataset
                        .acaoCusto ===
                    "editar"

                ) {

                    editarCusto(

                        botao.dataset.id

                    );

                } else {

                    excluirCusto(

                        botao.dataset.id

                    );

                }

            }

        );


    /* FILAMENTOS */

    $("#novo-filamento")
        ?.addEventListener(

            "click",

            abrirNovoFilamento

        );


    $("#form-filamento")
        ?.addEventListener(

            "submit",

            salvarFilamento

        );


    $("#buscar-filamento")
        ?.addEventListener(

            "input",

            renderizarFilamentos

        );


    $("#filtro-material")
        ?.addEventListener(

            "change",

            renderizarFilamentos

        );


    $("#tabela-filamentos")
        ?.addEventListener(

            "click",

            evento => {

                const botao =

                    evento.target.closest(
                        "[data-acao-filamento]"
                    );


                if (!botao) {

                    return;

                }


                if (

                    botao.dataset
                        .acaoFilamento ===
                    "editar"

                ) {

                    editarFilamento(

                        botao.dataset.id

                    );

                } else {

                    excluirFilamento(

                        botao.dataset.id

                    );

                }

            }

        );


    /* SIMULADOR */

    [

        "#sim-filamento",

        "#sim-gramas",

        "#sim-horas",

        "#sim-potencia",

        "#sim-energia",

        "#sim-margem"

    ].forEach(

        seletor => {

            $(seletor)
                ?.addEventListener(

                    "input",

                    calcularSimulador

                );


            $(seletor)
                ?.addEventListener(

                    "change",

                    calcularSimulador

                );

        }

    );


    /* EXPORTAÇÃO */

    $("#exportar-catalogo")
        ?.addEventListener(

            "click",

            exportarCatalogo

        );


    $("#exportar-pedidos")
        ?.addEventListener(

            "click",

            exportarPedidos

        );


    $("#exportar-custos")
        ?.addEventListener(

            "click",

            exportarCustos

        );


    $("#exportar-filamentos")
        ?.addEventListener(

            "click",

            exportarFilamentos

        );


    $("#baixar-backup")
        ?.addEventListener(

            "click",

            exportarBackup

        );


    $("#restaurar-backup")
        ?.addEventListener(

            "change",

            restaurarBackup

        );

}


/* =====================================================
   VERIFICAR ATUALIZAÇÕES SUPABASE
===================================================== */

async function verificarAtualizacoes() {

    if (

        !estado.usuario ||

        estado.salvando ||

        $("#modal-produto")
            ?.open

    ) {

        return;

    }


    try {

        const {

            data,

            error

        } = await supabase

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


        if (

            Number(data.versao) !==

            estado.versao

        ) {

            await carregarCatalogo();

        }


    } catch (erro) {

        console.warn(

            "Falha ao verificar atualizações:",

            erro.message

        );

    }

}


/* =====================================================
   API PARA OUTROS ARQUIVOS
===================================================== */

window.CRIAITOR_ADMIN = {

    recarregar:
        carregarCatalogo,

    atualizar:
        atualizarPainel,

    abrirPagina,

    abrirNovoProduto,

    getProdutos:

        () => [
            ...estado.produtos
        ],

    getVersao:

        () => estado.versao,

    getUsuario:

        () => estado.usuario,

    getCustos:

        () => [
            ...estado.custos
        ],

    getFilamentos:

        () => [
            ...estado.filamentos
        ],

    custoPorGramaFilamento

};


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function iniciarPainel() {

    try {

        criarTelaLogin();

        injetarEstilosExtras();

        criarAreasExtras();

        criarModaisExtras();

        criarBotaoSair();


        configurarEventos();


        $("#form-login")
            .addEventListener(

                "submit",

                realizarLogin

            );


        verificarConfiguracao();


        const usuario =

            await verificarSessao();


        if (usuario) {

            await entrarPainel();

        } else {

            mostrarLogin();

        }


    } catch (erro) {

        console.error(

            "Erro ao inicializar painel:",

            erro

        );


        criarTelaLogin();

        mostrarLogin();


        const mensagem =

            $("#mensagem-login");


        if (mensagem) {

            mensagem.textContent =

                erro.message;

        }

    }

}


/* =====================================================
   MONITORAR SESSÃO
===================================================== */

if (supabase) {

    supabase.auth
        .onAuthStateChange(

            (

                _evento,

                sessao

            ) => {

                if (!sessao) {

                    mostrarLogin();

                }

            }

        );

}


/* =====================================================
   INICIAR
===================================================== */

if (

    document.readyState ===
    "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarPainel,

        {

            once: true

        }

    );

} else {

    iniciarPainel();

}


/* =====================================================
   VERIFICAÇÃO AUTOMÁTICA
===================================================== */

setInterval(

    verificarAtualizacoes,

    30000

);

})();
