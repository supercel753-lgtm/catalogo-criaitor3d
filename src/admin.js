
/*
============================================
CRIAITOR 3D
PAINEL ADMINISTRATIVO
============================================

VERSÃO: 2.0

FUNCIONALIDADES:

- Login administrativo
- Gerenciamento de produtos
- Cadastro e edição
- Controle de estoque
- Visibilidade na loja
- Produtos em destaque
- Integração com upload de fotografias
- Sincronização com Supabase
- Registro local de pedidos
- Indicadores administrativos
- Exportação de dados
- Backup e restauração de pedidos

============================================
*/


(function () {

"use strict";


// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================

const CONFIG = {

    tabela: "catalogo",

    registro: 1,

    chaveProdutos: "produtos",

    chaveVersao: "versao",

    tituloEmpresa: "CriAItor 3D"

};


// ==========================================
// 2. CONEXÃO COM SUPABASE
// ==========================================

// O arquivo supabase-config.js deve
// disponibilizar o cliente como window.sb.
//
// ADMIN_UID deve conter a UID real
// do administrador autorizado.


const supabase = window.sb;


const UID_ADMIN =

    typeof ADMIN_UID !== "undefined"

        ? ADMIN_UID

        : window.ADMIN_UID || "";


// ==========================================
// 3. ELEMENTOS DO HTML
// ==========================================

const $ = seletor =>

    document.querySelector(seletor);


const $$ = seletor =>

    Array.from(document.querySelectorAll(seletor));


const app = $(".app");

const topbar = $(".topbar");

const modalProduto = $("#modal-produto");

const modalPedido = $("#modal-pedido");

const formProduto = $("#form-produto");

const formPedido = $("#form-pedido");

const notificacao = $("#notificacao");


// ==========================================
// 4. ESTADO DO PAINEL
// ==========================================

const estado = {

    usuario: null,

    produtos: [],

    pedidos: [],

    versao: 0,

    produtoEditando: null,

    pedidoEditando: null,

    categoriaAtual: "Todos",

    carregando: false,

    salvando: false,

    paginaAtual: "dashboard"

};


// ==========================================
// 5. UTILITÁRIOS
// ==========================================

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

    ).format(Number(valor) || 0);

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


function dataAtual() {

    return new Date().toISOString();

}


function formatarData(valor) {

    if (!valor) {

        return "—";

    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {

        return "—";

    }

    return data.toLocaleDateString("pt-BR");

}


function imagemSegura(valor) {

    const endereco = String(valor || "").trim();

    if (

        endereco.startsWith("https://") ||

        endereco.startsWith("http://localhost") ||

        endereco.startsWith("assets/")

    ) {

        return endereco;

    }

    return "";

}


// ==========================================
// 6. NOTIFICAÇÕES
// ==========================================

let temporizadorNotificacao;


function avisar(mensagem, erro = false) {

    if (!notificacao) {

        console.log(mensagem);

        return;

    }

    notificacao.textContent = mensagem;

    notificacao.classList.toggle(

        "erro",

        erro

    );

    notificacao.classList.add("visivel");

    clearTimeout(temporizadorNotificacao);

    temporizadorNotificacao = setTimeout(() => {

        notificacao.classList.remove("visivel");

    }, 4500);

}


// ==========================================
// 7. VERIFICAR CONFIGURAÇÃO
// ==========================================

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


// ==========================================
// 8. CRIAR TELA DE LOGIN
// ==========================================

function criarTelaLogin() {

    if ($("#tela-login")) {

        return;

    }

    const tela = document.createElement("section");

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
                placeholder="Seu e-mail"
                required
            >

            <label for="senha-login">

                Senha

            </label>

            <input
                type="password"
                id="senha-login"
                autocomplete="current-password"
                placeholder="Sua senha"
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

    document.body.prepend(tela);


    $("#form-login").addEventListener(

        "submit",

        realizarLogin

    );

}


// ==========================================
// 9. LOGIN
// ==========================================

async function realizarLogin(evento) {

    evento.preventDefault();

    const email = $("#email-login").value.trim();

    const senha = $("#senha-login").value;

    const botao = $("#botao-login");

    const mensagem = $("#mensagem-login");

    botao.disabled = true;

    mensagem.textContent = "Verificando acesso...";

    try {

        verificarConfiguracao();


        const {

            data,

            error

        } = await supabase.auth.signInWithPassword({

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

                "Esta conta não possui acesso administrativo."

            );

        }


        estado.usuario = data.user;

        $("#senha-login").value = "";

        await entrarPainel();


    } catch (erro) {

        mensagem.textContent = erro.message;

        console.error("Erro no login:", erro);


    } finally {

        botao.disabled = false;

    }

}


// ==========================================
// 10. VERIFICAR SESSÃO
// ==========================================

async function verificarSessao() {

    verificarConfiguracao();


    const {

        data,

        error

    } = await supabase.auth.getUser();


    if (error || !data.user) {

        return null;

    }


    if (data.user.id !== UID_ADMIN) {

        await supabase.auth.signOut();

        return null;

    }


    return data.user;

}


// ==========================================
// 11. ENTRAR NO PAINEL
// ==========================================

async function entrarPainel() {

    const usuario = await verificarSessao();

    if (!usuario) {

        mostrarLogin();

        return;

    }

    estado.usuario = usuario;


    await carregarCatalogo();

    carregarPedidos();


    $("#tela-login").hidden = true;

    app.hidden = false;


    abrirPagina("dashboard");

    atualizarPainel();

}


// ==========================================
// 12. MOSTRAR LOGIN
// ==========================================

function mostrarLogin() {

    estado.usuario = null;

    estado.produtos = [];

    estado.pedidos = [];


    app.hidden = true;

    $("#tela-login").hidden = false;

}


// ==========================================
// 13. LOGOUT
// ==========================================

async function sairPainel() {

    try {

        await supabase.auth.signOut();

    } catch (erro) {

        console.error(erro);

    }

    mostrarLogin();

}


// ==========================================
// 14. BOTÃO SAIR
// ==========================================

function criarBotaoSair() {

    if ($("#botao-sair")) {

        return;

    }

    const botao = document.createElement("button");

    botao.id = "botao-sair";

    botao.type = "button";

    botao.className = "botao botao-secundario";

    botao.textContent = "Sair";


    botao.addEventListener(

        "click",

        sairPainel

    );


    topbar.appendChild(botao);

}


// ==========================================
// 15. CARREGAR CATÁLOGO DO SUPABASE
// ==========================================

async function carregarCatalogo() {

    const {

        data,

        error

    } = await supabase

        .from(CONFIG.tabela)

        .select(

            "id, " +

            CONFIG.chaveProdutos + ", " +

            CONFIG.chaveVersao

        )

        .eq("id", CONFIG.registro)

        .single();


    if (error) {

        throw new Error(

            "Erro ao carregar catálogo: " +

            error.message

        );

    }


    if (!Array.isArray(data.produtos)) {

        throw new Error(

            "A coluna produtos precisa conter " +

            "uma lista JSON de produtos."

        );

    }


    estado.produtos = data.produtos;

    estado.versao = Number(data.versao) || 0;


    atualizarPainel();

}


// ==========================================
// 16. SALVAR CATÁLOGO NO SUPABASE
// ==========================================

async function salvarCatalogo(novosProdutos) {

    if (estado.salvando) {

        throw new Error(

            "Já existe uma alteração em andamento."

        );

    }


    const usuario = await verificarSessao();

    if (!usuario) {

        throw new Error(

            "Sua sessão expirou. Faça login novamente."

        );

    }


    estado.salvando = true;


    try {

        // Controle de concorrência:
        // salva somente se a versão do catálogo
        // não tiver sido alterada por outro usuário.

        const novaVersao = estado.versao + 1;


        const {

            data,

            error

        } = await supabase

            .from(CONFIG.tabela)

            .update({

                produtos: novosProdutos,

                versao: novaVersao

            })

            .eq("id", CONFIG.registro)

            .eq("versao", estado.versao)

            .select("produtos, versao");


        if (error) {

            throw error;

        }


        if (!data || data.length === 0) {

            throw new Error(

                "O catálogo foi alterado em outra sessão. " +

                "Recarregue os produtos antes de tentar novamente."

            );

        }


        estado.produtos = data[0].produtos;

        estado.versao = Number(data[0].versao);


        atualizarPainel();


        return data[0];


    } finally {

        estado.salvando = false;

    }

}


// ==========================================
// 17. NAVEGAÇÃO DO PAINEL
// ==========================================

function abrirPagina(nome) {

    estado.paginaAtual = nome;


    $$(".pagina").forEach(pagina => {

        const ativa = pagina.id === nome;

        pagina.hidden = !ativa;

        pagina.classList.toggle(

            "ativa",

            ativa

        );

    });


    $$("[data-pagina]").forEach(botao => {

        botao.classList.toggle(

            "ativo",

            botao.dataset.pagina === nome

        );

    });


    const titulos = {

        dashboard: "Visão geral",

        produtos: "Produtos",

        pedidos: "Pedidos",

        publicar: "Sincronização"

    };


    const titulo = $("#titulo-pagina");

    if (titulo) {

        titulo.textContent = titulos[nome] || nome;

    }

}


// ==========================================
// 18. INDICADORES
// ==========================================

function atualizarIndicadores() {

    const produtos = estado.produtos;

    const pedidos = estado.pedidos;


    const visiveis = produtos.filter(

        produto => produto.disponivel !== false

    );


    const estoque = produtos.reduce(

        (total, produto) =>

            total + numero(produto.estoque),

        0

    );


    const pedidosAbertos = pedidos.filter(

        pedido =>

            !["Entregue", "Cancelado"].includes(

                pedido.status

            )

    );


    $("#total-produtos").textContent =

        produtos.length;


    $("#total-visiveis").textContent =

        visiveis.length;


    $("#total-estoque").textContent =

        estoque;


    $("#total-pedidos").textContent =

        pedidosAbertos.length;

}


// ==========================================
// 19. PRODUTOS RECENTES
// ==========================================

function renderizarProdutosRecentes() {

    const container = $("#produtos-recentes");


    if (!container) {

        return;

    }


    const produtos = estado.produtos.slice(-5).reverse();


    if (!produtos.length) {

        container.innerHTML = `

            <p>

                Você ainda não cadastrou produtos.

            </p>

        `;

        return;

    }


    container.innerHTML = produtos.map(produto => {

        const imagem = imagemSegura(produto.imagem);


        return `

            <div class="produto-recente">

                ${imagem ? `

                    <img
                        src="${escaparHTML(imagem)}"
                        alt=""
                        loading="lazy"
                    >

                ` : ""}


                <div class="produto-recente-info">

                    <strong>

                        ${escaparHTML(produto.nome)}

                    </strong>

                    <span>

                        ${escaparHTML(produto.categoria)}

                    </span>

                </div>


                <b>

                    ${dinheiro(produto.preco)}

                </b>

            </div>

        `;

    }).join("");

}


// ==========================================
// 20. TABELA DE PRODUTOS
// ==========================================

function renderizarProdutos() {

    const tabela = $("#tabela-produtos");


    const busca =

        ($("#buscar-produto")?.value || "")

            .trim()

            .toLowerCase();


    const produtos = estado.produtos.filter(

        produto => {

            const nome = String(

                produto.nome || ""

            ).toLowerCase();


            const categoria = String(

                produto.categoria || ""

            ).toLowerCase();


            return (

                nome.includes(busca) ||

                categoria.includes(busca)

            );

        }

    );


    $("#contador-produtos").textContent =

        produtos.length + " produtos";


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


    tabela.innerHTML = produtos.map(produto => {

        const imagem = imagemSegura(produto.imagem);


        return `

            <tr>

                <td>

                    <div class="produto-celula">

                        ${imagem ? `

                            <img
                                src="${escaparHTML(imagem)}"
                                alt=""
                                loading="lazy"
                            >

                        ` : ""}


                        <div>

                            <strong>

                                ${escaparHTML(produto.nome)}

                            </strong>

                            <small>

                                ${escaparHTML(produto.prazo || "")}

                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    ${escaparHTML(produto.categoria)}

                </td>


                <td>

                    ${dinheiro(produto.preco)}

                </td>


                <td>

                    ${numero(produto.estoque)}

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
                        data-id="${escaparHTML(produto.id)}"
                    >

                        Editar

                    </button>


                    <button
                        type="button"
                        class="botao-pequeno botao-excluir"
                        data-acao-produto="excluir"
                        data-id="${escaparHTML(produto.id)}"
                    >

                        Excluir

                    </button>

                </td>

            </tr>

        `;

    }).join("");

}


// ==========================================
// 21. ABRIR CADASTRO DE PRODUTO
// ==========================================

function abrirNovoProduto() {

    estado.produtoEditando = null;


    formProduto.reset();


    $("#titulo-modal-produto").textContent =

        "Novo produto";


    formProduto.elements.nome.focus();


    modalProduto.showModal();

}


// ==========================================
// 22. EDITAR PRODUTO
// ==========================================

function editarProduto(id) {

    const produto = estado.produtos.find(

        item => String(item.id) === String(id)

    );


    if (!produto) {

        avisar("Produto não encontrado.", true);

        return;

    }


    estado.produtoEditando = produto.id;


    formProduto.reset();


    const campos = formProduto.elements;


    campos.nome.value = produto.nome || "";

    campos.categoria.value = produto.categoria || "";

    campos.preco.value = numero(produto.preco);

    campos.estoque.value = numero(produto.estoque);

    campos.prazo.value = produto.prazo || "";

    campos.imagem.value = produto.imagem || "";

    campos.descricao.value = produto.descricao || "";


    campos.disponivel.checked =

        produto.disponivel !== false;


    campos.destaque.checked =

        produto.destaque === true;


    // Atualizar a pré-visualização
    // do fotos-empresa.js.

    campos.imagem.dispatchEvent(

        new Event("change")

    );


    $("#titulo-modal-produto").textContent =

        "Editar produto";


    modalProduto.showModal();

}


// ==========================================
// 23. SALVAR PRODUTO
// ==========================================

async function salvarProduto(evento) {

    evento.preventDefault();


    const botao = formProduto.querySelector(

        'button[type="submit"]'

    );


    if (estado.salvando) {

        return;

    }


    botao.disabled = true;


    try {

        const campos = formProduto.elements;


        const nome = campos.nome.value.trim();

        const categoria = campos.categoria.value.trim();


        if (!nome || !categoria) {

            throw new Error(

                "Preencha o nome e a categoria."

            );

        }


        const preco = Number(campos.preco.value);

        const estoque = Number(campos.estoque.value);


        if (

            !Number.isFinite(preco) ||

            preco < 0 ||

            !Number.isInteger(estoque) ||

            estoque < 0

        ) {

            throw new Error(

                "Informe um preço válido e " +

                "um estoque inteiro não negativo."

            );

        }


        const produtoAnterior =

            estado.produtos.find(

                produto =>

                    String(produto.id) ===

                    String(estado.produtoEditando)

            );


        // Mantém campos adicionais de produtos
        // existentes, caso tenham sido criados
        // por versões anteriores do sistema.

        const produto = {

            ...(produtoAnterior || {}),

            id: produtoAnterior?.id || criarID(),

            nome,

            categoria,

            preco,

            estoque,

            prazo: campos.prazo.value.trim(),

            imagem: campos.imagem.value.trim(),

            descricao: campos.descricao.value.trim(),

            disponivel: campos.disponivel.checked,

            destaque: campos.destaque.checked,

            atualizado_em: dataAtual()

        };


        let novosProdutos;


        if (produtoAnterior) {

            novosProdutos = estado.produtos.map(

                item =>

                    String(item.id) ===

                    String(produtoAnterior.id)

                        ? produto

                        : item

            );

        } else {

            novosProdutos = [

                ...estado.produtos,

                produto

            ];

        }


        await salvarCatalogo(novosProdutos);


        modalProduto.close();


        estado.produtoEditando = null;


        avisar("Produto salvo com sucesso!");


    } catch (erro) {

        console.error(erro);

        avisar(

            "Erro ao salvar produto: " + erro.message,

            true

        );

    } finally {

        botao.disabled = false;

    }

}


// ==========================================
// 24. EXCLUIR PRODUTO
// ==========================================

async function excluirProduto(id) {

    const produto = estado.produtos.find(

        item => String(item.id) === String(id)

    );


    if (!produto) {

        avisar("Produto não encontrado.", true);

        return;

    }


    if (!confirm(

        "Deseja excluir o produto " +

        produto.nome +

        " do catálogo?"

    )) {

        return;

    }


    const novosProdutos = estado.produtos.filter(

        item => String(item.id) !== String(id)

    );


    try {

        await salvarCatalogo(novosProdutos);


        avisar("Produto excluído do catálogo.");


        // A fotografia armazenada no Storage
        // não é excluída automaticamente.

    } catch (erro) {

        console.error(erro);

        avisar(erro.message, true);

    }

}


// ==========================================
// 25. PEDIDOS - ARMAZENAMENTO LOCAL
// ==========================================

function chavePedidos() {

    return (

        "criaitor3d_pedidos_" +

        estado.usuario.id

    );

}


function carregarPedidos() {

    try {

        const dados = localStorage.getItem(

            chavePedidos()

        );


        const pedidos = dados

            ? JSON.parse(dados)

            : [];


        estado.pedidos = Array.isArray(pedidos)

            ? pedidos

            : [];


    } catch (erro) {

        console.error(erro);

        estado.pedidos = [];

    }


    renderizarPedidos();

}


// ==========================================
// 26. SALVAR PEDIDOS
// ==========================================

function persistirPedidos() {

    localStorage.setItem(

        chavePedidos(),

        JSON.stringify(estado.pedidos)

    );


    atualizarIndicadores();

    renderizarPedidos();

}


// ==========================================
// 27. RENDERIZAR PEDIDOS
// ==========================================

function renderizarPedidos() {

    const tabela = $("#tabela-pedidos");


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


    tabela.innerHTML = [...estado.pedidos]

        .reverse()

        .map(pedido => `

            <tr>

                <td>

                    <strong>

                        ${escaparHTML(pedido.cliente)}

                    </strong>

                    <small>

                        ${escaparHTML(pedido.contato)}

                    </small>

                </td>


                <td>

                    ${escaparHTML(pedido.itens)}

                </td>


                <td>

                    ${dinheiro(pedido.valor)}

                </td>


                <td>

                    <span class="etiqueta">

                        ${escaparHTML(pedido.status)}

                    </span>

                </td>


                <td>

                    ${formatarData(pedido.data)}

                </td>


                <td>

                    <button
                        type="button"
                        class="botao-pequeno"
                        data-acao-pedido="editar"
                        data-id="${escaparHTML(pedido.id)}"
                    >

                        Editar

                    </button>


                    <button
                        type="button"
                        class="botao-pequeno botao-excluir"
                        data-acao-pedido="excluir"
                        data-id="${escaparHTML(pedido.id)}"
                    >

                        Excluir

                    </button>

                </td>

            </tr>

        `).join("");

}


// ==========================================
// 28. NOVO PEDIDO
// ==========================================

function abrirNovoPedido() {

    estado.pedidoEditando = null;


    formPedido.reset();


    modalPedido.showModal();

}


// ==========================================
// 29. EDITAR PEDIDO
// ==========================================

function editarPedido(id) {

    const pedido = estado.pedidos.find(

        item => String(item.id) === String(id)

    );


    if (!pedido) {

        return;

    }


    estado.pedidoEditando = pedido.id;


    formPedido.reset();


    const campos = formPedido.elements;


    campos.cliente.value = pedido.cliente || "";

    campos.contato.value = pedido.contato || "";

    campos.itens.value = pedido.itens || "";

    campos.valor.value = numero(pedido.valor);

    campos.status.value = pedido.status || "Novo";


    modalPedido.showModal();

}


// ==========================================
// 30. SALVAR PEDIDO
// ==========================================

function salvarPedido(evento) {

    evento.preventDefault();


    try {

        const campos = formPedido.elements;


        const anterior = estado.pedidos.find(

            item =>

                String(item.id) ===

                String(estado.pedidoEditando)

        );


        const pedido = {

            ...(anterior || {}),

            id: anterior?.id || criarID(),

            cliente: campos.cliente.value.trim(),

            contato: campos.contato.value.trim(),

            itens: campos.itens.value.trim(),

            valor: numero(campos.valor.value),

            status: campos.status.value,

            data: anterior?.data || dataAtual(),

            atualizado_em: dataAtual()

        };


        if (!pedido.cliente || !pedido.itens) {

            throw new Error(

                "Preencha o cliente e os produtos solicitados."

            );

        }


        if (anterior) {

            estado.pedidos = estado.pedidos.map(

                item =>

                    String(item.id) === String(anterior.id)

                        ? pedido

                        : item

            );

        } else {

            estado.pedidos.push(pedido);

        }


        persistirPedidos();


        modalPedido.close();


        estado.pedidoEditando = null;


        avisar("Pedido salvo com sucesso!");


    } catch (erro) {

        avisar(erro.message, true);

    }

}


// ==========================================
// 31. EXCLUIR PEDIDO
// ==========================================

function excluirPedido(id) {

    if (!confirm(

        "Deseja excluir este pedido?"

    )) {

        return;

    }


    estado.pedidos = estado.pedidos.filter(

        item => String(item.id) !== String(id)

    );


    persistirPedidos();


    avisar("Pedido excluído.");

}


// ==========================================
// 32. EXPORTAR ARQUIVO
// ==========================================

function baixarArquivo(nome, conteudo, tipo) {

    const blob = new Blob(

        [conteudo],

        { type: tipo }

    );


    const url = URL.createObjectURL(blob);


    const link = document.createElement("a");

    link.href = url;

    link.download = nome;


    document.body.appendChild(link);


    link.click();


    link.remove();


    setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1000);

}


// ==========================================
// 33. EXPORTAR CATÁLOGO JS
// ==========================================

function exportarCatalogo() {

    const conteudo =

        "window.CRIAITOR_CATALOGO = " +

        JSON.stringify(

            estado.produtos,

            null,

            2

        ) +

        ";\n";


    baixarArquivo(

        "catalogo.js",

        conteudo,

        "text/javascript;charset=utf-8"

    );

}


// ==========================================
// 34. EXPORTAR PEDIDOS CSV
// ==========================================

function campoCSV(valor) {

    let texto = String(valor ?? "");


    // Evita que valores recebidos de clientes
    // sejam interpretados como fórmulas
    // por aplicativos de planilhas.

    if (/^[\s]*[=+\-@]/.test(texto)) {

        texto = "'" + texto;

    }


    return (

        '"' +

        texto.replaceAll('"', '""') +

        '"'

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


    const linhas = estado.pedidos.map(

        pedido => [

            pedido.cliente,

            pedido.contato,

            pedido.itens,

            pedido.valor,

            pedido.status,

            formatarData(pedido.data)

        ].map(campoCSV).join(";")

    );


    const conteudo =

        "\uFEFF" +

        [

            cabecalho.map(campoCSV).join(";"),

            ...linhas

        ].join("\r\n");


    baixarArquivo(

        "pedidos-criaitor3d.csv",

        conteudo,

        "text/csv;charset=utf-8"

    );

}


// ==========================================
// 35. EXPORTAR BACKUP
// ==========================================

function exportarBackup() {

    const backup = {

        empresa: CONFIG.tituloEmpresa,

        data: dataAtual(),

        versaoCatalogo: estado.versao,

        produtos: estado.produtos,

        pedidos: estado.pedidos

    };


    baixarArquivo(

        "backup-criaitor3d.json",

        JSON.stringify(backup, null, 2),

        "application/json;charset=utf-8"

    );


    avisar("Backup exportado.");

}


// ==========================================
// 36. RESTAURAR PEDIDOS DO BACKUP
// ==========================================

// A restauração automática altera somente
// os pedidos locais.
//
// Produtos não são sobrescritos para evitar
// substituir acidentalmente o catálogo
// compartilhado com os clientes.


async function restaurarBackup(evento) {

    const arquivo = evento.target.files?.[0];


    if (!arquivo) {

        return;

    }


    try {

        const texto = await arquivo.text();


        const backup = JSON.parse(texto);


        if (!Array.isArray(backup.pedidos)) {

            throw new Error(

                "O arquivo não contém uma lista válida de pedidos."

            );

        }


        if (!confirm(

            "Restaurar os pedidos deste backup? " +

            "Os pedidos locais atuais serão substituídos."

        )) {

            return;

        }


        estado.pedidos = backup.pedidos;


        persistirPedidos();


        avisar("Pedidos restaurados com sucesso.");


    } catch (erro) {

        console.error(erro);

        avisar(

            "Erro ao restaurar backup: " + erro.message,

            true

        );


    } finally {

        evento.target.value = "";

    }

}


// ==========================================
// 37. ATUALIZAR PAINEL
// ==========================================

function atualizarPainel() {

    atualizarIndicadores();

    renderizarProdutosRecentes();

    renderizarProdutos();

    renderizarPedidos();


    const campoData = $("#data-atual");


    if (campoData) {

        campoData.textContent =

            new Date().toLocaleDateString(

                "pt-BR",

                {

                    day: "2-digit",

                    month: "long",

                    year: "numeric"

                }

            );

    }

}


// ==========================================
// 38. EVENTOS DE NAVEGAÇÃO
// ==========================================

function configurarNavegacao() {

    $$("[data-pagina]").forEach(botao => {

        botao.addEventListener(

            "click",

            () => {

                abrirPagina(

                    botao.dataset.pagina

                );

            }

        );

    });


    $$("[data-ir]").forEach(botao => {

        botao.addEventListener(

            "click",

            () => {

                abrirPagina(

                    botao.dataset.ir

                );

            }

        );

    });

}


// ==========================================
// 39. EVENTOS DE PRODUTOS
// ==========================================

function configurarEventosProdutos() {

    $("#novo-produto").addEventListener(

        "click",

        abrirNovoProduto

    );


    $("#novo-produto-topo").addEventListener(

        "click",

        abrirNovoProduto

    );


    formProduto.addEventListener(

        "submit",

        salvarProduto

    );


    $("#buscar-produto").addEventListener(

        "input",

        renderizarProdutos

    );


    $("#tabela-produtos").addEventListener(

        "click",

        evento => {

            const botao = evento.target.closest(

                "[data-acao-produto]"

            );


            if (!botao) {

                return;

            }


            const acao = botao.dataset.acaoProduto;

            const id = botao.dataset.id;


            if (acao === "editar") {

                editarProduto(id);

            }


            if (acao === "excluir") {

                excluirProduto(id);

            }

        }

    );

}


// ==========================================
// 40. EVENTOS DE PEDIDOS
// ==========================================

function configurarEventosPedidos() {

    $("#novo-pedido").addEventListener(

        "click",

        abrirNovoPedido

    );


    formPedido.addEventListener(

        "submit",

        salvarPedido

    );


    $("#tabela-pedidos").addEventListener(

        "click",

        evento => {

            const botao = evento.target.closest(

                "[data-acao-pedido]"

            );


            if (!botao) {

                return;

            }


            const id = botao.dataset.id;

            const acao = botao.dataset.acaoPedido;


            if (acao === "editar") {

                editarPedido(id);

            }


            if (acao === "excluir") {

                excluirPedido(id);

            }

        }

    );

}


// ==========================================
// 41. FECHAR MODAIS
// ==========================================

function configurarModais() {

    $$("[data-fechar]").forEach(botao => {

        botao.addEventListener(

            "click",

            () => {

                const modal = document.getElementById(

                    botao.dataset.fechar

                );


                if (modal?.open) {

                    modal.close();

                }

            }

        );

    });

}


// ==========================================
// 42. EVENTOS DE BACKUP
// ==========================================

function configurarEventosBackup() {

    $("#exportar-catalogo").addEventListener(

        "click",

        exportarCatalogo

    );


    $("#exportar-pedidos").addEventListener(

        "click",

        exportarPedidos

    );


    $("#baixar-backup").addEventListener(

        "click",

        exportarBackup

    );


    $("#restaurar-backup").addEventListener(

        "change",

        restaurarBackup

    );

}


// ==========================================
// 43. SINCRONIZAÇÃO PERIÓDICA
// ==========================================

// Consulta a versão do catálogo periodicamente.
//
// Caso outra sessão tenha atualizado
// os produtos, recarrega os dados.
//
// Não recarrega enquanto um produto
// estiver sendo editado.


async function verificarAtualizacoes() {

    if (

        !estado.usuario ||

        estado.salvando ||

        modalProduto.open

    ) {

        return;

    }


    try {

        const {

            data,

            error

        } = await supabase

            .from(CONFIG.tabela)

            .select(CONFIG.chaveVersao)

            .eq("id", CONFIG.registro)

            .single();


        if (error) {

            throw error;

        }


        if (

            Number(data.versao) !== estado.versao

        ) {

            await carregarCatalogo();

        }


    } catch (erro) {

        console.warn(

            "Não foi possível verificar atualizações:",

            erro.message

        );

    }

}


// ==========================================
// 44. API DE INTEGRAÇÃO
// ==========================================

// Disponibiliza funções para integração
// com outros módulos da empresa.


window.CRIAITOR_ADMIN = {

    recarregar: carregarCatalogo,

    atualizar: atualizarPainel,

    abrirPagina,

    abrirNovoProduto,

    getProdutos: () => [...estado.produtos],

    getVersao: () => estado.versao,

    getUsuario: () => estado.usuario

};


// ==========================================
// 45. INICIALIZAÇÃO
// ==========================================

async function iniciarPainel() {

    try {

        criarTelaLogin();


        app.hidden = true;


        criarBotaoSair();


        configurarNavegacao();

        configurarEventosProdutos();

        configurarEventosPedidos();

        configurarEventosBackup();

        configurarModais();


        verificarConfiguracao();


        const usuario = await verificarSessao();


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


        mostrarLogin();


        const mensagem = $("#mensagem-login");


        if (mensagem) {

            mensagem.textContent = erro.message;

        }

    }

}


// ==========================================
// 46. MONITORAR LOGIN E LOGOUT
// ==========================================

if (supabase) {

    supabase.auth.onAuthStateChange(

        (_evento, sessao) => {

            if (!sessao) {

                mostrarLogin();

            }

        }

    );

}


// ==========================================
// 47. INICIAR
// ==========================================

if (document.readyState === "loading") {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarPainel,

        { once: true }

    );

} else {

    iniciarPainel();

}


// ==========================================
// 48. VERIFICAR CATÁLOGO
// ==========================================

setInterval(

    verificarAtualizacoes,

    30000

);


})();
