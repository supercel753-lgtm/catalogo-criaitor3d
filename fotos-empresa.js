
/*
==========================================
CRIAITOR 3D
UPLOAD DE FOTOGRAFIAS DOS PRODUTOS
==========================================

Este arquivo adiciona upload de imagens
ao formulário administrativo existente.

As fotografias são enviadas ao
Supabase Storage.

O endereço da imagem é inserido
automaticamente no cadastro do produto.

==========================================
*/

"use strict";


// ==========================================
// CONFIGURAÇÕES
// ==========================================

const FOTO_BUCKET = "produtos";

const FOTO_PASTA = "catalogo";

const FOTO_TAMANHO_MAXIMO = 5 * 1024 * 1024;


// Formatos permitidos.

const FOTO_FORMATOS = {

    "image/jpeg": "jpg",

    "image/png": "png",

    "image/webp": "webp"

};


// ==========================================
// ELEMENTOS DO FORMULÁRIO
// ==========================================

const formularioFotos = document.getElementById(
    "form-produto"
);


const campoEnderecoFoto = formularioFotos.querySelector(
    '[name="imagem"]'
);


const campoOriginalFoto =
    campoEnderecoFoto.closest("label");


// ==========================================
// CRIAR ÁREA DE UPLOAD
// ==========================================

const areaUpload = document.createElement("div");

areaUpload.className = "area-upload-fotos";


areaUpload.innerHTML = `

    <label for="arquivo-foto-produto">

        Fotografia do produto

    </label>


    <input

        type="file"

        id="arquivo-foto-produto"

        accept="image/jpeg,image/png,image/webp"

    >


    <p class="upload-instrucao">

        Selecione uma fotografia do computador
        ou celular.

        Formatos aceitos: JPG, PNG e WEBP.

        Tamanho máximo: 5 MB.

    </p>


    <div class="visualizacao-foto">

        <img

            id="preview-foto-produto"

            alt="Pré-visualização da fotografia"

            hidden

        >

    </div>


    <p

        id="status-upload-foto"

        role="status"

        aria-live="polite"

    ></p>

`;


// Coloca a área de upload acima
// do campo de endereço da imagem.

campoOriginalFoto.parentNode.insertBefore(

    areaUpload,

    campoOriginalFoto

);


// ==========================================
// ELEMENTOS DE UPLOAD
// ==========================================

const campoArquivoFoto = document.getElementById(
    "arquivo-foto-produto"
);


const previewFoto = document.getElementById(
    "preview-foto-produto"
);


const statusFoto = document.getElementById(
    "status-upload-foto"
);


// ==========================================
// ESTADO DO UPLOAD
// ==========================================

let fotoEmUpload = false;

let urlPreviewTemporaria = null;


// ==========================================
// MENSAGENS
// ==========================================

function informarStatusFoto(mensagem, erro = false) {

    statusFoto.textContent = mensagem;

    statusFoto.style.color = erro

        ? "#ff8e8e"

        : "#91e4b1";

}


// ==========================================
// REMOVER PREVIEW TEMPORÁRIO
// ==========================================

function limparPreviewTemporario() {

    if (urlPreviewTemporaria) {

        URL.revokeObjectURL(

            urlPreviewTemporaria

        );

        urlPreviewTemporaria = null;

    }

}


// ==========================================
// EXIBIR PREVIEW
// ==========================================

function mostrarPreviewFoto(arquivoOuURL) {

    limparPreviewTemporario();


    if (!arquivoOuURL) {

        previewFoto.hidden = true;

        previewFoto.removeAttribute("src");

        return;

    }


    if (arquivoOuURL instanceof File) {

        urlPreviewTemporaria =

            URL.createObjectURL(

                arquivoOuURL

            );


        previewFoto.src = urlPreviewTemporaria;

    } else {

        const endereco = String(

            arquivoOuURL

        );


        if (

            !/^(https:\/\/|assets\/)[^\s]*$/i.test(

                endereco

            )

        ) {

            previewFoto.hidden = true;

            return;

        }


        previewFoto.src = endereco;

    }


    previewFoto.hidden = false;

}


