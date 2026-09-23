
/*
==========================================
CRIAITOR 3D
CONEXÃO DA EMPRESA COM SUPABASE
==========================================
*/

"use strict";


// ==========================================
// ELEMENTOS
// ==========================================

const painelEmpresa = document.querySelector(".app");


// ==========================================
// TELA DE LOGIN
// ==========================================

const estiloLogin = document.createElement("style");

estiloLogin.textContent = `

.tela-login {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    background: #110e17;
    color: white;
    font-family: "DM Sans", sans-serif;
}

.tela-login[hidden] {
    display: none !important;
}

.form-login {
    width: min(420px, 100%);
    background: #211928;
    border: 1px solid #714188;
    border-radius: 18px;
    padding: 35px;
}

.form-login h2 {
    color: #ff8927;
}

.form-login input {
    width: 100%;
    padding: 14px;
    margin: 10px 0;
    background: #302438;
    color: white;
    border: 1px solid #6c5177;
    border-radius: 9px;
}

.form-login button {
    width: 100%;
    padding: 14px;
    margin-top: 10px;
    background: #ff8927;
    color: #211025;
    border: none;
    border-radius: 10px;
    font-weight: 900;
    cursor: pointer;
}

#mensagem-login {
    font-size: 13px;
    color: #ffb7b7;
}

`;

document.head.appendChild(estiloLogin);


const telaLogin = document.createElement("section");

telaLogin.className = "tela-login";

telaLogin.innerHTML = `

<form class="form-login" id="form-login">

    <h2>CriAItor 3D</h2>

    <p>Painel administrativo da empresa</p>

    <input
        type="email"
        id="email-login"
        placeholder="E-mail"
        autocomplete="username"
        required
    >

    <input
        type="password"
        id="senha-login"
        placeholder="Senha"
        autocomplete="current-password"
        required
    >

    <button type="submit">
        Entrar no painel
    </button>

    <p id="mensagem-login" role="alert"></p>

</form>

`;

document.body.prepend(telaLogin);


// ==========================================
// ESTADO DA CONEXÃO
// ==========================================

let versaoCatalogo = null;

let conectado = false;

let salvando = false;


// ==========================================
// MENSAGENS
// ==========================================

function mensagemLogin(texto) {

    document.getElementById(
        "mensagem-login"
    ).textContent = texto;

}


// ==========================================
// CARREGAR CATÁLOGO
// ==========================================

async function carregarCatalogoEmpresa() {

    const { data, error } = await window.sb

        .from("catalogo")

        .select("produtos, versao")

        .eq("id", 1)

        .single();


    if (error) throw error;


    if (!Array.isArray(data.produtos)) {

        throw new Error("Catálogo remoto inválido.");

    }


    versaoCatalogo = Number(data.versao);


    window.CRIAITOR_APP.aplicarProdutos(
        data.produtos
    );


    return data;

}


// ==========================================
// SALVAR NO SUPABASE
// ==========================================

async function salvarProdutosNuvem(novaLista) {

    if (!conectado) {

        alert("Faça login no painel da empresa.");

        return false;

    }


    if (salvando) {

        alert(
            "Aguarde a conclusão da atualização anterior."
        );

        return false;

    }


    salvando = true;


    try {

        const { data: usuario, error: erroUsuario } =
            await window.sb.auth.getUser();


        if (
            erroUsuario ||
            usuario.user?.id !== ADMIN_UID
        ) {

            throw new Error(
                "Sua sessão administrativa não está válida."
            );

        }


        // Atualiza somente a versão carregada.
        // Isso evita sobrescrever silenciosamente
        // alterações de outra sessão.

        const { data, error } = await window.sb

            .from("catalogo")

            .update({

                produtos: novaLista

            })

            .eq("id", 1)

            .eq("versao", versaoCatalogo)

            .select("versao")

            .maybeSingle();


        if (error) throw error;


        if (!data) {

            throw new Error(

                "O catálogo foi alterado em outra sessão. " +
                "Recarregue o painel e tente novamente."

            );

        }


        versaoCatalogo = Number(data.versao);


        return true;

    } catch (erro) {

        console.error(erro);


        alert(

            "Não foi possível atualizar a loja.\n\n" +
            erro.message

        );


        return false;

    } finally {

        salvando = false;

    }

}


// ==========================================
// CONEXÃO DISPONÍVEL PARA ADMIN.JS
// ==========================================

window.CRIAITOR_SYNC = {

    salvarProdutos: salvarProdutosNuvem,


    recarregar: carregarCatalogoEmpresa

};


