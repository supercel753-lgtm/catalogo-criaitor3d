
/*
==================================================
CRIAITOR 3D
SISTEMA DE FOTOGRAFIAS DOS PRODUTOS
==================================================

VERSÃO: 4.0

FUNCIONALIDADES:

1. Selecionar fotografias do computador.
2. Selecionar fotografias do celular.
3. Arrastar e soltar imagens.
4. Colar imagens usando Ctrl + V.
5. Pré-visualizar fotografias.
6. Editar produtos sem perder a imagem anterior.
7. Enviar fotografias ao Supabase.
8. Salvar automaticamente a URL da fotografia.
9. Integrar o upload ao admin.js.
10. Identificar erros de autenticação e upload.

ARMAZENAMENTO:

Supabase Storage

Bucket: projetos
Pasta: catalogo

FORMATOS PERMITIDOS:

JPG, JPEG, PNG e WEBP

TAMANHO MÁXIMO:

5 MB

IMPORTANTE:

Este arquivo NÃO gerencia a logo da empresa.

A logo permanece no GitHub:

assets/logo-criaitor3d.jpg

==================================================
*/

(function () {

    "use strict";


    // ==========================================
    // 1. CONFIGURAÇÕES
    // ==========================================

    const CONFIG = {

        bucket: "projetos",

        pasta: "catalogo",

        tamanhoMaximo: 5 * 1024 * 1024,

        formatos: {

            "image/jpeg": "jpg",

            "image/png": "png",

            "image/webp": "webp"

        }

    };


    // ==========================================
    // 2. ELEMENTOS DO FORMULÁRIO
    // ==========================================

    const formulario = document.getElementById(
        "form-produto"
    );

    const modal = document.getElementById(
        "modal-produto"
    );


    if (!formulario || !modal) {

        console.error(

            "CriAItor 3D: o formulário de produtos " +
            "não foi encontrado."

        );

        return;

    }


    const campoImagem = formulario.elements.namedItem(
        "imagem"
    );


    if (!campoImagem) {

        console.error(

            "CriAItor 3D: o campo imagem " +
            "não foi encontrado."

        );

        return;

    }


    const campoImagemContainer = campoImagem.closest(
        "label"
    );


    if (!campoImagemContainer) {

        console.error(

            "CriAItor 3D: não foi possível " +
            "localizar o contêiner da imagem."

        );

        return;

    }


    // ==========================================
    // 3. ESTADO DO UPLOAD
    // ==========================================

    let arquivoSelecionado = null;

    let urlPreviewTemporaria = null;

    let uploadEmAndamento = false;


    // ==========================================
    // 4. OCULTAR CAMPO ANTIGO DE URL
    // ==========================================

    /*
       O campo imagem continua existindo.

       O admin.js utiliza esse campo para
       salvar a URL da fotografia no produto.

       O administrador não precisa digitar
       manualmente o endereço da imagem.
    */


    campoImagemContainer.classList.add(
        "campo-url-legado"
    );

    campoImagemContainer.hidden = true;

    campoImagem.readOnly = true;


    // ==========================================
    // 5. CRIAR INTERFACE DE UPLOAD
    // ==========================================

    const areaFotos = document.createElement("div");

    areaFotos.className = "area-fotos-empresa";


    areaFotos.innerHTML = `

        <h3>
            Fotografia do produto
        </h3>


        <p class="descricao-upload">

            Arraste uma fotografia ou selecione
            um arquivo do seu computador ou celular.

        </p>


        <!-- ÁREA DE UPLOAD -->

        <div
            class="zona-upload"
            id="zona-upload"

            role="button"
            tabindex="0"

            aria-label="Selecionar fotografia do produto"
        >

            <div class="icone-upload">

                ⬆

            </div>


            <strong>

                Arraste sua fotografia para cá

            </strong>


            <span>

                Ou cole uma imagem usando Ctrl + V

            </span>


            <div class="botao-escolher-foto">

                Escolher imagem do computador

            </div>


            <small>

                JPG, PNG ou WEBP — máximo de 5 MB

            </small>

        </div>


        <!-- SELETOR DE ARQUIVOS -->

        <input
            type="file"

            id="input-foto-produto"

            accept="image/jpeg,image/png,image/webp"

            hidden
        >


        <!-- PRÉ-VISUALIZAÇÃO -->

        <div
            class="preview-container"

            id="preview-container"

            hidden
        >

            <img
                id="preview-foto"

                alt="Pré-visualização da fotografia"
            >


            <div class="preview-informacoes">

                <span id="nome-arquivo"></span>


                <button
                    type="button"

                    class="botao-trocar-foto"

                    id="trocar-foto"
                >

                    Trocar fotografia

                </button>

            </div>

        </div>


        <!-- MENSAGENS -->

        <p
            class="status-foto"

            id="status-foto"

            role="status"

            aria-live="polite"
        ></p>

    `;


    // Adicionar a interface antes do
    // campo que armazena a URL da imagem.

    campoImagemContainer.before(areaFotos);


    // ==========================================
    // 6. ELEMENTOS DA INTERFACE
    // ==========================================

    const zonaUpload = areaFotos.querySelector(
        "#zona-upload"
    );

    const inputFoto = areaFotos.querySelector(
        "#input-foto-produto"
    );

    const previewContainer = areaFotos.querySelector(
        "#preview-container"
    );

    const previewFoto = areaFotos.querySelector(
        "#preview-foto"
    );

    const nomeArquivo = areaFotos.querySelector(
        "#nome-arquivo"
    );

    const trocarFoto = areaFotos.querySelector(
        "#trocar-foto"
    );

    const statusFoto = areaFotos.querySelector(
        "#status-foto"
    );

    const botaoSalvar = formulario.querySelector(
        'button[type="submit"]'
    );


    // ==========================================
    // 7. EXIBIR MENSAGENS
    // ==========================================

    function mostrarStatus(

        mensagem,

        erro = false

    ) {

        statusFoto.textContent = mensagem;

        statusFoto.classList.toggle(
            "erro",
            erro
        );

    }


    // ==========================================
    // 8. LIMPAR PRÉ-VISUALIZAÇÃO
    // ==========================================

    function limparPreview() {

        if (urlPreviewTemporaria) {

            URL.revokeObjectURL(
                urlPreviewTemporaria
            );

            urlPreviewTemporaria = null;

        }


        previewFoto.removeAttribute("src");

        previewContainer.hidden = true;

        nomeArquivo.textContent = "";

    }


    // ==========================================
    // 9. EXIBIR PRÉ-VISUALIZAÇÃO
    // ==========================================

    function mostrarPreview(arquivoOuURL) {

        limparPreview();


        if (!arquivoOuURL) {

            return;

        }


        // IMAGEM NOVA

        if (arquivoOuURL instanceof File) {

            urlPreviewTemporaria =

                URL.createObjectURL(
                    arquivoOuURL
                );


            previewFoto.src =

                urlPreviewTemporaria;


            nomeArquivo.textContent =

                arquivoOuURL.name ||

                "Fotografia selecionada";


            previewContainer.hidden = false;


            return;

        }


        // IMAGEM EXISTENTE

        const endereco = String(

            arquivoOuURL

        ).trim();


        if (

            !endereco.startsWith("https://") &&

            !endereco.startsWith("assets/")

        ) {

            return;

        }


        previewFoto.src = endereco;


        nomeArquivo.textContent =

            "Fotografia atual do produto";


        previewContainer.hidden = false;

    }


    // ==========================================
    // 10. VALIDAR FOTOGRAFIA
    // ==========================================

    function validarArquivo(arquivo) {

        if (!arquivo) {

            throw new Error(

                "Selecione uma fotografia."

            );

        }


        if (

            !(arquivo instanceof File) ||

            !CONFIG.formatos[arquivo.type]

        ) {

            throw new Error(

                "Formato inválido. " +

                "Utilize JPG, PNG ou WEBP."

            );

        }


        if (

            arquivo.size <= 0 ||

            arquivo.size > CONFIG.tamanhoMaximo

        ) {

            throw new Error(

                "A fotografia deve ter no máximo 5 MB."

            );

        }


        return true;

    }


    // ==========================================
    // 11. SELECIONAR FOTOGRAFIA
    // ==========================================

    function selecionarFotografia(arquivo) {

        if (uploadEmAndamento) {

            return;

        }


        try {

            validarArquivo(arquivo);


            arquivoSelecionado = arquivo;


            mostrarPreview(arquivo);


            mostrarStatus(

                "Fotografia selecionada. " +

                "Clique em Salvar produto para enviar."

            );


        } catch (erro) {

            mostrarStatus(

                erro.message,

                true

            );

        }

    }


    // ==========================================
    // 12. ABRIR SELETOR DE ARQUIVOS
    // ==========================================

    function abrirSeletor() {

        if (uploadEmAndamento) {

            return;

        }


        inputFoto.click();

    }


    // ==========================================
    // 13. CLICAR NA ÁREA DE UPLOAD
    // ==========================================

    zonaUpload.addEventListener(

        "click",

        abrirSeletor

    );


    // Permitir acesso pelo teclado.

    zonaUpload.addEventListener(

        "keydown",

        evento => {

            if (

                evento.key === "Enter" ||

                evento.key === " "

            ) {

                evento.preventDefault();


                abrirSeletor();

            }

        }

    );


    // ==========================================
    // 14. TROCAR FOTOGRAFIA
    // ==========================================

    trocarFoto.addEventListener(

        "click",

        abrirSeletor

    );


    // ==========================================
    // 15. RECEBER ARQUIVO SELECIONADO
    // ==========================================

    inputFoto.addEventListener(

        "change",

        evento => {

            const arquivo =

                evento.target.files?.[0];


            if (arquivo) {

                selecionarFotografia(arquivo);

            }


            inputFoto.value = "";

        }

    );


    // ==========================================
    // 16. ARRASTAR E SOLTAR
    // ==========================================

    zonaUpload.addEventListener(

        "dragenter",

        evento => {

            evento.preventDefault();


            if (!uploadEmAndamento) {

                zonaUpload.classList.add(
                    "arrastando"
                );

            }

        }

    );


    zonaUpload.addEventListener(

        "dragover",

        evento => {

            evento.preventDefault();


            evento.dataTransfer.dropEffect =

                uploadEmAndamento

                    ? "none"

                    : "copy";


            if (!uploadEmAndamento) {

                zonaUpload.classList.add(
                    "arrastando"
                );

            }

        }

    );


    zonaUpload.addEventListener(

        "dragleave",

        evento => {

            evento.preventDefault();


            if (

                !zonaUpload.contains(
                    evento.relatedTarget
                )

            ) {

                zonaUpload.classList.remove(
                    "arrastando"
                );

            }

        }

    );


    zonaUpload.addEventListener(

        "drop",

        evento => {

            evento.preventDefault();


            zonaUpload.classList.remove(
                "arrastando"
            );


            if (uploadEmAndamento) {

                return;

            }


            const arquivos =

                evento.dataTransfer.files;


            if (arquivos.length !== 1) {

                mostrarStatus(

                    "Selecione apenas uma fotografia por vez.",

                    true

                );


                return;

            }


            selecionarFotografia(
                arquivos[0]
            );

        }

    );


    // ==========================================
    // 17. IMPEDIR ABERTURA ACIDENTAL
    // ==========================================

    /*
       Evita que o navegador abra uma
       imagem quando ela é arrastada
       para fora da área de upload.
    */


    document.addEventListener(

        "dragover",

        evento => {

            if (

                modal.open &&

                Array.from(

                    evento.dataTransfer?.types || []

                ).includes("Files")

            ) {

                evento.preventDefault();

            }

        }

    );


    document.addEventListener(

        "drop",

        evento => {

            if (

                modal.open &&

                Array.from(

                    evento.dataTransfer?.types || []

                ).includes("Files")

            ) {

                evento.preventDefault();

            }

        }

    );


    // ==========================================
    // 18. COLAR FOTOGRAFIA
    // ==========================================

    document.addEventListener(

        "paste",

        evento => {

            if (

                !modal.open ||

                uploadEmAndamento

            ) {

                return;

            }


            const itens =

                evento.clipboardData?.items;


            if (!itens) {

                return;

            }


            for (const item of itens) {

                if (

                    item.kind === "file" &&

                    item.type.startsWith("image/")

                ) {

                    const arquivo =

                        item.getAsFile();


                    if (arquivo) {

                        evento.preventDefault();


                        selecionarFotografia(
                            arquivo
                        );


                        break;

                    }

                }

            }

        }

    );


    // ==========================================
    // 19. ATUALIZAR IMAGEM EXISTENTE
    // ==========================================

    function atualizarImagemExistente() {

        // Não substituir a pré-visualização
        // de uma nova fotografia selecionada.

        if (arquivoSelecionado) {

            return;

        }


        const endereco =

            campoImagem.value.trim();


        if (endereco) {

            mostrarPreview(endereco);

        } else {

            limparPreview();

        }

    }


    // O admin.js dispara este evento
    // quando abre a edição do produto.

    campoImagem.addEventListener(

        "change",

        atualizarImagemExistente

    );


    // ==========================================
    // 20. LIMPAR SELEÇÃO AO REINICIAR
    // ==========================================

    formulario.addEventListener(

        "reset",

        () => {

            arquivoSelecionado = null;

            inputFoto.value = "";


            limparPreview();


            mostrarStatus("");


            zonaUpload.classList.remove(
                "arrastando"
            );

        }

    );


    // ==========================================
    // 21. VERIFICAR ADMINISTRADOR
    // ==========================================

    async function verificarAdministrador() {

        if (!window.sb) {

            throw new Error(

                "Supabase não inicializado. " +

                "Verifique supabase-config.js."

            );

        }


        const {

            data,

            error

        } = await window.sb.auth.getUser();


        if (error || !data.user) {

            throw new Error(

                "Sua sessão expirou. " +

                "Entre novamente no painel."

            );

        }


        if (

            typeof ADMIN_UID === "undefined" ||

            data.user.id !== ADMIN_UID

        ) {

            throw new Error(

                "Esta conta não possui " +

                "permissão administrativa."

            );

        }


        return data.user;

    }


    // ==========================================
    // 22. GERAR NOME EXCLUSIVO
    // ==========================================

    function gerarCaminhoArquivo(arquivo) {

        const extensao =

            CONFIG.formatos[arquivo.type];


        const nome =

            crypto.randomUUID() +

            "." +

            extensao;


        return (

            CONFIG.pasta +

            "/" +

            nome

        );

    }


    // ==========================================
    // 23. TRATAR ERROS DO SUPABASE
    // ==========================================

    function interpretarErro(erro) {

        const mensagem = String(

            erro.message || "Erro desconhecido"

        );


        const texto = mensagem.toLowerCase();


        // ERRO DE PERMISSÃO

        if (

            texto.includes("row-level security") ||

            texto.includes("new row violates") ||

            texto.includes("permission denied")

        ) {

            return new Error(

                "O Supabase bloqueou o upload. " +

                "Verifique as políticas RLS " +

                "do bucket 'projetos' e a " +

                "permissão do administrador " +

                "na pasta 'catalogo'."

            );

        }


        // BUCKET NÃO ENCONTRADO

        if (

            texto.includes("bucket not found") ||

            texto.includes("bucket does not exist")

        ) {

            return new Error(

                "O bucket 'projetos' não foi encontrado. " +

                "Confira o nome no Supabase Storage."

            );

        }


        // ARQUIVO MUITO GRANDE

        if (

            String(erro.statusCode) === "413" ||

            texto.includes("payload too large") ||

            texto.includes("exceeded the maximum")

        ) {

            return new Error(

                "A fotografia excede o limite " +

                "de tamanho permitido pelo Supabase."

            );

        }


        // OUTROS ERROS

        return new Error(

            "Não foi possível enviar a fotografia: " +

            mensagem

        );

    }


    // ==========================================
    // 24. ENVIAR FOTOGRAFIA AO SUPABASE
    // ==========================================

    async function enviarFotografia(arquivo) {

        // Validar o arquivo.

        validarArquivo(arquivo);


        // Verificar autenticação.

        await verificarAdministrador();


        // Gerar nome exclusivo.

        const caminho =

            gerarCaminhoArquivo(arquivo);


        // Enviar fotografia.

        const {

            data,

            error

        } = await window.sb.storage

            .from(CONFIG.bucket)

            .upload(

                caminho,

                arquivo,

                {

                    contentType: arquivo.type,

                    cacheControl: "3600",

                    upsert: false

                }

            );


        if (error) {

            throw interpretarErro(error);

        }


        // ==================================
        // OBTER URL PÚBLICA
        // ==================================

        const resultado = window.sb.storage

            .from(CONFIG.bucket)

            .getPublicUrl(data.path);


        const enderecoPublico =

            resultado.data?.publicUrl;


        if (!enderecoPublico) {

            throw new Error(

                "A fotografia foi enviada, mas " +

                "não foi possível obter sua URL."

            );

        }


        return enderecoPublico;

    }


    // ==========================================
    // 25. INTEGRAR AO SALVAMENTO DO PRODUTO
    // ==========================================

    /*
       O admin.js já possui um evento
       responsável por salvar produtos.

       Quando existe uma fotografia nova,
       este módulo interrompe temporariamente
       o envio do formulário.

       Primeiro envia a imagem ao Supabase.

       Depois preenche o campo imagem com
       a URL retornada pelo Storage.

       Finalmente, solicita novamente
       o envio do formulário para que
       o admin.js salve o produto.

       Quando não existe imagem nova,
       o admin.js salva normalmente.
    */


    formulario.addEventListener(

        "submit",

        async evento => {

            // Evitar novo salvamento
            // durante o upload.

            if (uploadEmAndamento) {

                evento.preventDefault();

                evento.stopImmediatePropagation();

                return;

            }


            // Não existe fotografia nova.
            // O admin.js pode salvar normalmente.

            if (!arquivoSelecionado) {

                return;

            }


            // Interromper o salvamento
            // enquanto a imagem é enviada.

            evento.preventDefault();

            evento.stopImmediatePropagation();


            uploadEmAndamento = true;


            if (botaoSalvar) {

                botaoSalvar.disabled = true;

            }


            zonaUpload.classList.add(
                "enviando"
            );


            mostrarStatus(

                "Verificando acesso e " +

                "enviando fotografia..."

            );


            try {

                // Enviar fotografia.

                const enderecoFoto =

                    await enviarFotografia(

                        arquivoSelecionado

                    );


                // Preencher o campo utilizado
                // pelo admin.js.

                campoImagem.value = enderecoFoto;


                // Limpar seleção pendente.
                //
                // Se o salvamento do produto
                // falhar, a URL continuará
                // no formulário para nova tentativa.

                arquivoSelecionado = null;

                inputFoto.value = "";


                // Atualizar pré-visualização.

                mostrarPreview(
                    enderecoFoto
                );


                mostrarStatus(

                    "Fotografia enviada! " +

                    "Salvando produto no catálogo..."

                );


            } catch (erro) {

                console.error(

                    "Erro no upload:",

                    erro

                );


                mostrarStatus(

                    erro.message,

                    true

                );


                // Preservar fotografia selecionada
                // para permitir nova tentativa.

                return;


            } finally {

                uploadEmAndamento = false;


                if (botaoSalvar) {

                    botaoSalvar.disabled = false;

                }


                zonaUpload.classList.remove(
                    "enviando"
                );

            }


            // ==================================
            // CONTINUAR SALVAMENTO
            // ==================================

            /*
               Confirmar que o formulário
               continua aberto.

               O usuário pode ter fechado
               o cadastro durante o upload.
            */


            if (!modal.open) {

                return;

            }


            /*
               Agora não existe mais arquivo
               pendente de upload.

               O segundo evento submit será
               recebido pelo admin.js, que
               salvará o produto no catálogo.
            */


            formulario.requestSubmit();

        },

        true

    );


    // ==========================================
    // 26. LIMPAR AO FECHAR O FORMULÁRIO
    // ==========================================

    modal.addEventListener(

        "close",

        () => {

            // Preservar estado durante upload.

            if (uploadEmAndamento) {

                return;

            }


            arquivoSelecionado = null;

            inputFoto.value = "";


            limparPreview();


            mostrarStatus("");

        }

    );


    // ==========================================
    // 27. API DE INTEGRAÇÃO
    // ==========================================

    window.CRIAITOR_FOTOS = {

        // Verificar se existe arquivo pendente.

        temArquivoPendente() {

            return Boolean(
                arquivoSelecionado
            );

        },


        // Verificar se há upload em andamento.

        enviando() {

            return uploadEmAndamento;

        },


        // Obter URL atual do formulário.

        obterImagem() {

            return campoImagem.value.trim();

        },


        // Atualizar pré-visualização.

        atualizarPreview() {

            atualizarImagemExistente();

        },


        // Limpar seleção de fotografias.

        limpar() {

            if (uploadEmAndamento) {

                return false;

            }


            arquivoSelecionado = null;

            inputFoto.value = "";


            limparPreview();


            mostrarStatus("");


            return true;

        }

    };


    // ==========================================
    // 28. INICIALIZAÇÃO
    // ==========================================

    console.info(

        "CriAItor 3D: sistema de fotografias inicializado."

    );


    console.info(

        "Bucket:",

        CONFIG.bucket

    );


    console.info(

        "Pasta:",

        CONFIG.pasta

    );


})();

