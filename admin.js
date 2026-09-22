
// ======================================
// CRIAITOR 3D - ADMINISTRAÇÃO
// ======================================

"use strict";


// CONFIGURAÇÕES

const CHAVE_PRODUTOS = "criaitor3d_produtos_v1";

const CHAVE_PEDIDOS = "criaitor3d_pedidos_v1";

const IMAGEM_PADRAO = "assets/logo-criaitor3d.png";

const STATUS_PEDIDOS = [

    "Novo",
    "Em produção",
    "Pronto",
    "Entregue",
    "Cancelado"

];

const moeda = new Intl.NumberFormat("pt-BR", {

    style: "currency",

    currency: "BRL"

});

const $ = id => document.getElementById(id);


// ======================================
// ARMAZENAMENTO LOCAL
// ======================================

function lerDados(chave, padrao) {

    try {

        const dados = JSON.parse(
            localStorage.getItem(chave)
        );

        return Array.isArray(dados)
            ? dados
            : padrao;

    } catch {

        return padrao;

    }

}


const catalogoInicial =
    window.CRIAITOR_CATALOGO?.produtos || [];


let produtos = lerDados(

    CHAVE_PRODUTOS,

    catalogoInicial.map(p => ({ ...p }))

);


let pedidos = lerDados(

    CHAVE_PEDIDOS,

    []

);


function gravarDados(chave, dados) {

    try {

        localStorage.setItem(

            chave,

            JSON.stringify(dados)

        );

        return true;

    } catch {

        alert(
            "Não foi possível salvar os dados neste navegador."
        );

        return false;

    }

}


function salvarProdutos() {

    return gravarDados(CHAVE_PRODUTOS, produtos);

}


function salvarPedidos() {

    return gravarDados(CHAVE_PEDIDOS, pedidos);

}


// ======================================
// FUNÇÕES AUXILIARES
// ======================================

function formatarPreco(valor) {

    return moeda.format(Number(valor) || 0);

}


function gerarId() {

    return "criaitor-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 9);

}


function criarElemento(tag, conteudo = "", classe = "") {

    const elemento = document.createElement(tag);

    elemento.textContent = String(conteudo ?? "");

    if (classe) {

        elemento.className = classe;

    }

    return elemento;

}


function criarFoto(produto) {

    const imagem = document.createElement("img");

    imagem.alt = produto.nome || "Produto";

    imagem.loading = "lazy";

    const caminho = String(produto.imagem || "");

    imagem.src = /^(https?:\/\/|assets\/)[^\s]*$/i.test(caminho)
        ? caminho
        : IMAGEM_PADRAO;

    imagem.onerror = () => {

        imagem.onerror = null;

        imagem.src = IMAGEM_PADRAO;

    };

    return imagem;

}


let tempoNotificacao;


function notificar(mensagem) {

    const elemento = $("notificacao");

    clearTimeout(tempoNotificacao);

    elemento.textContent = mensagem;

    elemento.classList.add("visivel");

    tempoNotificacao = setTimeout(() => {

        elemento.classList.remove("visivel");

    }, 3500);

}


// ======================================
// NAVEGAÇÃO
// ======================================

function mostrarPagina(pagina) {

    const paginasPermitidas = [

        "dashboard",
        "produtos",
        "pedidos",
        "publicar"

    ];

    if (!paginasPermitidas.includes(pagina)) {

        return;

    }


    document.querySelectorAll(".pagina").forEach(secao => {

        const ativa = secao.id === pagina;

        secao.hidden = !ativa;

        secao.classList.toggle("ativa", ativa);

    });


    document.querySelectorAll(".menu-item").forEach(botao => {

        botao.classList.toggle(

            "ativo",

            botao.dataset.pagina === pagina

        );

    });


    const titulos = {

        dashboard: "Visão geral",

        produtos: "Produtos",

        pedidos: "Pedidos",

        publicar: "Publicar catálogo"

    };


    $("titulo-pagina").textContent = titulos[pagina];

}