// ==========================================
// SELECIONAR FOTOGRAFIA
// ==========================================

campoArquivoFoto.addEventListener(

    "change",

    () => {

        const arquivo = campoArquivoFoto.files?.[0];


        if (!arquivo) {

            mostrarPreviewFoto(

                campoEnderecoFoto.value.trim()

            );

            informarStatusFoto("");

            return;

        }


        // Verifica o formato.

        if (!FOTO_FORMATOS[arquivo.type]) {

            informarStatusFoto(

                "Formato inválido. Use JPG, PNG ou WEBP.",

                true

            );


            campoArquivoFoto.value = "";


            mostrarPreviewFoto(

                campoEnderecoFoto.value.trim()

            );

            return;

        }


        // Verifica o tamanho.

        if (arquivo.size > FOTO_TAMANHO_MAXIMO) {

            informarStatusFoto(

                "A fotografia deve ter no máximo 5 MB.",

                true

            );


            campoArquivoFoto.value = "";


            mostrarPreviewFoto(

                campoEnderecoFoto.value.trim()

            );

            return;

        }


        // Exibe a fotografia selecionada.

        mostrarPreviewFoto(arquivo);


        informarStatusFoto(

            "Fotografia selecionada. " +

            "Ela será enviada ao salvar o produto."

        );

    }

);


// ==========================================
// ATUALIZAR PREVIEW AO DIGITAR URL
// ==========================================

campoEnderecoFoto.addEventListener(

    "change",

    () => {

        if (!campoArquivoFoto.files?.length) {

            mostrarPreviewFoto(

                campoEnderecoFoto.value.trim()

            );

        }

    }

);


// ==========================================
// REINICIAR ÁREA DE UPLOAD
// ==========================================

// O admin.js utiliza form.reset() quando
// o usuário abre o cadastro ou edita
// um produto.
//
// Este evento limpa a fotografia selecionada
// anteriormente e atualiza o preview.

formularioFotos.addEventListener(

    "reset",

    () => {

        limparPreviewTemporario();


        informarStatusFoto("");


        queueMicrotask(() => {

            mostrarPreviewFoto(

                campoEnderecoFoto.value.trim()

            );

        });

    }

);


// ==========================================
// ENVIAR FOTOGRAFIA AO SUPABASE
// ==========================================

async function enviarFotografiaSupabase(arquivo) {

    // Verificação adicional do formato.

    const extensao = FOTO_FORMATOS[arquivo.type];


    if (!extensao) {

        throw new Error(

            "Formato de imagem não permitido."

        );

    }


    // Verificação adicional do tamanho.

    if (arquivo.size > FOTO_TAMANHO_MAXIMO) {

        throw new Error(

            "A fotografia excede o limite de 5 MB."

        );

    }


    // O usuário precisa estar autenticado.

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

            "Faça login como administrador " +

            "antes de enviar fotografias."

        );

    }


    // Cria um nome exclusivo para cada foto.
    //
    // Isso evita sobrescrever arquivos antigos
    // e problemas de cache nas imagens.

    const nomeArquivo =

        crypto.randomUUID() + "." + extensao;


    const caminhoArquivo =

        FOTO_PASTA + "/" + nomeArquivo;


    // ======================================
    // REALIZAR UPLOAD
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

                cacheControl: "3600",

                contentType: arquivo.type,

                upsert: false

            }

        );


    if (error) {

        throw error;

    }


    // ======================================
    // OBTER URL PÚBLICA
    // ======================================

    const resultado = window.sb.storage

        .from(FOTO_BUCKET)

        .getPublicUrl(

            data.path

        );


    const urlPublica =

        resultado.data.publicUrl;


    if (!urlPublica) {

        throw new Error(

            "A fotografia foi enviada, " +

            "mas não foi possível obter sua URL."

        );

    }


    return urlPublica;

}


