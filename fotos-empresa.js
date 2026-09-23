
/*
==========================================
CRIAITOR 3D
SISTEMA DE UPLOAD DE FOTOGRAFIAS
==========================================

RECURSOS:

1. Arrastar e soltar imagens do computador.
2. Copiar e colar imagens com Ctrl + V.
3. Selecionar fotografias do HD ou celular.
4. Pré-visualização da imagem.
5. Envio automático ao Supabase Storage.
6. Integração com o cadastro de produtos.

BUCKET: projetos
PASTA: catalogo

==========================================
*/

"use strict";


// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================

const FOTO_BUCKET = "projetos";

const FOTO_PASTA = "catalogo";

const FOTO_TAMANHO_MAXIMO = 5 * 1024 * 1024;


const FOTO_FORMATOS = {

    "image/jpeg": "jpg",

    "image/png": "png",

    "image/webp": "webp"

};


// ==========================================
// 2. LOCALIZAR FORMULÁRIO EXISTENTE
// ==========================================

const formularioFotos = document.getElementById(
    "form-produto"
);


const campoImagem = formularioFotos.querySelector(
    '[name="imagem"]'
);


const campoImagemOriginal = campoImagem.closest(
    "label"
);


// ==========================================
// 3. OCULTAR O CAMPO ANTIGO DE URL
// ==========================================

// O campo de endereço continuará existindo
// para que o admin.js consiga salvar a URL
// retornada pelo Supabase.
//
// Entretanto, o usuário não precisará
// visualizar nem preencher esse campo.

campoImagemOriginal.classList.add(
    "campo-url-legado"
);


// ==========================================
// 4. CRIAR INTERFACE DE UPLOAD
// ==========================================

const areaFotos = document.createElement("div");

areaFotos.className = "area-fotos-empresa";


areaFotos.innerHTML = `

    <h3>
        Fotografia do produto
    </h3>


    <p class="descricao-upload">

        Adicione uma fotografia do seu produto
        diretamente do computador ou celular.

    </p>


    <!-- ÁREA PRINCIPAL DE UPLOAD -->

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

            Ou copie uma imagem e pressione Ctrl + V

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
        aria-label="Selecionar fotografia"
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
            alt="Pré-visualização da fotografia selecionada"
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


    <!-- MENSAGEM DE STATUS -->

    <p
        class="status-foto"
        id="status-foto"
        role="status"
        aria-live="polite"
    ></p>

`;


// Coloca o upload no lugar do campo de URL.

campoImagemOriginal.parentNode.insertBefore(

    areaFotos,

    campoImagemOriginal

);


// ==========================================
// 5. ELEMENTOS DA INTERFACE
// ==========================================

const zonaUpload = document.getElementById(
    "zona-upload"
);


const inputFoto = document.getElementById(
    "input-foto-produto"
);


const previewContainer = document.getElementById(
    "preview-container"
);


const previewFoto = document.getElementById(
    "preview-foto"
);


const nomeArquivo = document.getElementById(
    "nome-arquivo"
);


const trocarFoto = document.getElementById(
    "trocar-foto"
);


const statusFoto = document.getElementById(
    "status-foto"
);


const modalProduto = document.getElementById(
    "modal-produto"
);


// ==========================================
// 6. ESTADO DO UPLOAD
// ==========================================

let arquivoSelecionado = null;

let enderecoPreviewTemporario = null;

let uploadEmAndamento = false;


// ==========================================
// 7. MENSAGENS DE STATUS
// ==========================================

function mostrarStatusFoto(mensagem, erro = false) {

    statusFoto.textContent = mensagem;


    statusFoto.classList.toggle(

        "erro",

        erro

    );

}


// ==========================================
// 8. LIMPAR PRÉ-VISUALIZAÇÃO
// ==========================================

function limparPreviewFoto() {

    if (enderecoPreviewTemporario) {

        URL.revokeObjectURL(

            enderecoPreviewTemporario

        );


        enderecoPreviewTemporario = null;

    }


    previewFoto.removeAttribute("src");


    previewContainer.hidden = true;


    nomeArquivo.textContent = "";

}


// ==========================================
// 9. MOSTRAR PRÉ-VISUALIZAÇÃO
// ==========================================

function mostrarPreviewFoto(arquivoOuURL) {

    limparPreviewFoto();


    if (!arquivoOuURL) {

        return;

    }


    // IMAGEM LOCAL

    if (arquivoOuURL instanceof File) {

        enderecoPreviewTemporario =

            URL.createObjectURL(

                arquivoOuURL

            );


        previewFoto.src = enderecoPreviewTemporario;


        nomeArquivo.textContent =

            arquivoOuURL.name || "Imagem colada";

    }


    // IMAGEM JÁ CADASTRADA

    else {

        const endereco = String(

            arquivoOuURL

        );


        if (

            !/^(https:\/\/|assets\/)[^\s]*$/i.test(

                endereco

            )

        ) {

            return;

        }


        previewFoto.src = endereco;


        nomeArquivo.textContent =

            "Fotografia atual do produto";

    }


    previewContainer.hidden = false;

}


