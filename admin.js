
/*
==========================================
CRIAITOR 3D
PAINEL ADMINISTRATIVO
==========================================
*/

"use strict";


// ==========================================
// CONFIGURAÇÕES
// ==========================================

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


// ==========================================
// DADOS
// ==========================================

// Produtos vêm do Supabase.

let produtos = [];


// Pedidos continuam armazenados localmente.

let pedidos = [];

try {
    const salvos = JSON.parse(
        localStorage.getItem(CHAVE_PEDIDOS)
    );

    if (Array.isArray(salvos)) {
        pedidos = salvos;
    }

} catch (erro) {
    console.error(erro);
}


// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarPreco(valor) {
    return moeda.format(Number(valor) || 0);
}


function gerarId() {
    return "produto-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 9);
}


function elemento(tag, texto = "", classe = "") {

    const el = document.createElement(tag);

    el.textContent = String(texto ?? "");

    if (classe) {
        el.className = classe;
    }

    return el;
}


function criarImagem(produto) {

    const img = document.createElement("img");

    img.alt = produto.nome || "Produto";

    img.loading = "lazy";

    const caminho = String(produto.imagem || "");

    img.src = /^(https:\/\/|assets\/)[^\s]*$/i.test(caminho)
        ? caminho
        : IMAGEM_PADRAO;

    img.onerror = () => {

        img.onerror = null;

        img.src = IMAGEM_PADRAO;

    };

    return img;
}


function campo(formulario, nome) {
    return formulario.elements.namedItem(nome);
}


// ==========================================
// NOTIFICAÇÕES
// ==========================================

let temporizadorNotificacao;

function notificar(mensagem) {

    const aviso = $("notificacao");

    clearTimeout(temporizadorNotificacao);

    aviso.textContent = mensagem;

    aviso.classList.add("visivel");

    temporizadorNotificacao = setTimeout(() => {
        aviso.classList.remove("visivel");
    }, 3500);

}


// ==========================================
// NAVEGAÇÃO
// ==========================================