document.querySelectorAll("[data-pagina]").forEach(botao => {

    botao.addEventListener("click", () => {

        mostrarPagina(botao.dataset.pagina);

    });

});


document.querySelectorAll("[data-ir]").forEach(botao => {

    botao.addEventListener("click", () => {

        mostrarPagina(botao.dataset.ir);

    });

});


// ======================================
// DASHBOARD
// ======================================

function atualizarDashboard() {

    $("total-produtos").textContent = produtos.length;


    $("total-visiveis").textContent = produtos.filter(

        produto => produto.disponivel

    ).length;


    $("total-estoque").textContent = produtos.reduce(

        (total, produto) => {

            return total + Math.max(

                0,

                Number(produto.estoque) || 0

            );

        },

        0

    );


    $("total-pedidos").textContent = pedidos.filter(

        pedido => {

            return pedido.status !== "Entregue" &&
                   pedido.status !== "Cancelado";

        }

    ).length;


    const area = $("produtos-recentes");

    area.replaceChildren();


    produtos.slice(0, 4).forEach(produto => {

        const linha = criarElemento(

            "div",

            "",

            "produto-recente"

        );


        const imagem = criarFoto(produto);


        const informacoes = criarElemento(

            "div",

            "",

            "produto-recente-info"

        );


        informacoes.append(

            criarElemento("strong", produto.nome),

            criarElemento("span", produto.categoria)

        );


        linha.append(

            imagem,

            informacoes,

            criarElemento(

                "b",

                formatarPreco(produto.preco)

            )

        );


        area.appendChild(linha);

    });

}


// ======================================
// LISTAGEM DE PRODUTOS
// ======================================

function atualizarTabelaProdutos() {

    const tabela = $("tabela-produtos");

    tabela.replaceChildren();


    const pesquisa = $("buscar-produto")
        .value
        .toLocaleLowerCase("pt-BR")
        .trim();


    const filtrados = produtos.filter(produto => {

        const texto = [

            produto.nome,

            produto.categoria,

            produto.descricao

        ].join(" ").toLocaleLowerCase("pt-BR");


        return texto.includes(pesquisa);

    });


    $("contador-produtos").textContent =

        `${filtrados.length} de ${produtos.length} produtos`;


    filtrados.forEach(produto => {

        const linha = document.createElement("tr");


        // Nome e imagem

        const celulaProduto =
            document.createElement("td");


        const conteudoProduto = criarElemento(

            "div",

            "",

            "produto-celula"

        );


        const informacoes = document.createElement("div");


        informacoes.append(

            criarElemento("strong", produto.nome),

            criarElemento("small", produto.prazo || "")

        );


        conteudoProduto.append(

            criarFoto(produto),

            informacoes

        );


        celulaProduto.appendChild(conteudoProduto);


        // Categoria

        const categoria = document.createElement("td");

        categoria.appendChild(

            criarElemento(

                "span",

                produto.categoria,

                "etiqueta"

            )

        );


        // Preço

        const preco = criarElemento(

            "td",

            formatarPreco(produto.preco)

        );


        // Estoque

        const estoque = criarElemento(

            "td",

            produto.estoque

        );


        // Visibilidade

        const visibilidade = criarElemento(

            "td",

            produto.disponivel ? "Visível" : "Oculto",

            produto.disponivel ? "visivel" : "oculto"

        );


        // Ações

        const acoes = document.createElement("td");


        const editar = criarElemento(

            "button",

            "Editar",

            "botao-pequeno"

        );


        editar.addEventListener("click", () => {

            abrirFormularioProduto(produto.id);

        });


        const excluir = criarElemento(

            "button",

            "Excluir",

            "botao-pequeno botao-excluir"

        );


        excluir.addEventListener("click", () => {

            excluirProduto(produto.id);

        });


        acoes.append(editar, excluir);


        linha.append(

            celulaProduto,

            categoria,

            preco,

            estoque,

            visibilidade,

            acoes

        );


        tabela.appendChild(linha);

    });

}