// ==========================================
// INTEGRAR AO BOTÃO SALVAR PRODUTO
// ==========================================

// O admin.js já possui um evento submit
// responsável por salvar os produtos.
//
// Este evento é executado antes dele.
//
// Quando uma foto é selecionada:
// 1. Aguarda o upload;
// 2. Preenche o campo de imagem;
// 3. Executa o salvamento original.

formularioFotos.addEventListener(

    "submit",

    async evento => {

        const arquivo = campoArquivoFoto.files?.[0];


        // Sem nova fotografia:
        // deixa o admin.js salvar normalmente.

        if (!arquivo) {

            return;

        }


        // Interrompe o envio original enquanto
        // a fotografia está sendo enviada.

        evento.preventDefault();

        evento.stopImmediatePropagation();


        if (fotoEmUpload) {

            return;

        }


        fotoEmUpload = true;


        const botaoSalvar = formularioFotos.querySelector(

            'button[type="submit"]'

        );


        botaoSalvar.disabled = true;


        informarStatusFoto(

            "Enviando fotografia ao Supabase..."

        );


        let uploadConcluido = false;


        try {

            // ==================================
            // UPLOAD
            // ==================================

            const urlFoto =

                await enviarFotografiaSupabase(

                    arquivo

                );


            // ==================================
            // PREENCHER URL AUTOMATICAMENTE
            // ==================================

            campoEnderecoFoto.value = urlFoto;


            // Remove a seleção para que
            // o próximo submit prossiga
            // diretamente para o admin.js.

            campoArquivoFoto.value = "";


            // Exibe a imagem hospedada.

            mostrarPreviewFoto(urlFoto);


            informarStatusFoto(

                "Fotografia enviada! " +

                "Salvando o produto..."

            );


            uploadConcluido = true;

        } catch (erro) {

            console.error(

                "Erro no upload da fotografia:",

                erro

            );


            informarStatusFoto(

                "Não foi possível enviar a fotografia. " +

                erro.message,

                true

            );

        } finally {

            fotoEmUpload = false;

            botaoSalvar.disabled = false;

        }


        // ==================================
        // SALVAR PRODUTO
        // ==================================

        // O admin.js continuará o salvamento,
        // incluindo a URL da fotografia
        // no catálogo compartilhado.

        if (uploadConcluido) {

            formularioFotos.requestSubmit();

        }

    },

    true

);


// ==========================================
// ESTILOS DA ÁREA DE UPLOAD
// ==========================================

const estilosFotos = document.createElement("style");


estilosFotos.textContent = `

.area-upload-fotos {

    grid-column: 1 / -1;

    padding: 18px;

    border: 1px dashed #8554a1;

    border-radius: 12px;

    background: #30243a;

}


.area-upload-fotos > label {

    display: block;

    margin-bottom: 12px;

    color: #f4e4ff;

    font-size: 13px;

    font-weight: 800;

}


.area-upload-fotos input[type="file"] {

    width: 100%;

    padding: 12px;

    background: #21172c;

    border: 1px solid #6c5177;

    border-radius: 9px;

    color: white;

    font-size: 12px;

}


.upload-instrucao {

    margin-top: 12px;

    color: #b8a8c3;

    font-size: 11px;

    line-height: 1.6;

}


.visualizacao-foto {

    display: flex;

    align-items: center;

    justify-content: center;

    margin-top: 15px;

}


#preview-foto-produto {

    display: block;

    width: 100%;

    max-width: 260px;

    max-height: 260px;

    object-fit: contain;

    border: 1px solid #714188;

    border-radius: 12px;

    background: #17101f;

}


#preview-foto-produto[hidden] {

    display: none;

}


#status-upload-foto {

    margin-bottom: 0;

    font-size: 12px;

    font-weight: 700;

}


.form-login button:disabled,
#form-produto button:disabled {

    opacity: 0.55;

    cursor: wait;

}

`;


document.head.appendChild(estilosFotos);
