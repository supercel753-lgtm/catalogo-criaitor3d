
/*
==========================================
CRIAITOR 3D
UPLOAD DE FOTOGRAFIAS
==========================================

FUNCIONALIDADES:

- Arrastar e soltar fotografias
- Selecionar imagens do computador
- Colar imagens com Ctrl + V
- Pré-visualizar fotografias
- Verificar autenticação administrativa
- Enviar imagens ao Supabase Storage
- Salvar a URL no cadastro do produto

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
// 2. ELEMENTOS DO FORMULÁRIO
// ==========================================

const formularioFotos = document.getElementById(
    "form-produto"
);

const modalProduto = document.getElementById(
    "modal-produto"
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

// O campo continua existindo para guardar
// o endereço retornado pelo Supabase.
//
// O administrador não precisa digitar URLs.

campoImagemOriginal.classList.add(
    "campo-url-legado"
);

campoImagem.readOnly = true;


// ==========================================
// 4. CRIAR INTERFACE DE UPLOAD
// ==========================================

const areaFotos = document.createElement("div");

areaFotos.className = "area-fotos-empresa";

areaFotos.innerHTML = `

    <h3>Fotografia do produto</h3>

    <p class="descricao-upload">

        Arraste, cole ou selecione uma fotografia
        diretamente do seu computador ou celular.

    </p>


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
            Ou pressione Ctrl + V para colar
        </span>

        <div class="botao-escolher-foto">

            Escolher imagem do computador

        </div>

        <small>

            JPG, PNG ou WEBP — máximo de 5 MB

        </small>

    </div>


    <input
        type="file"
        id="input-foto-produto"
        accept="image/jpeg,image/png,image/webp"
        hidden
    >


    <div
        class="preview-container"
        id="preview-container"
        hidden
    >

        <img
            id="preview-foto"
            alt="Fotografia selecionada"
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


    <p
        class="status-foto"
        id="status-foto"
        role="status"
        aria-live="polite"
    ></p>

`;


// Adicionar a área de upload ao formulário.

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


// ==========================================
// 6. CONTROLE DO UPLOAD
// ==========================================

let arquivoSelecionado = null;

let enderecoPreviewTemporario = null;

let uploadEmAndamento = false;


// ==========================================
// 7. MENSAGENS
// ==========================================

function mostrarStatusFoto(mensagem, erro = false) {

    statusFoto.textContent = mensagem;

    statusFoto.classList.toggle(
        "erro",
        erro
    );

}


// ==========================================
// 8. PRÉ-VISUALIZAÇÃO
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


function mostrarPreviewFoto(arquivoOuURL) {

    limparPreviewFoto();

    if (!arquivoOuURL) return;


    if (arquivoOuURL instanceof File) {

        enderecoPreviewTemporario =
            URL.createObjectURL(arquivoOuURL);

        previewFoto.src =
            enderecoPreviewTemporario;

        nomeArquivo.textContent =
            arquivoOuURL.name || "Imagem selecionada";

    } else {

        const endereco = String(arquivoOuURL);

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
// 9. VALIDAR FOTOGRAFIA
// ==========================================

function validarArquivoFoto(arquivo) {

    if (!arquivo) {

        throw new Error(
            "Selecione uma fotografia."
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

}


// ==========================================
// 10. SELECIONAR FOTOGRAFIA
// ==========================================

function selecionarFotografia(arquivo) {

    if (uploadEmAndamento) return;


    try {

        validarArquivoFoto(arquivo);

        arquivoSelecionado = arquivo;

        mostrarPreviewFoto(arquivo);

        mostrarStatusFoto(

            "Fotografia selecionada. " +
            "Clique em Salvar produto para enviar."

        );

    } catch (erro) {

        mostrarStatusFoto(
            erro.message,
            true
        );

    }

}


// ==========================================
// 11. SELECIONAR IMAGEM DO HD
// ==========================================

function abrirSeletorArquivos() {

    if (uploadEmAndamento) return;

    inputFoto.click();

}


zonaUpload.addEventListener(
    "click",
    abrirSeletorArquivos
);


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


trocarFoto.addEventListener(
    "click",
    abrirSeletorArquivos
);


inputFoto.addEventListener(
    "change",
    evento => {

        const arquivo = evento.target.files?.[0];

        if (arquivo) {

            selecionarFotografia(arquivo);

        }

        inputFoto.value = "";

    }
);


// ==========================================
// 12. ARRASTAR E SOLTAR
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
            uploadEmAndamento ? "none" : "copy";

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

        if (uploadEmAndamento) return;


        const arquivos = evento.dataTransfer.files;


        if (arquivos.length !== 1) {

            mostrarStatusFoto(

                "Selecione apenas uma fotografia por produto.",

                true

            );

            return;

        }


        selecionarFotografia(arquivos[0]);

    }
);


// Impede que o navegador abra a imagem
// caso ela seja solta fora da área de upload.

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
// 13. COPIAR E COLAR IMAGENS
// ==========================================

document.addEventListener(
    "paste",
    evento => {

        if (!modalProduto.open) return;

        if (uploadEmAndamento) return;


        const itens = evento.clipboardData?.items;

        if (!itens) return;


        for (const item of itens) {

            if (
                item.kind === "file" &&
                item.type.startsWith("image/")
            ) {

                const arquivo = item.getAsFile();

                if (!arquivo) continue;


                evento.preventDefault();

                selecionarFotografia(arquivo);

                break;

            }

        }

    }
);


// ==========================================
// 14. LIMPAR O FORMULÁRIO
// ==========================================

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


        // Ao editar, o admin.js preencherá
        // o campo de imagem existente.

        queueMicrotask(() => {

            const endereco =
                campoImagem.value.trim();

            if (endereco) {

                mostrarPreviewFoto(endereco);

            }

        });

    }
);


// ==========================================
// 15. VERIFICAR AUTENTICAÇÃO
// ==========================================

async function verificarAdministrador() {

    if (!window.sb) {

        throw new Error(

            "A conexão com o Supabase não foi carregada."

        );

    }


    const {

        data,

        error

    } = await window.sb.auth.getUser();


    if (error) {

        console.error(
            "Erro de autenticação:",
            error
        );

        throw new Error(

            "Não foi possível validar sua sessão. " +
            "Saia do painel e faça login novamente."

        );

    }


    if (!data.user) {

        throw new Error(

            "Você precisa estar conectado ao painel " +
            "para enviar fotografias."

        );

    }


    if (data.user.id !== ADMIN_UID) {

        throw new Error(

            "O usuário conectado não possui " +
            "permissão administrativa."

        );

    }


    return data.user;

}


// ==========================================
// 16. ENVIAR IMAGEM AO SUPABASE
// ==========================================

async function enviarFotografiaSupabase(arquivo) {

    validarArquivoFoto(arquivo);


    // Confirmar o usuário conectado.

    await verificarAdministrador();


    // Gerar um nome único para evitar
    // sobrescrever fotografias anteriores.

    const extensao = FOTO_FORMATOS[arquivo.type];

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

                contentType: arquivo.type,

                cacheControl: "3600",

                upsert: false

            }

        );


    // ======================================
    // TRATAR ERROS
    // ======================================

    if (error) {

        console.error(

            "Erro de upload do Supabase:",

            error

        );


        const mensagem = String(
            error.message || ""
        );


        // Erro nas regras de segurança.

        if (

            mensagem.includes(
                "row-level security"
            ) ||

            mensagem.includes(
                "new row violates"
            )

        ) {

            throw new Error(

                "O Supabase bloqueou o upload " +
                "pelas regras de segurança (RLS). " +
                "Confira a política de INSERT do bucket " +
                "'projetos', a pasta 'catalogo' " +
                "e a UID do administrador."

            );

        }


        // Bucket não encontrado.

        if (

            mensagem.includes(
                "Bucket not found"
            ) ||

            mensagem.includes(
                "bucket does not exist"
            )

        ) {

            throw new Error(

                "O bucket 'projetos' não foi encontrado. " +
                "Confira o nome do bucket no Supabase Storage."

            );

        }


        // Arquivo muito grande.

        if (

            error.statusCode === "413" ||

            mensagem.includes(
                "exceeded the maximum"
            )

        ) {

            throw new Error(

                "A fotografia excede o tamanho permitido."

            );

        }


        // Outros erros.

        throw new Error(

            "Não foi possível enviar a fotografia: " +
            mensagem

        );

    }


    // ======================================
    // OBTER URL PÚBLICA
    // ======================================

    const resultado = window.sb.storage

        .from(FOTO_BUCKET)

        .getPublicUrl(data.path);


    const enderecoPublico =
        resultado.data.publicUrl;


    if (!enderecoPublico) {

        throw new Error(

            "A fotografia foi enviada, mas não foi " +
            "possível obter seu endereço público."

        );

    }


    return enderecoPublico;

}


// ==========================================
// 17. SALVAR PRODUTO COM FOTOGRAFIA
// ==========================================

formularioFotos.addEventListener(

    "submit",

    async evento => {

        // Sem imagem nova:
        // mantém a imagem existente e
        // permite que o admin.js salve.

        if (!arquivoSelecionado) return;


        // Interrompe temporariamente
        // o salvamento original.

        evento.preventDefault();

        evento.stopImmediatePropagation();


        if (uploadEmAndamento) return;


        uploadEmAndamento = true;


        const botaoSalvar = formularioFotos.querySelector(

            'button[type="submit"]'

        );


        botaoSalvar.disabled = true;


        zonaUpload.classList.add(
            "enviando"
        );


        mostrarStatusFoto(

            "Verificando acesso e enviando fotografia..."

        );


        try {

            const enderecoFoto =
                await enviarFotografiaSupabase(
                    arquivoSelecionado
                );


            // Guardar URL da imagem hospedada.

            campoImagem.value = enderecoFoto;


            // Remover arquivo pendente.

            arquivoSelecionado = null;

            inputFoto.value = "";


            // Atualizar pré-visualização.

            mostrarPreviewFoto(enderecoFoto);


            mostrarStatusFoto(

                "Fotografia enviada! Salvando produto..."

            );

        } catch (erro) {

            console.error(erro);


            mostrarStatusFoto(

                erro.message,

                true

            );


            // Em caso de erro, mantém a
            // fotografia selecionada para
            // permitir uma nova tentativa.

            return;

        } finally {

            uploadEmAndamento = false;

            botaoSalvar.disabled = false;

            zonaUpload.classList.remove(
                "enviando"
            );

        }


        // Agora o admin.js pode salvar
        // o produto com a URL da imagem.

        formularioFotos.requestSubmit(
            botaoSalvar
        );

    },

    true

);


// ==========================================
// 18. ATUALIZAR IMAGEM EXISTENTE
// ==========================================

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