// ======================================
// CADASTRO E EDIÇÃO DE PRODUTOS
// ======================================

let produtoEmEdicao = null;


function campo(formulario, nome) {

    return formulario.elements.namedItem(nome);

}


function abrirFormularioProduto(id = null) {

    const formulario = $("form-produto");

    formulario.reset();

    produtoEmEdicao = id;


    $("titulo-modal-produto").textContent =

        id ? "Editar produto" : "Novo produto";


    const produto = produtos.find(item => item.id === id);


    if (produto) {

        [

            "nome",
            "categoria",
            "preco",
            "estoque",
            "prazo",
            "imagem",
            "descricao"

        ].forEach(nome => {

            campo(formulario, nome).value =
                produto[nome] ?? "";

        });


        campo(formulario, "disponivel").checked =
            Boolean(produto.disponivel);


        campo(formulario, "destaque").checked =
            Boolean(produto.destaque);

    }


    $("modal-produto").showModal();

}


$("novo-produto").addEventListener("click", () => {

    abrirFormularioProduto();

});


$("novo-produto-topo").addEventListener("click", () => {

    abrirFormularioProduto();

});


$("buscar-produto").addEventListener(

    "input",

    atualizarTabelaProdutos

);


// SALVAR PRODUTO

$("form-produto").addEventListener("submit", evento => {

    evento.preventDefault();


    const formulario = evento.currentTarget;


    if (!formulario.reportValidity()) {

        return;

    }


    const preco = Number(

        campo(formulario, "preco").value

    );


    const estoque = Number(

        campo(formulario, "estoque").value

    );


    if (

        !Number.isFinite(preco) ||

        preco < 0 ||

        !Number.isSafeInteger(estoque) ||

        estoque < 0

    ) {

        notificar("Informe preço e estoque válidos.");

        return;

    }


    const imagem = campo(

        formulario,

        "imagem"

    ).value.trim();


    if (

        imagem &&

        !/^(https?:\/\/|assets\/)[^\s]*$/i.test(imagem)

    ) {

        notificar(

            "Use assets/nome.jpg ou uma URL HTTP/HTTPS."

        );

        return;

    }


    const anterior = produtos.find(

        item => item.id === produtoEmEdicao

    );


    const registro = {

        id: anterior?.id || gerarId(),

        nome: campo(formulario, "nome").value.trim(),

        categoria: campo(
            formulario,
            "categoria"
        ).value.trim(),

        preco: Math.round(preco * 100) / 100,

        estoque: estoque,

        prazo: campo(
            formulario,
            "prazo"
        ).value.trim(),

        imagem: imagem || IMAGEM_PADRAO,

        descricao: campo(
            formulario,
            "descricao"
        ).value.trim(),

        disponivel: campo(
            formulario,
            "disponivel"
        ).checked,

        destaque: campo(
            formulario,
            "destaque"
        ).checked

    };


    if (!registro.nome || !registro.categoria) {

        notificar("Preencha o nome e a categoria.");

        return;

    }


    const novaLista = anterior

        ? produtos.map(item =>

            item.id === anterior.id

                ? registro

                : item

        )

        : [registro, ...produtos];


    if (!gravarDados(CHAVE_PRODUTOS, novaLista)) {

        return;

    }


    produtos = novaLista;


    $("modal-produto").close();


    atualizarTudo();


    mostrarPagina("produtos");


    notificar("Produto salvo com sucesso!");

});


// EXCLUIR PRODUTO

