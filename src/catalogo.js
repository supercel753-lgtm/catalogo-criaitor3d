
/*
==========================================
CRIAITOR 3D
CATÁLOGO DE PRODUTOS
==========================================

VERSÃO: 2.0

FUNÇÕES:

- Manter um catálogo local de referência.
- Preservar produtos existentes.
- Organizar os dados dos produtos.
- Permitir exportação de backup.
- Manter compatibilidade com admin.js.

BANCO DE DADOS:

Supabase

Tabela: public.catalogo
Registro: id = 1

Coluna de produtos: produtos
Coluna de versão: versao

ARMAZENAMENTO DE IMAGENS:

Bucket: projetos
Pasta: catalogo

==========================================
*/

(function () {

    "use strict";


    // ======================================
    // 1. CONFIGURAÇÕES
    // ======================================

    const CONFIG_CATALOGO = {

        empresa: "CriAItor 3D",

        versaoArquivo: "2.0",

        tabela: "catalogo",

        registro: 1,

        colunaProdutos: "produtos",

        colunaVersao: "versao",

        bucket: "projetos",

        pastaImagens: "catalogo"

    };


    // ======================================
    // 2. CATÁLOGO LOCAL
    // ======================================

    /*
       O catálogo local começa vazio.

       Os produtos já cadastrados serão
       carregados diretamente do Supabase
       pelo admin.js.

       NÃO é necessário cadastrar novamente
       os produtos existentes.

       Se você exportar um catalogo.js
       pelo painel administrativo,
       ele poderá conter uma cópia dos
       produtos na variável abaixo.
    */


    const PRODUTOS_INICIAIS = [];


    // ======================================
    // 3. VALIDAR PRODUTO
    // ======================================

    function validarProduto(produto) {

        if (

            !produto ||

            typeof produto !== "object" ||

            Array.isArray(produto)

        ) {

            return false;

        }


        if (

            typeof produto.nome !== "string" ||

            produto.nome.trim() === ""

        ) {

            return false;

        }


        if (

            typeof produto.categoria !== "string"

        ) {

            return false;

        }


        if (

            !Number.isFinite(
                Number(produto.preco)
            )

        ) {

            return false;

        }


        if (Number(produto.preco) < 0) {

            return false;

        }


        return true;

    }


    // ======================================
    // 4. NORMALIZAR PRODUTO
    // ======================================

    function normalizarProduto(produto) {

        if (!validarProduto(produto)) {

            return null;

        }


        const estoque = Number(

            produto.estoque ?? 0

        );


        return {

            ...produto,


            // IDENTIFICAÇÃO

            id: produto.id || crypto.randomUUID(),


            // INFORMAÇÕES PRINCIPAIS

            nome: produto.nome.trim(),

            categoria: produto.categoria.trim(),

            descricao: String(
                produto.descricao || ""
            ),


            // PREÇO E ESTOQUE

            preco: Number(produto.preco),

            estoque: Number.isInteger(estoque)

                ? Math.max(0, estoque)

                : 0,


            // PRAZO DE PRODUÇÃO

            prazo: String(

                produto.prazo ||

                "Produção sob encomenda"

            ),


            // FOTOGRAFIA DO PRODUTO

            imagem: String(

                produto.imagem || ""

            ),


            // CONFIGURAÇÕES DA LOJA

            disponivel:

                produto.disponivel !== false,


            destaque:

                produto.destaque === true

        };

    }


    // ======================================
    // 5. PREPARAR CATÁLOGO
    // ======================================

    function prepararCatalogo(lista) {

        if (!Array.isArray(lista)) {

            return [];

        }


        return lista

            .map(normalizarProduto)

            .filter(Boolean);

    }


    // ======================================
    // 6. PRESERVAR CATÁLOGO EXISTENTE
    // ======================================

    /*
       Algumas versões anteriores do painel
       utilizavam window.CRIAITOR_CATALOGO.

       Se essa variável já estiver preenchida,
       seus produtos serão preservados.

       Caso contrário, utilizamos o catálogo
       inicial deste arquivo.
    */


    const catalogoExistente =

        Array.isArray(window.CRIAITOR_CATALOGO)

            ? window.CRIAITOR_CATALOGO

            : PRODUTOS_INICIAIS;


    // ======================================
    // 7. DISPONIBILIZAR CATÁLOGO
    // ======================================

    window.CRIAITOR_CATALOGO =

        prepararCatalogo(catalogoExistente);


    // ======================================
    // 8. CONFIGURAÇÕES PÚBLICAS
    // ======================================

    window.CRIAITOR_CONFIG_CATALOGO =

        Object.freeze({

            ...CONFIG_CATALOGO

        });


    // ======================================
    // 9. FUNÇÕES AUXILIARES
    // ======================================

    window.CRIAITOR_CATALOGO_UTILS = {

        validarProduto,

        normalizarProduto,

        prepararCatalogo,


        // RETORNAR CATÁLOGO LOCAL

        obterProdutos() {

            return [

                ...window.CRIAITOR_CATALOGO

            ];

        },


        // BUSCAR PRODUTO POR ID

        buscarProduto(id) {

            return window.CRIAITOR_CATALOGO.find(

                produto =>

                    String(produto.id) === String(id)

            ) || null;

        },


        // FILTRAR PRODUTOS VISÍVEIS

        produtosVisiveis() {

            return window.CRIAITOR_CATALOGO.filter(

                produto =>

                    produto.disponivel !== false

            );

        },


        // FILTRAR PRODUTOS EM DESTAQUE

        produtosDestaque() {

            return window.CRIAITOR_CATALOGO.filter(

                produto =>

                    produto.disponivel !== false &&

                    produto.destaque === true

            );

        },


        // RETORNAR CATEGORIAS

        obterCategorias() {

            return [

                ...new Set(

                    window.CRIAITOR_CATALOGO

                        .map(

                            produto =>

                                produto.categoria

                        )

                        .filter(Boolean)

                )

            ].sort();

        }

    };


    // ======================================
    // 10. FINALIZAÇÃO
    // ======================================

    console.info(

        "CriAItor 3D: catálogo local inicializado."

    );


    console.info(

        "Produtos disponíveis no catálogo local:",

        window.CRIAITOR_CATALOGO.length

    );


    console.info(

        "O catálogo principal será carregado " +

        "pelo admin.js a partir do Supabase."

    );

})();
