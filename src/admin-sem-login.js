(function () {

"use strict";


const CONFIG = {

    tabela:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.tabelaCatalogo ||
        "catalogo",

    registro:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.registroCatalogo ||
        1

};


const sb = window.sb;


const estado = {

    produtos: [],

    pedidos: [],

    custos: [],

    filamentos: [],

    versao: 0,

    produtoEditando: null,

    pedidoEditando: null,

    custoEditando: null,

    filamentoEditando: null,

    salvandoCatalogo: false

};


const $ = seletor =>
    document.querySelector(seletor);


const $$ = seletor =>
    Array.from(
        document.querySelectorAll(seletor)
    );


/* =====================================================
   UTILITÁRIOS
===================================================== */

function numero(valor) {

    const n =
        Number(valor);

    return Number.isFinite(n)
        ? n
        : 0;

}


function dinheiro(valor) {

    return new Intl.NumberFormat(

        "pt-BR",

        {

            style: "currency",

            currency: "BRL"

        }

    ).format(

        numero(valor)

    );

}


function escaparHTML(valor) {

    return String(valor ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#39;");

}


function criarID() {

    if (

        window.crypto &&
        crypto.randomUUID

    ) {

        return crypto.randomUUID();

    }


    return (

        Date.now().toString(36) +

        Math.random()
            .toString(36)
            .slice(2)

    );

}


function agoraISO() {

    return new Date()
        .toISOString();

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


    const data =

        String(valor).length === 10

            ? new Date(
                valor +
                "T12:00:00"
            )

            : new Date(valor);


    if (

        Number.isNaN(
            data.getTime()
        )

    ) {

        return "—";

    }


    return data
        .toLocaleDateString(
            "pt-BR"
        );

}


/* =====================================================
   AVISOS
===================================================== */

let timerAviso;


function avisar(

    mensagem,

    erro = false

) {

    const elemento =
        $("#notificacao");


    if (!elemento) {

        console.log(
            mensagem
        );

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.classList.toggle(

        "erro",

        erro

    );


    elemento.classList.add(
        "visivel"
    );


    clearTimeout(
        timerAviso
    );


    timerAviso =
        setTimeout(

            () => {

                elemento.classList.remove(
                    "visivel"
                );

            },

            3500

        );

}


/* =====================================================
   LOCAL STORAGE
===================================================== */

function chaveLocal(tipo) {

    return (
        "criaitor3d_" +
        tipo
    );

}


function lerLocal(tipo) {

    try {

        const bruto =
            localStorage.getItem(
                chaveLocal(tipo)
            );


        if (!bruto) {

            return [];

        }


        const dados =
            JSON.parse(bruto);


        return Array.isArray(dados)

            ? dados

            : [];


    } catch {

        return [];

    }

}


function gravarLocal(

    tipo,

    dados

) {

    localStorage.setItem(

        chaveLocal(tipo),

        JSON.stringify(dados)

    );

}


function carregarDadosLocais() {

    estado.pedidos =
        lerLocal("pedidos");


    estado.custos =
        lerLocal("custos");


    estado.filamentos =
        lerLocal("filamentos");

}


function salvarPedidosLocal() {

    gravarLocal(
        "pedidos",
        estado.pedidos
    );

    atualizarPainel();

}


function salvarCustosLocal() {

    gravarLocal(
        "custos",
        estado.custos
    );

    atualizarPainel();

}


function salvarFilamentosLocal() {

    gravarLocal(
        "filamentos",
        estado.filamentos
    );

    atualizarPainel();

}


/* =====================================================
   CATÁLOGO
===================================================== */

async function carregarCatalogo() {

    if (!sb) {

        throw new Error(
            "Supabase não inicializado."
        );

    }


    const {

        data,

        error

    } = await sb

        .from(CONFIG.tabela)

        .select(
            "produtos, versao"
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


    estado.produtos =

        Array.isArray(
            data.produtos
        )

            ? data.produtos

            : [];


    estado.versao =
        numero(
            data.versao
        );


    atualizarPainel();

}


async function salvarCatalogo(
    produtos
) {

    if (

        estado.salvandoCatalogo

    ) {

        throw new Error(
            "Salvamento em andamento."
        );

    }


    estado.salvandoCatalogo =
        true;


    try {

        const novaVersao =
            estado.versao + 1;


        const {

            data,

            error

        } = await sb

            .from(CONFIG.tabela)

            .update({

                produtos,

                versao:
                    novaVersao

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

                "Recarregue a página."

            );

        }


        estado.produtos =
            data[0].produtos;


        estado.versao =
            numero(
                data[0].versao
            );


        atualizarPainel();


    } finally {

        estado.salvandoCatalogo =
            false;

    }

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function abrirPagina(nome) {

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

        custos:
            "Custos",

        filamentos:
            "Filamentos",

        publicar:
            "Sincronização"

    };


    if ($("#titulo-pagina")) {

        $("#titulo-pagina")
            .textContent =

            titulos[nome] ||
            nome;

    }

}


/* =====================================================
   DASHBOARD
===================================================== */

function atualizarIndicadores() {

    const visiveis =

        estado.produtos.filter(

            item =>

                item.disponivel !==
                false

        );


    const estoque =

        estado.produtos.reduce(

            (total, item) =>

                total +

                numero(
                    item.estoque
                ),

            0

        );


    const pedidosAbertos =

        estado.pedidos.filter(

            item =>

                ![
                    "Entregue",
                    "Cancelado"
                ].includes(
                    item.status
                )

        );


    $("#total-produtos").textContent =
        estado.produtos.length;


    $("#total-visiveis").textContent =
        visiveis.length;


    $("#total-estoque").textContent =
        estoque;


    $("#total-pedidos").textContent =
        pedidosAbertos.length;

}


function renderizarRecentes() {

    const container =
        $("#produtos-recentes");


    if (!container) {

        return;

    }


    const lista =

        estado.produtos

        .slice(-5)

        .reverse();


    if (!lista.length) {

        container.innerHTML = `

            <p>
                Nenhum produto cadastrado.
            </p>

        `;

        return;

    }


    container.innerHTML =

        lista.map(

            produto => `

                <div class="produto-recente">

                    ${

                        produto.imagem

                            ? `

                                <img
                                    src="${escaparHTML(
                                        produto.imagem
                                    )}"
                                    alt=""
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

            `

        ).join("");

}


/* =====================================================
   PRODUTOS
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


    const lista =

        estado.produtos.filter(

            produto => {

                const texto =

                    `${produto.nome || ""} ${produto.categoria || ""}`

                    .toLowerCase();


                return texto.includes(
                    busca
                );

            }

        );


    $("#contador-produtos")
        .textContent =

        lista.length === 1

            ? "1 produto"

            : `${lista.length} produtos`;


    if (!lista.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum produto cadastrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        lista.map(

            produto => `

                <tr>

                    <td>

                        <strong>
                            ${escaparHTML(
                                produto.nome
                            )}
                        </strong>

                        <small>
                            ${escaparHTML(
                                produto.prazo || ""
                            )}
                        </small>

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
                            data-produto-editar="${escaparHTML(
                                produto.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-produto-excluir="${escaparHTML(
                                produto.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


function abrirNovoProduto() {

    estado.produtoEditando =
        null;


    const form =
        $("#form-produto");


    form.reset();


    form.elements.estoque.value =
        0;


    form.elements.prazo.value =
        "Produção sob encomenda";


    form.elements.disponivel.checked =
        true;


    form.elements.imagem.value =
        "";


    form.elements.imagem.dispatchEvent(
        new Event("change")
    );


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


    const campos =
        form.elements;


    const nome =
        campos.nome.value.trim();


    const categoria =
        campos.categoria
            .value
            .trim();


    if (

        !nome ||
        !categoria

    ) {

        avisar(

            "Informe nome e categoria.",

            true

        );

        return;

    }


    const anterior =

        estado.produtos.find(

            item =>

                String(item.id) ===

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

        preco:

            numero(
                campos.preco.value
            ),

        estoque:

            Math.max(

                0,

                Math.trunc(

                    numero(
                        campos.estoque.value
                    )

                )

            ),

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


    const novosProdutos =

        anterior

            ? estado.produtos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? produto

                        : item

            )

            : [

                ...estado.produtos,

                produto

            ];


    try {

        await salvarCatalogo(
            novosProdutos
        );


        estado.produtoEditando =
            null;


        $("#modal-produto")
            .close();


        avisar(
            "Produto salvo."
        );


    } catch (erro) {

        console.error(erro);


        avisar(

            "Erro ao salvar produto: " +

            erro.message,

            true

        );

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

            `Excluir "${produto.nome}"?`

        )

    ) {

        return;

    }


    try {

        await salvarCatalogo(

            estado.produtos.filter(

                item =>

                    String(item.id) !==
                    String(id)

            )

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
                                pedido.contato || ""
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
                        ${escaparHTML(
                            pedido.status
                        )}
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
                            data-pedido-editar="${escaparHTML(
                                pedido.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-pedido-excluir="${escaparHTML(
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

    estado.pedidoEditando =
        null;


    $("#form-pedido")
        .reset();


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


    const campos =
        $("#form-pedido")
            .elements;


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


function salvarPedido(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
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

        avisar(

            "Preencha cliente e produtos.",

            true

        );

        return;

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


    salvarPedidosLocal();


    estado.pedidoEditando =
        null;


    $("#modal-pedido")
        .close();


    avisar(
        "Pedido salvo."
    );

}


function excluirPedido(id) {

    if (

        !confirm(
            "Excluir este pedido?"
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


    salvarPedidosLocal();

}


/* =====================================================
   CUSTOS
===================================================== */

function custosMesAtual() {

    const hoje =
        new Date();


    return estado.custos.filter(

        item => {

            if (!item.data) {

                return false;

            }


            const data =

                new Date(

                    item.data +
                    "T12:00:00"

                );


            return (

                data.getFullYear() ===
                hoje.getFullYear()

                &&

                data.getMonth() ===
                hoje.getMonth()

            );

        }

    );

}


function renderizarCustos() {

    if (!$("#tabela-custos")) {

        return;

    }


    const mes =
        custosMesAtual();


    const somar =
        lista =>

            lista.reduce(

                (total, item) =>

                    total +
                    numero(item.valor),

                0

            );


    const fixos =
        mes.filter(
            item =>
                item.tipo === "Fixo"
        );


    const variaveis =
        mes.filter(
            item =>
                item.tipo === "Variável"
        );


    $("#custos-mes")
        .textContent =
        dinheiro(
            somar(mes)
        );


    $("#custos-fixos")
        .textContent =
        dinheiro(
            somar(fixos)
        );


    $("#custos-variaveis")
        .textContent =
        dinheiro(
            somar(variaveis)
        );


    $("#total-custos")
        .textContent =
        estado.custos.length;


    const busca =

        (
            $("#buscar-custo")
                ?.value || ""
        )

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

                    `${item.descricao || ""} ${item.categoria || ""}`

                    .toLowerCase();


                return (

                    texto.includes(
                        busca
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

        $("#tabela-custos")
            .innerHTML = `

                <tr>
                    <td colspan="6">
                        Nenhum custo cadastrado.
                    </td>
                </tr>

            `;

        return;

    }


    $("#tabela-custos")
        .innerHTML =

        lista.map(

            item => `

                <tr>

                    <td>
                        ${escaparHTML(
                            item.descricao
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            item.categoria
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            item.tipo
                        )}
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
                            data-custo-editar="${escaparHTML(
                                item.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-custo-excluir="${escaparHTML(
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

    estado.custoEditando =
        null;


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


    const campos =
        $("#form-custo")
            .elements;


    campos.descricao.value =
        custo.descricao || "";


    campos.categoria.value =
        custo.categoria || "";


    campos.tipo.value =
        custo.tipo || "Variável";


    campos.valor.value =
        numero(
            custo.valor
        );


    campos.data.value =
        custo.data ||
        dataHoje();


    campos.observacoes.value =
        custo.observacoes || "";


    $("#titulo-modal-custo")
        .textContent =
        "Editar custo";


    $("#modal-custo")
        .showModal();

}


function salvarCusto(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
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


    salvarCustosLocal();


    estado.custoEditando =
        null;


    $("#modal-custo")
        .close();


    avisar(
        "Custo salvo."
    );

}


function excluirCusto(id) {

    if (

        !confirm(
            "Excluir este custo?"
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


    salvarCustosLocal();

}


/* =====================================================
   FILAMENTOS
===================================================== */

function custoGrama(
    item
) {

    const peso =
        numero(
            item.pesoOriginal
        );


    if (peso <= 0) {

        return 0;

    }


    return (

        numero(
            item.valorPago
        )

        /

        peso

    );

}


function filamentoBaixo(
    item
) {

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


function atualizarFiltroMateriais() {

    const select =
        $("#filtro-material");


    if (!select) {

        return;

    }


    const atual =
        select.value;


    const materiais =

        Array.from(

            new Set(

                estado.filamentos

                    .map(
                        item =>
                            item.material
                    )

                    .filter(Boolean)

            )

        )

        .sort();


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


    if (

        materiais.includes(
            atual
        )

    ) {

        select.value =
            atual;

    }

}


function renderizarFilamentos() {

    if (!$("#tabela-filamentos")) {

        return;

    }


    const pesoTotal =

        estado.filamentos.reduce(

            (total, item) =>

                total +

                numero(
                    item.pesoRestante
                ),

            0

        );


    const valorEstoque =

        estado.filamentos.reduce(

            (total, item) =>

                total +

                (
                    numero(
                        item.pesoRestante
                    )

                    *

                    custoGrama(item)

                ),

            0

        );


    $("#total-filamentos")
        .textContent =
        estado.filamentos.length;


    $("#peso-filamentos")
        .textContent =

        (
            pesoTotal /
            1000
        )

        .toLocaleString(

            "pt-BR",

            {
                maximumFractionDigits: 2
            }

        )

        +

        " kg";


    $("#valor-filamentos")
        .textContent =
        dinheiro(
            valorEstoque
        );


    $("#filamentos-baixos")
        .textContent =

        estado.filamentos
            .filter(
                filamentoBaixo
            )
            .length;


    atualizarFiltroMateriais();


    const busca =

        (
            $("#buscar-filamento")
                ?.value || ""
        )

        .toLowerCase();


    const filtro =

        $("#filtro-material")
            ?.value ||
        "Todos";


    const lista =

        estado.filamentos.filter(

            item => {

                const texto =

                    `${item.marca || ""} ${item.material || ""} ${item.cor || ""}`

                    .toLowerCase();


                return (

                    texto.includes(
                        busca
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

        $("#tabela-filamentos")
            .innerHTML = `

                <tr>
                    <td colspan="7">
                        Nenhum filamento cadastrado.
                    </td>
                </tr>

            `;


        renderizarSimulador();

        return;

    }


    $("#tabela-filamentos")
        .innerHTML =

        lista.map(

            item => {

                const restante =
                    numero(
                        item.pesoRestante
                    );


                const original =

                    Math.max(

                        1,

                        numero(
                            item.pesoOriginal
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

                            ${restante}
                            g

                            <div
                                class="barra-estoque"
                            >

                                <span
                                    style="
                                        width:
                                        ${percentual}%;
                                    "
                                ></span>

                            </div>

                        </td>

                        <td>
                            ${dinheiro(
                                custoGrama(
                                    item
                                )
                            )}
                        </td>

                        <td>

                            <span class="${
                                filamentoBaixo(item)
                                    ? "estoque-baixo"
                                    : "estoque-ok"
                            }">

                                ${
                                    filamentoBaixo(item)
                                        ? "Baixo"
                                        : "OK"
                                }

                            </span>

                        </td>

                        <td>

                            <button
                                type="button"
                                class="botao-pequeno"
                                data-filamento-editar="${escaparHTML(
                                    item.id
                                )}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="botao-pequeno botao-excluir"
                                data-filamento-excluir="${escaparHTML(
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


    renderizarSimulador();

}


function abrirNovoFilamento() {

    estado.filamentoEditando =
        null;


    const form =
        $("#form-filamento");


    form.reset();


    form.elements.diametro.value =
        1.75;


    form.elements.pesoOriginal.value =
        1000;


    form.elements.pesoRestante.value =
        1000;


    form.elements.limiteBaixo.value =
        200;


    $("#titulo-modal-filamento")
        .textContent =
        "Novo filamento";


    $("#modal-filamento")
        .showModal();

}


function editarFilamento(id) {

    const item =

        estado.filamentos.find(

            filamento =>

                String(
                    filamento.id
                )

                ===

                String(id)

        );


    if (!item) {

        return;

    }


    estado.filamentoEditando =
        item.id;


    const campos =
        $("#form-filamento")
            .elements;


    campos.marca.value =
        item.marca || "";


    campos.material.value =
        item.material || "";


    campos.cor.value =
        item.cor || "";


    campos.diametro.value =
        numero(
            item.diametro
        ) || 1.75;


    campos.pesoOriginal.value =
        numero(
            item.pesoOriginal
        );


    campos.pesoRestante.value =
        numero(
            item.pesoRestante
        );


    campos.valorPago.value =
        numero(
            item.valorPago
        );


    campos.limiteBaixo.value =
        numero(
            item.limiteBaixo
        );


    campos.observacoes.value =
        item.observacoes || "";


    $("#titulo-modal-filamento")
        .textContent =
        "Editar filamento";


    $("#modal-filamento")
        .showModal();

}


function salvarFilamento(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
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

            "Informe marca, material e cor.",

            true

        );

        return;

    }


    if (

        filamento.pesoOriginal <= 0 ||

        filamento.pesoRestante < 0

    ) {

        avisar(

            "Confira os pesos informados.",

            true

        );

        return;

    }


    if (

        filamento.pesoRestante >

        filamento.pesoOriginal

    ) {

        avisar(

            "O peso restante não pode " +

            "ser maior que o peso original.",

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


    salvarFilamentosLocal();


    estado.filamentoEditando =
        null;


    $("#modal-filamento")
        .close();


    avisar(
        "Filamento salvo."
    );

}


function excluirFilamento(id) {

    if (

        !confirm(
            "Excluir este filamento?"
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


    salvarFilamentosLocal();

}


/* =====================================================
   SIMULADOR
===================================================== */

function renderizarSimulador() {

    const select =
        $("#sim-filamento");


    if (!select) {

        return;

    }


    const atual =
        select.value;


    select.innerHTML = `

        <option value="">
            Selecione
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

        select.value =
            atual;

    }


    calcularSimulador();

}


function calcularSimulador() {

    const id =
        $("#sim-filamento")
            ?.value;


    const filamento =

        estado.filamentos.find(

            item =>

                String(item.id) ===
                String(id)

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
                custoGrama(
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


    const calculado =

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
        dinheiro(calculado);

}


/* =====================================================
   ATUALIZAÇÃO GERAL
===================================================== */

function atualizarPainel() {

    atualizarIndicadores();

    renderizarRecentes();

    renderizarProdutos();

    renderizarPedidos();

    renderizarCustos();

    renderizarFilamentos();


    if ($("#data-atual")) {

        $("#data-atual")
            .textContent =

            new Date()
                .toLocaleDateString(

                    "pt-BR",

                    {

                        day:
                            "2-digit",

                        month:
                            "long",

                        year:
                            "numeric"

                    }

                );

    }

}


/* =====================================================
   ARQUIVOS
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


    link.href =
        url;


    link.download =
        nome;


    document.body
        .appendChild(
            link
        );


    link.click();

    link.remove();


    setTimeout(

        () => {

            URL.revokeObjectURL(
                url
            );

        },

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

        texto =
            "'" + texto;

    }


    return (

        '"' +

        texto.replaceAll(
            '"',
            '""'
        )

        +

        '"'

    );

}


function exportarCSV(

    nome,

    cabecalho,

    linhas

) {

    const conteudo = [

        cabecalho
            .map(campoCSV)
            .join(";"),

        ...linhas.map(

            linha =>

                linha
                    .map(campoCSV)
                    .join(";")

        )

    ].join("\r\n");


    baixarArquivo(

        nome,

        "\uFEFF" +
        conteudo,

        "text/csv;charset=utf-8"

    );

}


/* =====================================================
   BACKUP
===================================================== */

function exportarBackup() {

    baixarArquivo(

        "backup-criaitor3d.json",

        JSON.stringify(

            {

                data:
                    agoraISO(),

                produtos:
                    estado.produtos,

                pedidos:
                    estado.pedidos,

                custos:
                    estado.custos,

                filamentos:
                    estado.filamentos

            },

            null,

            2

        ),

        "application/json"

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

        const dados =
            JSON.parse(

                await arquivo.text()

            );


        if (

            Array.isArray(
                dados.pedidos
            )

        ) {

            estado.pedidos =
                dados.pedidos;

        }


        if (

            Array.isArray(
                dados.custos
            )

        ) {

            estado.custos =
                dados.custos;

        }


        if (

            Array.isArray(
                dados.filamentos
            )

        ) {

            estado.filamentos =
                dados.filamentos;

        }


        salvarPedidosLocal();

        salvarCustosLocal();

        salvarFilamentosLocal();


        avisar(
            "Backup restaurado."
        );


    } catch (erro) {

        console.error(erro);


        avisar(

            "Backup inválido.",

            true

        );

    }


    evento.target.value =
        "";

}


/* =====================================================
   EVENTOS
===================================================== */

function configurarEventos() {

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

                document
                    .getElementById(
                        fechar.dataset.fechar
                    )
                    ?.close();

                return;

            }


            const produtoEditar =

                evento.target.closest(
                    "[data-produto-editar]"
                );


            if (produtoEditar) {

                editarProduto(

                    produtoEditar.dataset
                        .produtoEditar

                );

                return;

            }


            const produtoExcluir =

                evento.target.closest(
                    "[data-produto-excluir]"
                );


            if (produtoExcluir) {

                excluirProduto(

                    produtoExcluir.dataset
                        .produtoExcluir

                );

                return;

            }


            const pedidoEditar =

                evento.target.closest(
                    "[data-pedido-editar]"
                );


            if (pedidoEditar) {

                editarPedido(

                    pedidoEditar.dataset
                        .pedidoEditar

                );

                return;

            }


            const pedidoExcluir =

                evento.target.closest(
                    "[data-pedido-excluir]"
                );


            if (pedidoExcluir) {

                excluirPedido(

                    pedidoExcluir.dataset
                        .pedidoExcluir

                );

                return;

            }


            const custoEditar =

                evento.target.closest(
                    "[data-custo-editar]"
                );


            if (custoEditar) {

                editarCusto(

                    custoEditar.dataset
                        .custoEditar

                );

                return;

            }


            const custoExcluir =

                evento.target.closest(
                    "[data-custo-excluir]"
                );


            if (custoExcluir) {

                excluirCusto(

                    custoExcluir.dataset
                        .custoExcluir

                );

                return;

            }


            const filamentoEditar =

                evento.target.closest(
                    "[data-filamento-editar]"
                );


            if (filamentoEditar) {

                editarFilamento(

                    filamentoEditar.dataset
                        .filamentoEditar

                );

                return;

            }


            const filamentoExcluir =

                evento.target.closest(
                    "[data-filamento-excluir]"
                );


            if (filamentoExcluir) {

                excluirFilamento(

                    filamentoExcluir.dataset
                        .filamentoExcluir

                );

            }

        }

    );


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


    $("#novo-pedido")
        ?.addEventListener(
            "click",
            abrirNovoPedido
        );


    $("#novo-custo")
        ?.addEventListener(
            "click",
            abrirNovoCusto
        );


    $("#novo-filamento")
        ?.addEventListener(
            "click",
            abrirNovoFilamento
        );


    $("#form-produto")
        ?.addEventListener(
            "submit",
            salvarProduto
        );


    $("#form-pedido")
        ?.addEventListener(
            "submit",
            salvarPedido
        );


    $("#form-custo")
        ?.addEventListener(
            "submit",
            salvarCusto
        );


    $("#form-filamento")
        ?.addEventListener(
            "submit",
            salvarFilamento
        );


    $("#buscar-produto")
        ?.addEventListener(
            "input",
            renderizarProdutos
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


    $("#recarregar-catalogo")
        ?.addEventListener(

            "click",

            async () => {

                try {

                    await carregarCatalogo();


                    avisar(
                        "Catálogo atualizado."
                    );


                } catch (erro) {

                    avisar(

                        erro.message,

                        true

                    );

                }

            }

        );


    $("#exportar-pedidos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "pedidos-criaitor3d.csv",

                    [

                        "Cliente",
                        "Contato",
                        "Produtos",
                        "Valor",
                        "Status",
                        "Data"

                    ],

                    estado.pedidos.map(

                        item => [

                            item.cliente,
                            item.contato,
                            item.itens,
                            item.valor,
                            item.status,
                            item.data

                        ]

                    )

                );

            }

        );


    $("#exportar-custos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "custos-criaitor3d.csv",

                    [

                        "Descrição",
                        "Categoria",
                        "Tipo",
                        "Valor",
                        "Data",
                        "Observações"

                    ],

                    estado.custos.map(

                        item => [

                            item.descricao,
                            item.categoria,
                            item.tipo,
                            item.valor,
                            item.data,
                            item.observacoes

                        ]

                    )

                );

            }

        );


    $("#exportar-filamentos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "filamentos-criaitor3d.csv",

                    [

                        "Marca",
                        "Material",
                        "Cor",
                        "Diâmetro",
                        "Peso original",
                        "Peso restante",
                        "Valor pago",
                        "Custo por grama"

                    ],

                    estado.filamentos.map(

                        item => [

                            item.marca,
                            item.material,
                            item.cor,
                            item.diametro,
                            item.pesoOriginal,
                            item.pesoRestante,
                            item.valorPago,
                            custoGrama(item)

                        ]

                    )

                );

            }

        );


    $("#exportar-catalogo")
        ?.addEventListener(

            "click",

            () => {

                baixarArquivo(

                    "catalogo.js",

                    "window.CRIAITOR_CATALOGO = " +

                    JSON.stringify(

                        estado.produtos,

                        null,

                        2

                    )

                    +

                    ";\n",

                    "text/javascript"

                );

            }

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
   ATUALIZAÇÕES
===================================================== */

async function verificarAtualizacoes() {

    if (

        !sb ||

        estado.salvandoCatalogo ||

        $("#modal-produto")
            ?.open

    ) {

        return;

    }


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

            return;

        }


        if (

            numero(
                data.versao
            )

            !==

            estado.versao

        ) {

            await carregarCatalogo();

        }


    } catch {

        /* mantém o painel funcionando */

    }

}


/* =====================================================
   API EXTERNA
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

        () =>
            estado.versao,

    getUsuario:

        () => null,

    getCustos:

        () => [
            ...estado.custos
        ],

    getFilamentos:

        () => [
            ...estado.filamentos
        ]

};


/* =====================================================
   INICIAR
===================================================== */

async function iniciar() {

    carregarDadosLocais();

    configurarEventos();

    abrirPagina(
        "dashboard"
    );


    atualizarPainel();


    try {

        await carregarCatalogo();

    } catch (erro) {

        console.error(erro);


        avisar(

            erro.message,

            true

        );

    }


    setInterval(

        verificarAtualizacoes,

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

})();