function excluirProduto(id) {

    const produto = produtos.find(

        item => item.id === id

    );


    if (!produto) return;


    const confirmar = confirm(

        `Deseja excluir o produto "${produto.nome}"?`

    );


    if (!confirmar) return;


    const novaLista = produtos.filter(

        item => item.id !== id

    );


    if (!gravarDados(CHAVE_PRODUTOS, novaLista)) {

        return;

    }


    produtos = novaLista;


    atualizarTudo();


    notificar("Produto excluído.");

}


// ======================================
// GERENCIAMENTO DE PEDIDOS
// ======================================

let pedidoEmEdicao = null;


function atualizarTabelaPedidos() {

    const tabela = $("tabela-pedidos");

    tabela.replaceChildren();


    [...pedidos].reverse().forEach(pedido => {

        const linha = document.createElement("tr");


        // Cliente

        const cliente = document.createElement("td");


        cliente.append(

            criarElemento("strong", pedido.cliente),

            criarElemento("small", pedido.contato)

        );


        // Descrição

        const itens = criarElemento(

            "td",

            pedido.itens

        );


        // Valor

        const valor = criarElemento(

            "td",

            formatarPreco(pedido.valor)

        );


        // Status

        const status = document.createElement("td");


        const seletor = document.createElement("select");

        seletor.className = "botao-pequeno";


        STATUS_PEDIDOS.forEach(opcao => {

            const elemento = document.createElement("option");

            elemento.value = opcao;

            elemento.textContent = opcao;

            seletor.appendChild(elemento);

        });


        seletor.value = pedido.status;


        seletor.addEventListener("change", () => {

            const statusAnterior = pedido.status;

            pedido.status = seletor.value;


            if (!salvarPedidos()) {

                pedido.status = statusAnterior;

                seletor.value = statusAnterior;

                return;

            }


            atualizarDashboard();

            notificar("Status atualizado.");

        });


        status.appendChild(seletor);


        // Data

        const data = criarElemento(

            "td",

            pedido.data || "—"

        );


        // Ações

        const acoes = document.createElement("td");


        const editar = criarElemento(

            "button",

            "Editar",

            "botao-pequeno"

        );


        editar.addEventListener("click", () => {

            abrirFormularioPedido(pedido.id);

        });


        const excluir = criarElemento(

            "button",

            "Excluir",

            "botao-pequeno botao-excluir"

        );


        excluir.addEventListener("click", () => {

            excluirPedido(pedido.id);

        });


        acoes.append(editar, excluir);


        linha.append(

            cliente,

            itens,

            valor,

            status,

            data,

            acoes

        );


        tabela.appendChild(linha);

    });

}


// ABRIR FORMULÁRIO

function abrirFormularioPedido(id = null) {

    const formulario = $("form-pedido");

    formulario.reset();

    pedidoEmEdicao = id;


    const pedido = pedidos.find(

        item => item.id === id

    );


    if (pedido) {

        [

            "cliente",
            "contato",
            "itens",
            "valor",
            "status"

        ].forEach(nome => {

            campo(formulario, nome).value =
                pedido[nome] ?? "";

        });

    }


    $("modal-pedido").showModal();

}


$("novo-pedido").addEventListener("click", () => {

    abrirFormularioPedido();

});


// SALVAR PEDIDO

$("form-pedido").addEventListener("submit", evento => {

    evento.preventDefault();


    const formulario = evento.currentTarget;


    if (!formulario.reportValidity()) {

        return;

    }


    const valor = Number(

        campo(formulario, "valor").value

    );


    if (!Number.isFinite(valor) || valor < 0) {

        notificar("Informe um valor válido.");

        return;

    }


    const anterior = pedidos.find(

        item => item.id === pedidoEmEdicao

    );


    const registro = {

        id: anterior?.id || gerarId(),

        cliente: campo(
            formulario,
            "cliente"
        ).value.trim(),

        contato: campo(
            formulario,
            "contato"
        ).value.trim(),

        itens: campo(
            formulario,
            "itens"
        ).value.trim(),

        valor: Math.round(valor * 100) / 100,

        status: campo(
            formulario,
            "status"
        ).value,

        data: anterior?.data ||
            new Date().toLocaleDateString("pt-BR")

    };


    if (!registro.cliente || !registro.itens) {

        notificar("Preencha o cliente e os produtos.");

        return;

    }


    const novaLista = anterior

        ? pedidos.map(item =>

            item.id === anterior.id

                ? registro

                : item

        )

        : [...pedidos, registro];


    if (!gravarDados(CHAVE_PEDIDOS, novaLista)) {

        return;

    }


    pedidos = novaLista;


    $("modal-pedido").close();


    atualizarTudo();


    mostrarPagina("pedidos");


    notificar("Pedido registrado com sucesso!");

});