// ==========================================
// 10. VALIDAR ARQUIVO
// ==========================================

function validarArquivoFoto(arquivo) {

    if (!arquivo) {

        throw new Error(

            "Nenhuma fotografia foi selecionada."

        );

    }


    if (!FOTO_FORMATOS[arquivo.type]) {

        throw new Error(

            "Formato inválido. Utilize JPG, PNG ou WEBP."

        );

    }


    if (

        arquivo.size <= 0 ||

        arquivo.size > FOTO_TAMANHO_MAXIMO

    ) {

        throw new Error(

            "A fotografia deve ter no máximo 5 MB."

        );

    }


    return true;

}


// ==========================================
// 11. SELECIONAR UMA FOTOGRAFIA
// ==========================================

function selecionarFotografia(arquivo) {

    if (uploadEmAndamento) {

        return;

    }


    try {

        validarArquivoFoto(arquivo);


        arquivoSelecionado = arquivo;


        mostrarPreviewFoto(arquivo);


        mostrarStatusFoto(

            "Fotografia selecionada. " +

            "Clique em Salvar produto para publicar."

        );

    } catch (erro) {

        mostrarStatusFoto(

            erro.message,

            true

        );

    }

}


// ==========================================
// 12. SELECIONAR ARQUIVO DO HD
// ==========================================

function abrirSeletorArquivos() {

    if (uploadEmAndamento) {

        return;

    }


    inputFoto.click();

}


// Clicar na área de upload.

zonaUpload.addEventListener(

    "click",

    abrirSeletorArquivos

);


// Enter ou espaço também abrem o seletor.

zonaUpload.addEventListener(

    "keydown",

    evento => {

        if (

            evento.key === "Enter" ||

            evento.key === " "

        ) {

            evento.preventDefault();


            abrirSeletorArquivos();

        }

    }

);


// Botão para trocar fotografia.

trocarFoto.addEventListener(

    "click",

    abrirSeletorArquivos

);


// Receber imagem escolhida no HD.

inputFoto.addEventListener(

    "change",

    evento => {

        const arquivo =

            evento.target.files?.[0];


        if (arquivo) {

            selecionarFotografia(arquivo);

        }


        // Permite selecionar novamente
        // o mesmo arquivo posteriormente.

        inputFoto.value = "";

    }

);


// ==========================================
// 13. ARRASTAR E SOLTAR
// ==========================================

// Quando o usuário começa a arrastar
// um arquivo sobre a área de upload.

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


// Enquanto a imagem estiver sobre a área.

zonaUpload.addEventListener(

    "dragover",

    evento => {

        evento.preventDefault();


        evento.dataTransfer.dropEffect =

            uploadEmAndamento ? "none" : "copy";


        if (!uploadEmAndamento) {

            zonaUpload.classList.add(

                "arrastando"

            );

        }

    }

);


// Quando o arquivo sair da área.

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


// Quando o usuário soltar a fotografia.

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


        if (!arquivos.length) {

            mostrarStatusFoto(

                "Arraste um arquivo de imagem do computador.",

                true

            );


            return;

        }


        if (arquivos.length > 1) {

            mostrarStatusFoto(

                "Selecione apenas uma fotografia por produto.",

                true

            );


            return;

        }


        selecionarFotografia(

            arquivos[0]

        );

    }

);


// Impede que o navegador abra uma imagem
// quando ela for solta fora da área de upload,
// enquanto o cadastro estiver aberto.

document.addEventListener(

    "dragover",

    evento => {

        if (

            modalProduto.open &&

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

            modalProduto.open &&

            Array.from(

                evento.dataTransfer?.types || []

            ).includes("Files")

        ) {

            evento.preventDefault();

        }

    }

);


// ==========================================
// 14. COPIAR E COLAR IMAGENS
// ==========================================

// Permite colar fotografias copiadas
// de um editor, captura de tela ou arquivo.
//
// Funciona com Ctrl + V no Windows
// e Command + V no Mac.

document.addEventListener(

    "paste",

    evento => {

        // Somente quando o formulário
        // de produtos estiver aberto.

        if (!modalProduto.open) {

            return;

        }


        if (uploadEmAndamento) {

            return;

        }


        const clipboard = evento.clipboardData;


        if (!clipboard) {

            return;

        }


        let arquivoImagem = null;


        // Procurar uma imagem no conteúdo
        // copiado pelo usuário.

        for (const item of clipboard.items) {

            if (

                item.kind === "file" &&

                item.type.startsWith("image/")

            ) {

                arquivoImagem = item.getAsFile();


                if (arquivoImagem) {

                    break;

                }

            }

        }


        // Se não encontrou uma imagem,
        // deixa a colagem de textos funcionar
        // normalmente nos demais campos.

        if (!arquivoImagem) {

            return;

        }


        // Impede que a imagem seja colada
        // dentro de um campo de texto.

        evento.preventDefault();


        selecionarFotografia(

            arquivoImagem

        );

    }

);


// ==========================================
// 15. REINICIAR UPLOAD AO ABRIR PRODUTO
// ==========================================