function mostrarPagina(pagina) {

    const titulos = {
        dashboard: "Visão geral",
        produtos: "Produtos",
        pedidos: "Pedidos",
        publicar: "Sincronização"
    };

    if (!titulos[pagina]) return;


    document.querySelectorAll(".pagina").forEach(secao => {

        secao.hidden = secao.id !== pagina;

    });


    document.querySelectorAll(".menu-item").forEach(botao => {

        botao.classList.toggle(
            "ativo",
            botao.dataset.pagina === pagina
        );

    });


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


// ==========================================
// DASHBOARD
// ==========================================

function atualizarDashboard() {

    $("total-produtos").textContent = produtos.length;


    $("total-visiveis").textContent = produtos.filter(
        produto => produto.disponivel
    ).length;


    $("total-estoque").textContent = produtos.reduce(
        (total, produto) =>
            total + Math.max(0, Number(produto.estoque) || 0),
        0
    );


    $("total-pedidos").textContent = pedidos.filter(
        pedido =>
            pedido.status !== "Entregue" &&
            pedido.status !== "Cancelado"
    ).length;


    const area = $("produtos-recentes");

    area.replaceChildren();


    produtos.slice(0, 5).forEach(produto => {

        const linha = elemento(
            "div",
            "",
            "produto-recente"
        );

        const informacoes = elemento(
            "div",
            "",
            "produto-recente-info"
        );

        informacoes.append(
            elemento("strong", produto.nome),
            elemento("span", produto.categoria)
        );

        linha.append(
            criarImagem(produto),
            informacoes,
            elemento("b", formatarPreco(produto.preco))
        );

        area.appendChild(linha);

    });

}


// ==========================================
// LISTAGEM DE PRODUTOS
// ==========================================

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


        // PRODUTO

        const celulaProduto = document.createElement("td");

        const conteudo = elemento(
            "div",
            "",
            "produto-celula"
        );

        const informacoes = document.createElement("div");

        informacoes.append(
            elemento("strong", produto.nome),
            elemento("small", produto.prazo || "")
        );

        conteudo.append(
            criarImagem(produto),
            informacoes
        );

        celulaProduto.appendChild(conteudo);


        // CATEGORIA

        const categoria = document.createElement("td");

        categoria.appendChild(
            elemento("span", produto.categoria, "etiqueta")
        );


        // PREÇO

        const preco = elemento(
            "td",
            formatarPreco(produto.preco)
        );


        // ESTOQUE

        const estoque = elemento(
            "td",
            produto.estoque
        );


        // VISIBILIDADE

        const visibilidade = elemento(
            "td",
            produto.disponivel ? "Visível" : "Oculto",
            produto.disponivel ? "visivel" : "oculto"
        );


        // AÇÕES

        const acoes = document.createElement("td");

        const editar = elemento(
            "button",
            "Editar",
            "botao-pequeno"
        );

        editar.type = "button";

        editar.addEventListener("click", () => {
            abrirFormularioProduto(produto.id);
        });


        const excluir = elemento(
            "button",
            "Excluir",
            "botao-pequeno botao-excluir"
        );

        excluir.type = "button";

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


// ==========================================
// CADASTRAR E EDITAR PRODUTOS
// ==========================================

let produtoEmEdicao = null;


function abrirFormularioProduto(id = null) {

    const formulario = $("form-produto");

    formulario.reset();

    produtoEmEdicao = id;


    const produto = produtos.find(
        item => item.id === id
    );


    $("titulo-modal-produto").textContent =
        produto ? "Editar produto" : "Novo produto";


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


// ==========================================
// SALVAR PRODUTO NO SUPABASE
// ==========================================

$("form-produto").addEventListener(
    "submit",
    async evento => {

        evento.preventDefault();

        const formulario = evento.currentTarget;

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
            !/^(https:\/\/|assets\/)[^\s]*$/i.test(imagem)
        ) {

            notificar(
                "Use assets/foto.jpg ou uma URL HTTPS."
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

            estoque,

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
                item.id === anterior.id ? registro : item
            )

            : [registro, ...produtos];


        // ENVIA PARA O SUPABASE

        const botao = formulario.querySelector(
            '[type="submit"]'
        );

        botao.disabled = true;

        try {

            const salvo =
                await window.CRIAITOR_SYNC.salvarProdutos(
                    novaLista
                );


            if (!salvo) return;


            produtos = novaLista;


            $("modal-produto").close();


            atualizarTudo();


            mostrarPagina("produtos");


            notificar(
                "Produto salvo e catálogo atualizado!"
            );

        } finally {

            botao.disabled = false;

        }

    }
);


// ==========================================
// EXCLUIR PRODUTO
// ==========================================

async function excluirProduto(id) {

    const produto = produtos.find(
        item => item.id === id
    );

    if (!produto) return;


    if (!confirm(
        `Deseja excluir "${produto.nome}"?`
    )) return;


    const novaLista = produtos.filter(
        item => item.id !== id
    );


    const salvo =
        await window.CRIAITOR_SYNC.salvarProdutos(
            novaLista
        );


    if (!salvo) return;


    produtos = novaLista;


    atualizarTudo();


    notificar("Produto excluído da loja!");

}


// ==========================================
// PEDIDOS
// ==========================================

function salvarPedidos() {

    try {

        localStorage.setItem(
            CHAVE_PEDIDOS,
            JSON.stringify(pedidos)
        );

        return true;

    } catch (erro) {

        console.error(erro);

        alert("Não foi possível salvar os pedidos.");

        return false;

    }

}


function atualizarTabelaPedidos() {

    const tabela = $("tabela-pedidos");

    tabela.replaceChildren();


    [...pedidos].reverse().forEach(pedido => {

        const linha = document.createElement("tr");


        const cliente = document.createElement("td");

        cliente.append(
            elemento("strong", pedido.cliente),
            elemento("small", pedido.contato || "")
        );


        const itens = elemento("td", pedido.itens);

        const valor = elemento(
            "td",
            formatarPreco(pedido.valor)
        );


        const status = document.createElement("td");

        const seletor = document.createElement("select");

        seletor.className = "botao-pequeno";


        STATUS_PEDIDOS.forEach(opcao => {

            const option = document.createElement("option");

            option.value = opcao;

            option.textContent = opcao;

            seletor.appendChild(option);

        });


        seletor.value = pedido.status;


        seletor.addEventListener("change", () => {

            const anterior = pedido.status;

            pedido.status = seletor.value;

            if (!salvarPedidos()) {

                pedido.status = anterior;

                seletor.value = anterior;

                return;

            }

            atualizarDashboard();

        });


        status.appendChild(seletor);


        const data = elemento(
            "td",
            pedido.data || "—"
        );


        const acoes = document.createElement("td");


        const editar = elemento(
            "button",
            "Editar",
            "botao-pequeno"
        );

        editar.addEventListener("click", () => {
            abrirFormularioPedido(pedido.id);
        });


        const excluir = elemento(
            "button",
            "Excluir",
            "botao-pequeno botao-excluir"
        );

        excluir.addEventListener("click", () => {

            if (!confirm("Excluir este pedido?")) return;

            const novaLista = pedidos.filter(
                item => item.id !== pedido.id
            );

            const anterior = pedidos;

            pedidos = novaLista;

            if (!salvarPedidos()) {
                pedidos = anterior;
                return;
            }

            atualizarTudo();

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


// ==========================================
// CADASTRO DE PEDIDOS
// ==========================================

let pedidoEmEdicao = null;


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


$("form-pedido").addEventListener("submit", evento => {

    evento.preventDefault();

    const formulario = evento.currentTarget;


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

        notificar("Preencha os dados do pedido.");

        return;

    }


    const novaLista = anterior

        ? pedidos.map(item =>
            item.id === anterior.id ? registro : item
        )

        : [...pedidos, registro];


    const listaAnterior = pedidos;

    pedidos = novaLista;


    if (!salvarPedidos()) {

        pedidos = listaAnterior;

        return;

    }


    $("modal-pedido").close();


    atualizarTudo();


    notificar("Pedido registrado!");

});


// ==========================================
// FECHAR FORMULÁRIOS
// ==========================================

document.querySelectorAll("[data-fechar]").forEach(botao => {

    botao.addEventListener("click", () => {

        $(botao.dataset.fechar).close();

    });

});


// ==========================================
// EXPORTAR ARQUIVOS
// ==========================================

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


// ==========================================
// EXPORTAR CATÁLOGO
// ==========================================

$("exportar-catalogo").addEventListener("click", () => {

    const catalogo = {

        versao: 1,

        produtos

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

});


// ==========================================
// BACKUP
// ==========================================

$("baixar-backup").addEventListener("click", () => {

    const backup = {

        tipo: "criaitor3d-backup",

        versao: 1,

        produtos,

        pedidos

    };


    baixarArquivo(
        "criaitor3d-backup.json",
        JSON.stringify(backup, null, 2),
        "application/json;charset=utf-8"
    );

});


// ==========================================
// RESTAURAR BACKUP
// ==========================================

$("restaurar-backup").addEventListener(
    "change",
    async evento => {

        const arquivo = evento.target.files?.[0];

        if (!arquivo) return;


        try {

            if (arquivo.size > 3000000) {
                throw new Error("Arquivo muito grande.");
            }


            const backup = JSON.parse(
                await arquivo.text()
            );


            if (
                backup.tipo !== "criaitor3d-backup" ||
                !Array.isArray(backup.produtos) ||
                !Array.isArray(backup.pedidos) ||
                backup.produtos.length > 200
            ) {

                throw new Error("Backup incompatível.");

            }


            const validos = backup.produtos.every(p =>

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


            if (!validos || !pedidosValidos) {

                throw new Error(
                    "O backup contém registros inválidos."
                );

            }


            if (!confirm(
                "Restaurar backup? O catálogo da loja será substituído."
            )) return;


            const salvo =
                await window.CRIAITOR_SYNC.salvarProdutos(
                    backup.produtos
                );


            if (!salvo) return;


            produtos = backup.produtos;

            pedidos = backup.pedidos;


            if (!salvarPedidos()) {

                alert(
                    "O catálogo foi restaurado na nuvem, mas não foi possível salvar os pedidos locais."
                );

            }


            atualizarTudo();


            notificar("Backup restaurado!");

        } catch (erro) {

            console.error(erro);

            alert("Erro ao restaurar: " + erro.message);

        } finally {

            evento.target.value = "";

        }

    }
);


// ==========================================
// EXPORTAR PEDIDOS CSV
// ==========================================

$("exportar-pedidos").addEventListener("click", () => {

    function celula(valor) {

        let texto = String(valor ?? "");

        if (/^\s*[=+\-@]/.test(texto)) {
            texto = "'" + texto;
        }

        return '"' + texto.replace(/"/g, '""') + '"';

    }


    const linhas = [

        [
            "Cliente",
            "Contato",
            "Itens",
            "Valor",
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


    const csv = "\uFEFF" + linhas
        .map(linha => linha.map(celula).join(";"))
        .join("\r\n");


    baixarArquivo(
        "criaitor3d-pedidos.csv",
        csv,
        "text/csv;charset=utf-8"
    );

});


// ==========================================
// ATUALIZAR PAINEL
// ==========================================

function atualizarTudo() {

    atualizarDashboard();

    atualizarTabelaProdutos();

    atualizarTabelaPedidos();

}


// ==========================================
// INTEGRAÇÃO COM O SUPABASE
// ==========================================

// O sync-empresa.js utilizará estas funções
// depois de validar o login.

window.CRIAITOR_APP = {

    aplicarProdutos(lista) {

        produtos = lista.map(produto => ({
            ...produto
        }));

        atualizarTudo();

    },


    obterProdutos() {

        return produtos.map(produto => ({
            ...produto
        }));

    }

};


// ==========================================
// INICIALIZAÇÃO
// ==========================================

$("data-atual").textContent =
    new Date().toLocaleDateString("pt-BR", {

        day: "numeric",
        month: "long",
        year: "numeric"

    });


atualizarTudo();

mostrarPagina("dashboard");