// EXCLUIR PEDIDO

function excluirPedido(id) {

    const pedido = pedidos.find(item => item.id === id);


    if (!pedido) return;


    const confirmar = confirm(

        `Deseja excluir o pedido de "${pedido.cliente}"?`

    );


    if (!confirmar) return;


    const novaLista = pedidos.filter(

        item => item.id !== id

    );


    if (!gravarDados(CHAVE_PEDIDOS, novaLista)) {

        return;

    }


    pedidos = novaLista;


    atualizarTudo();


    notificar("Pedido excluído.");

}


// ======================================
// FECHAR FORMULÁRIOS
// ======================================

document.querySelectorAll("[data-fechar]").forEach(botao => {

    botao.addEventListener("click", () => {

        const modal = $(botao.dataset.fechar);

        modal.close();

    });

});


// ======================================
// EXPORTAÇÃO DE ARQUIVOS
// ======================================

function baixarArquivo(nome, conteudo, tipo) {

    const arquivo = new Blob(

        [conteudo],

        { type: tipo }

    );


    const url = URL.createObjectURL(arquivo);


    const link = document.createElement("a");


    link.href = url;

    link.download = nome;


    document.body.appendChild(link);

    link.click();

    link.remove();


    setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1500);

}


// EXPORTAR CATÁLOGO PARA A LOJA

$("exportar-catalogo").addEventListener("click", () => {

    const produtosPublicos = produtos.map(produto => ({

        id: String(produto.id),

        nome: String(produto.nome),

        categoria: String(produto.categoria),

        descricao: String(produto.descricao || ""),

        preco: Number(produto.preco) || 0,

        estoque: Number(produto.estoque) || 0,

        prazo: String(produto.prazo || ""),

        imagem: String(produto.imagem || IMAGEM_PADRAO),

        destaque: Boolean(produto.destaque),

        disponivel: Boolean(produto.disponivel)

    }));


    const catalogo = {

        versao: 1,

        atualizadoEm: new Date().toISOString(),

        produtos: produtosPublicos

    };


    const codigo =

        "window.CRIAITOR_CATALOGO = " +

        JSON.stringify(catalogo, null, 2)

            .replace(/</g, "\\u003c") +

        ";\n";


    baixarArquivo(

        "catalogo.js",

        codigo,

        "text/javascript;charset=utf-8"

    );


    notificar(

        "Catálogo exportado! Atualize o arquivo na loja dos clientes."

    );

});


// ======================================
// BACKUP
// ======================================

$("baixar-backup").addEventListener("click", () => {

    const backup = {

        tipo: "criaitor3d-backup",

        versao: 1,

        produtos: produtos,

        pedidos: pedidos

    };


    baixarArquivo(

        "criaitor3d-backup.json",

        JSON.stringify(backup, null, 2),

        "application/json;charset=utf-8"

    );


    notificar("Backup exportado com sucesso!");

});


// RESTAURAR BACKUP