// O admin.js executa form.reset()
// quando um produto é aberto para cadastro
// ou edição.
//
// Aqui limpamos a seleção anterior e
// mostramos a fotografia já cadastrada,
// caso o produto esteja sendo editado.

formularioFotos.addEventListener(

    "reset",

    () => {

        arquivoSelecionado = null;


        inputFoto.value = "";


        limparPreviewFoto();


        mostrarStatusFoto("");


        zonaUpload.classList.remove(

            "arrastando"

        );


        queueMicrotask(() => {

            if (campoImagem.value.trim()) {

                mostrarPreviewFoto(

                    campoImagem.value.trim()

                );

            }

        });

    }

);


// ==========================================
// 16. ENVIAR FOTOGRAFIA AO SUPABASE
// ==========================================

async function enviarFotografiaSupabase(arquivo) {

    validarArquivoFoto(arquivo);


    // Confirmar login administrativo.

    const {

        data: dadosUsuario,

        error: erroUsuario

    } = await window.sb.auth.getUser();


    if (

        erroUsuario ||

        !dadosUsuario.user ||

        dadosUsuario.user.id !== ADMIN_UID

    ) {

        throw new Error(

            "Faça login como administrador para enviar imagens."

        );

    }


    // Gerar nome exclusivo para a fotografia.

    const extensao =

        FOTO_FORMATOS[arquivo.type];


    const nomeArquivo =

        crypto.randomUUID() + "." + extensao;


    const caminhoArquivo =

        FOTO_PASTA + "/" + nomeArquivo;


    // ======================================
    // ENVIAR ARQUIVO AO STORAGE
    // ======================================

    const {

        data,

        error

    } = await window.sb.storage

        .from(FOTO_BUCKET)

        .upload(

            caminhoArquivo,

            arquivo,

            {

                contentType: arquivo.type,

                cacheControl: "3600",

                upsert: false

            }

        );


    if (error) {

        throw error;

    }


    // ======================================
    // OBTER ENDEREÇO DA IMAGEM
    // ======================================

    const resultado = window.sb.storage

        .from(FOTO_BUCKET)

        .getPublicUrl(

            data.path

        );


    const enderecoPublico =

        resultado.data.publicUrl;


    if (!enderecoPublico) {

        throw new Error(

            "A imagem foi enviada, mas não foi possível obter sua URL."

        );

    }


    return enderecoPublico;

}


// ==========================================
// 17. INTEGRAR AO SALVAMENTO DO PRODUTO
// ==========================================

// Quando o usuário clicar em Salvar:
//
// 1. Se houver uma nova imagem, realiza upload.
// 2. Preenche o campo oculto de imagem.
// 3. Executa o salvamento normal do admin.js.
// 4. O admin.js publica o produto no catálogo.

formularioFotos.addEventListener(

    "submit",

    async evento => {

        // Sem imagem nova:
        // mantém a fotografia existente
        // e permite o salvamento normal.

        if (!arquivoSelecionado) {

            return;

        }


        // Interromper temporariamente
        // o salvamento original.

        evento.preventDefault();

        evento.stopImmediatePropagation();


        if (uploadEmAndamento) {

            return;

        }


        uploadEmAndamento = true;


        const botaoSalvar = formularioFotos.querySelector(

            'button[type="submit"]'

        );


        botaoSalvar.disabled = true;


        zonaUpload.classList.add(

            "enviando"

        );


        mostrarStatusFoto(

            "Enviando fotografia ao Supabase..."

        );


        let uploadConcluido = false;


        try {

            // Realizar upload.

            const urlFoto =

                await enviarFotografiaSupabase(

                    arquivoSelecionado

                );


            // Guardar endereço no campo oculto.

            campoImagem.value = urlFoto;


            // Limpar arquivo pendente.

            arquivoSelecionado = null;


            inputFoto.value = "";


            // Mostrar a foto hospedada.

            mostrarPreviewFoto(

                urlFoto

            );


            mostrarStatusFoto(

                "Fotografia enviada! Salvando produto..."

            );


            uploadConcluido = true;

        } catch (erro) {

            console.error(

                "Erro ao enviar fotografia:",

                erro

            );


            mostrarStatusFoto(

                "Não foi possível enviar a imagem: " +

                erro.message,

                true

            );

        } finally {

            uploadEmAndamento = false;


            botaoSalvar.disabled = false;


            zonaUpload.classList.remove(

                "enviando"

            );

        }


        // Executa o salvamento normal
        // depois que a foto estiver hospedada.

        if (uploadConcluido) {

            formularioFotos.requestSubmit(

                botaoSalvar

            );

        }

    },

    true

);


// ==========================================
// 18. ATUALIZAR PREVIEW DA IMAGEM EXISTENTE
// ==========================================

// Caso uma URL seja alterada por outro código,
// atualiza a pré-visualização.

campoImagem.addEventListener(

    "change",

    () => {

        if (!arquivoSelecionado) {

            mostrarPreviewFoto(

                campoImagem.value.trim()

            );

        }

    }

);
