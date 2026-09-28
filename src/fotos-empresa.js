(function () {

"use strict";


const CONFIG = {

    bucket:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.bucket ||
        "projetos",

    pasta:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.pastaImagens ||
        "catalogo",

    tamanhoMaximo:
        5 * 1024 * 1024

};


const TIPOS = {

    "image/jpeg":
        "jpg",

    "image/png":
        "png",

    "image/webp":
        "webp"

};


const sb =
    window.sb;


const formulario =
    document.querySelector(
        "#form-produto"
    );


if (!formulario) {

    console.warn(

        "CriAItor Fotos: " +

        "formulário de produtos " +

        "não encontrado."

    );

    return;

}


const campoImagem =

    formulario.querySelector(
        '[name="imagem"]'
    );


if (!campoImagem) {

    console.warn(

        "CriAItor Fotos: " +

        "campo imagem não encontrado."

    );

    return;

}


/* =====================================================
   ESTADO
===================================================== */

const estado = {

    arquivo:
        null,

    enviando:
        false,

    urlAtual:
        "",

    urlPreviewLocal:
        null

};


/* =====================================================
   ID
===================================================== */

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


/* =====================================================
   INTERFACE
===================================================== */

const area =
    document.createElement(
        "div"
    );


area.className =
    "area-fotos-empresa";


area.innerHTML = `

    <div
        class="zona-upload"
        id="zona-upload-produto"
        tabindex="0"
        role="button"
        aria-label="Selecionar fotografia do produto"
    >

        <div class="icone-upload">
            +
        </div>

        <strong>
            Fotografia do produto
        </strong>

        <span>
            Arraste uma imagem aqui,
            clique para selecionar
            ou cole com Ctrl+V.
        </span>

        <span class="botao-escolher-foto">
            Selecionar imagem
        </span>

        <small>
            JPG, PNG ou WEBP • máximo 5 MB
        </small>

    </div>


    <input
        type="file"
        id="arquivo-foto-produto"
        accept="image/jpeg,image/png,image/webp"
        hidden
    >


    <div
        class="preview-container"
        id="preview-container-foto"
        hidden
    >

        <img
            id="preview-foto"
            alt="Pré-visualização da fotografia"
        >

        <div class="preview-informacoes">

            <span
                class="status-foto"
                id="status-foto"
            >
                Imagem selecionada
            </span>

            <button
                type="button"
                class="botao-trocar-foto"
                id="trocar-foto-produto"
            >
                Trocar imagem
            </button>

        </div>

    </div>

`;


const campoLegado =
    campoImagem.closest(
        ".campo-url-legado"
    );


if (campoLegado) {

    campoLegado.before(
        area
    );

} else {

    campoImagem.before(
        area
    );

}


/* =====================================================
   ELEMENTOS
===================================================== */

const zona =
    area.querySelector(
        "#zona-upload-produto"
    );


const inputArquivo =
    area.querySelector(
        "#arquivo-foto-produto"
    );


const previewContainer =
    area.querySelector(
        "#preview-container-foto"
    );


const preview =
    area.querySelector(
        "#preview-foto"
    );


const status =
    area.querySelector(
        "#status-foto"
    );


const trocar =
    area.querySelector(
        "#trocar-foto-produto"
    );


/* =====================================================
   STATUS
===================================================== */

function mostrarStatus(

    mensagem,

    erro = false

) {

    status.textContent =
        mensagem;


    status.classList.toggle(

        "erro",

        erro

    );

}


/* =====================================================
   LIMPAR URL LOCAL
===================================================== */

function liberarPreviewLocal() {

    if (

        estado.urlPreviewLocal

    ) {

        URL.revokeObjectURL(
            estado.urlPreviewLocal
        );


        estado.urlPreviewLocal =
            null;

    }

}


/* =====================================================
   PREVIEW
===================================================== */

function mostrarPreview(
    url
) {

    if (!url) {

        previewContainer.hidden =
            true;


        preview.removeAttribute(
            "src"
        );


        return;

    }


    preview.src =
        url;


    previewContainer.hidden =
        false;

}


function sincronizarImagemAtual() {

    const url =
        campoImagem.value.trim();


    estado.urlAtual =
        url;


    if (

        !estado.arquivo

    ) {

        liberarPreviewLocal();


        mostrarPreview(
            url
        );


        if (url) {

            mostrarStatus(
                "Fotografia atual do produto"
            );

        }

    }

}


/* =====================================================
   VALIDAR
===================================================== */

function validarArquivo(
    arquivo
) {

    if (!arquivo) {

        throw new Error(
            "Nenhuma imagem selecionada."
        );

    }


    if (

        !TIPOS[
            arquivo.type
        ]

    ) {

        throw new Error(

            "Use uma imagem JPG, PNG ou WEBP."

        );

    }


    if (

        arquivo.size >
        CONFIG.tamanhoMaximo

    ) {

        throw new Error(

            "A fotografia deve ter no máximo 5 MB."

        );

    }

}


/* =====================================================
   SELECIONAR
===================================================== */

function selecionarArquivo(
    arquivo
) {

    try {

        validarArquivo(
            arquivo
        );


        liberarPreviewLocal();


        estado.arquivo =
            arquivo;


        estado.urlPreviewLocal =

            URL.createObjectURL(
                arquivo
            );


        mostrarPreview(
            estado.urlPreviewLocal
        );


        mostrarStatus(

            `${arquivo.name} selecionada`

        );


    } catch (erro) {

        mostrarStatus(

            erro.message,

            true

        );

    }

}


/* =====================================================
   UPLOAD
===================================================== */

async function enviarImagem() {

    if (!estado.arquivo) {

        return campoImagem
            .value
            .trim();

    }


    if (!sb) {

        throw new Error(

            "Supabase não inicializado."

        );

    }


    validarArquivo(
        estado.arquivo
    );


    estado.enviando =
        true;


    zona.classList.add(
        "enviando"
    );


    mostrarStatus(
        "Enviando fotografia..."
    );


    try {

        const extensao =

            TIPOS[
                estado.arquivo.type
            ];


        const caminho =

            CONFIG.pasta +

            "/" +

            criarID() +

            "." +

            extensao;


        const {

            data,

            error

        } = await sb.storage

            .from(CONFIG.bucket)

            .upload(

                caminho,

                estado.arquivo,

                {

                    contentType:
                        estado.arquivo.type,

                    cacheControl:
                        "3600",

                    upsert:
                        false

                }

            );


        if (error) {

            throw error;

        }


        const resultado =

            sb.storage

            .from(CONFIG.bucket)

            .getPublicUrl(
                data.path
            );


        const url =

            resultado.data
                ?.publicUrl;


        if (!url) {

            throw new Error(

                "Não foi possível obter a URL da fotografia."

            );

        }


        campoImagem.value =
            url;


        estado.urlAtual =
            url;


        estado.arquivo =
            null;


        liberarPreviewLocal();


        mostrarPreview(
            url
        );


        mostrarStatus(
            "Fotografia enviada ao Supabase"
        );


        campoImagem.dispatchEvent(

            new Event(
                "change",
                {
                    bubbles: true
                }
            )

        );


        return url;


    } catch (erro) {

        console.error(
            "Erro no upload:",
            erro
        );


        mostrarStatus(

            "Erro no envio: " +
            erro.message,

            true

        );


        throw erro;


    } finally {

        estado.enviando =
            false;


        zona.classList.remove(
            "enviando"
        );

    }

}


/* =====================================================
   CLIQUE
===================================================== */

zona.addEventListener(

    "click",

    () => {

        if (!estado.enviando) {

            inputArquivo.click();

        }

    }

);


zona.addEventListener(

    "keydown",

    evento => {

        if (

            evento.key ===
                "Enter"

            ||

            evento.key ===
                " "

        ) {

            evento.preventDefault();


            inputArquivo.click();

        }

    }

);


trocar.addEventListener(

    "click",

    () => {

        if (!estado.enviando) {

            inputArquivo.click();

        }

    }

);


/* =====================================================
   FILE INPUT
===================================================== */

inputArquivo.addEventListener(

    "change",

    () => {

        const arquivo =
            inputArquivo.files?.[0];


        if (arquivo) {

            selecionarArquivo(
                arquivo
            );

        }


        inputArquivo.value =
            "";

    }

);


/* =====================================================
   DRAG AND DROP
===================================================== */

[
    "dragenter",
    "dragover"

].forEach(

    tipo => {

        zona.addEventListener(

            tipo,

            evento => {

                evento.preventDefault();


                zona.classList.add(
                    "arrastando"
                );

            }

        );

    }

);


[
    "dragleave",
    "drop"

].forEach(

    tipo => {

        zona.addEventListener(

            tipo,

            evento => {

                evento.preventDefault();


                zona.classList.remove(
                    "arrastando"
                );

            }

        );

    }

);


zona.addEventListener(

    "drop",

    evento => {

        const arquivo =

            evento.dataTransfer
                ?.files?.[0];


        if (arquivo) {

            selecionarArquivo(
                arquivo
            );

        }

    }

);


/* =====================================================
   COLAR IMAGEM
===================================================== */

document.addEventListener(

    "paste",

    evento => {

        const modal =
            document.querySelector(
                "#modal-produto"
            );


        if (

            !modal ||
            !modal.open

        ) {

            return;

        }


        const itens =

            Array.from(
                evento.clipboardData
                    ?.items || []
            );


        const itemImagem =

            itens.find(

                item =>

                    item.type
                        .startsWith(
                            "image/"
                        )

            );


        if (!itemImagem) {

            return;

        }


        const arquivo =
            itemImagem.getAsFile();


        if (arquivo) {

            evento.preventDefault();


            selecionarArquivo(
                arquivo
            );

        }

    }

);


/* =====================================================
   ALTERAÇÃO DO CAMPO IMAGEM
===================================================== */

campoImagem.addEventListener(

    "change",

    sincronizarImagemAtual

);


/* =====================================================
   QUANDO ABRIR O MODAL
===================================================== */

const modalProduto =
    document.querySelector(
        "#modal-produto"
    );


if (modalProduto) {

    const observador =
        new MutationObserver(

            () => {

                if (

                    modalProduto.open

                ) {

                    estado.arquivo =
                        null;


                    sincronizarImagemAtual();

                }

            }

        );


    observador.observe(

        modalProduto,

        {

            attributes:
                true,

            attributeFilter:
                ["open"]

        }

    );

}


/* =====================================================
   INTERCEPTAR SALVAMENTO
===================================================== */

formulario.addEventListener(

    "submit",

    async evento => {

        if (

            estado.enviando

        ) {

            evento.preventDefault();

            evento.stopImmediatePropagation();

            return;

        }


        if (

            !estado.arquivo

        ) {

            return;

        }


        /*
        Existe uma imagem nova.

        Impedimos temporariamente o admin de salvar,
        enviamos a imagem e depois submetemos novamente.
        */

        evento.preventDefault();

        evento.stopImmediatePropagation();


        const botao =

            formulario.querySelector(
                '[type="submit"]'
            );


        if (botao) {

            botao.disabled =
                true;

        }


        try {

            await enviarImagem();


            /*
            Na segunda submissão:
            estado.arquivo = null,
            então este interceptador libera o admin.js.
            */

            formulario.requestSubmit();


        } catch (erro) {

            console.error(erro);


        } finally {

            if (botao) {

                botao.disabled =
                    false;

            }

        }

    },

    true

);


/* =====================================================
   API
===================================================== */

window.CRIAITOR_FOTOS = {

    temArquivoPendente:

        () =>
            Boolean(
                estado.arquivo
            ),

    enviando:

        () =>
            estado.enviando,

    obterImagem:

        () =>
            campoImagem.value,

    enviar:
        enviarImagem,

    atualizarPreview:
        sincronizarImagemAtual,

    limpar:

        () => {

            estado.arquivo =
                null;


            liberarPreviewLocal();


            sincronizarImagemAtual();

        }

};


sincronizarImagemAtual();

})();