$("restaurar-backup").addEventListener(

    "change",

    async evento => {

        const arquivo = evento.target.files?.[0];


        if (!arquivo) return;


        try {

            if (arquivo.size > 3000000) {

                throw new Error(

                    "Arquivo muito grande. Limite de 3 MB."

                );

            }


            const conteudo = await arquivo.text();


            const backup = JSON.parse(conteudo);


            if (

                backup.tipo !== "criaitor3d-backup" ||

                !Array.isArray(backup.produtos) ||

                !Array.isArray(backup.pedidos)

            ) {

                throw new Error("Arquivo de backup incompatível.");

            }


            if (

                backup.produtos.length > 1000 ||

                backup.pedidos.length > 10000

            ) {

                throw new Error(

                    "O backup excede o limite de registros."

                );

            }


            const produtosValidos = backup.produtos.every(p =>

                p &&

                typeof p.id === "string" &&

                typeof p.nome === "string" &&

                typeof p.categoria === "string" &&

                Number.isFinite(p.preco) &&

                p.preco >= 0 &&

                Number.isSafeInteger(p.estoque) &&

                p.estoque >= 0 &&

                typeof p.disponivel === "boolean"

            );


            const pedidosValidos = backup.pedidos.every(p =>

                p &&

                typeof p.id === "string" &&

                typeof p.cliente === "string" &&

                typeof p.itens === "string" &&

                Number.isFinite(p.valor) &&

                p.valor >= 0 &&

                STATUS_PEDIDOS.includes(p.status)

            );


            if (!produtosValidos || !pedidosValidos) {

                throw new Error(

                    "O backup contém dados inválidos."

                );

            }


            const confirmar = confirm(

                "Restaurar backup? Os produtos e pedidos locais serão substituídos."

            );


            if (!confirmar) return;


            if (

                !gravarDados(CHAVE_PRODUTOS, backup.produtos) ||

                !gravarDados(CHAVE_PEDIDOS, backup.pedidos)

            ) {

                throw new Error(

                    "Não foi possível gravar o backup."

                );

            }


            produtos = backup.produtos;

            pedidos = backup.pedidos;


            atualizarTudo();


            notificar("Backup restaurado!");

        } catch (erro) {

            alert(

                "Erro ao restaurar backup: " +

                erro.message

            );

        } finally {

            evento.target.value = "";

        }

    }

);


// ======================================
// EXPORTAR PEDIDOS EM CSV
// ======================================

function formatarCelulaCSV(valor) {

    let texto = String(valor ?? "");


    // Impede que dados de clientes sejam
    // interpretados como fórmulas na planilha.

    if (/^\s*[=+\-@]/.test(texto)) {

        texto = "'" + texto;

    }


    return '"' + texto.replace(/"/g, '""') + '"';

}


$("exportar-pedidos").addEventListener("click", () => {

    if (pedidos.length === 0) {

        notificar("Não há pedidos para exportar.");

        return;

    }


    const linhas = [

        [

            "Cliente",
            "Contato",
            "Itens",
            "Valor (R$)",
            "Status",
            "Data"

        ],

        ...pedidos.map(pedido => [

            pedido.cliente,

            pedido.contato,

            pedido.itens,

            pedido.valor,

            pedido.status,

            pedido.data

        ])

    ];


    const csv = "\uFEFF" +

        linhas.map(linha =>

            linha.map(formatarCelulaCSV).join(";")

        ).join("\r\n");


    baixarArquivo(

        "criaitor3d-pedidos.csv",

        csv,

        "text/csv;charset=utf-8"

    );


    notificar("Pedidos exportados com sucesso!");

});


// ======================================
// ATUALIZAR O PAINEL
// ======================================

function atualizarTudo() {

    atualizarDashboard();

    atualizarTabelaProdutos();

    atualizarTabelaPedidos();

}


// DATA ATUAL

$("data-atual").textContent =

    new Date().toLocaleDateString("pt-BR", {

        day: "numeric",

        month: "long",

        year: "numeric"

    });


// INICIALIZAÇÃO

atualizarTudo();

mostrarPagina("dashboard");