// ==========================================
// VALIDAR LOGIN
// ==========================================

async function entrarNoPainel() {

    conectado = false;

    painelEmpresa.hidden = true;

    telaLogin.hidden = false;


    mensagemLogin("Verificando acesso...");


    try {

        const { data, error } =
            await window.sb.auth.getUser();


        const usuario = data?.user;


        if (!usuario) {

            mensagemLogin("");

            return;

        }


        if (error) throw error;


        if (usuario.id !== ADMIN_UID) {

            await window.sb.auth.signOut();


            mensagemLogin(

                "Este usuário não possui acesso administrativo."

            );


            return;

        }


        await carregarCatalogoEmpresa();


        conectado = true;


        telaLogin.hidden = true;

        painelEmpresa.hidden = false;


        mensagemLogin("");


        notificar(
            "Painel conectado à loja dos clientes!"
        );

    } catch (erro) {

        console.error(erro);


        mensagemLogin(

            "Não foi possível conectar ao Supabase. " +
            "Verifique a configuração e as permissões."

        );

    }

}


// ==========================================
// LOGIN COM E-MAIL E SENHA
// ==========================================

document.getElementById("form-login")
    .addEventListener("submit", async evento => {

        evento.preventDefault();


        const email = document.getElementById(
            "email-login"
        ).value.trim();


        const senha = document.getElementById(
            "senha-login"
        ).value;


        const botao = evento.currentTarget.querySelector(
            'button[type="submit"]'
        );


        botao.disabled = true;


        mensagemLogin("Entrando...");


        try {

            const { error } = await window.sb.auth

                .signInWithPassword({

                    email,

                    password: senha

                });


            if (error) throw error;


            await entrarNoPainel();

        } catch (erro) {

            console.error(erro);


            mensagemLogin(

                "Não foi possível entrar. " +
                "Verifique seu e-mail e sua senha."

            );

        } finally {

            botao.disabled = false;

        }

    });


// ==========================================
// BOTÃO SAIR
// ==========================================

const botaoSair = document.createElement("button");

botaoSair.textContent = "Sair";

botaoSair.className = "botao botao-secundario";

botaoSair.type = "button";


botaoSair.addEventListener("click", async () => {

    const { error } = await window.sb.auth.signOut();


    if (error) {

        alert("Não foi possível encerrar a sessão.");

        return;

    }


    conectado = false;


    painelEmpresa.hidden = true;

    telaLogin.hidden = false;


    window.CRIAITOR_APP.aplicarProdutos([]);


    mensagemLogin("");

});


document.querySelector(".topbar").appendChild(
    botaoSair
);


// ==========================================
// IMPORTAR PRODUTOS INICIAIS
// ==========================================

const botaoImportar = document.createElement("button");

botaoImportar.textContent =
    "Importar produtos do catálogo inicial";

botaoImportar.className =
    "botao botao-secundario";

botaoImportar.type = "button";


botaoImportar.addEventListener("click", async () => {

    const iniciais =
        window.CRIAITOR_CATALOGO?.produtos;


    if (!Array.isArray(iniciais) || !iniciais.length) {

        alert("Nenhum produto inicial encontrado.");

        return;

    }


    if (window.CRIAITOR_APP.obterProdutos().length > 0) {

        alert(

            "O catálogo já possui produtos. " +
            "A importação inicial está disponível " +
            "somente para catálogos vazios."

        );

        return;

    }


    if (!confirm(
        "Importar os produtos iniciais para o Supabase?"
    )) return;


    const salvo = await salvarProdutosNuvem(iniciais);


    if (!salvo) return;


    window.CRIAITOR_APP.aplicarProdutos(iniciais);


    notificar("Produtos iniciais publicados!");

});


document.querySelector("#publicar .painel")
    .appendChild(botaoImportar);


// ==========================================
// RECARREGAR CATÁLOGO
// ==========================================

const botaoRecarregar = document.createElement("button");

botaoRecarregar.textContent =
    "Recarregar catálogo da nuvem";

botaoRecarregar.className =
    "botao botao-secundario";

botaoRecarregar.type = "button";


botaoRecarregar.addEventListener("click", async () => {

    if (salvando) return;


    try {

        await carregarCatalogoEmpresa();


        notificar("Catálogo atualizado!");

    } catch (erro) {

        console.error(erro);

        alert("Não foi possível carregar o catálogo.");

    }

});


document.querySelector("#publicar .painel")
    .appendChild(botaoRecarregar);


// ==========================================
// INICIAR
// ==========================================

entrarNoPainel();
