
// --- TEMA DO SISTEMA ---
function aplicarTemaSistema() {
    const tema = localStorage.getItem('rota_sirius_theme') || 'dark';
    document.body.classList.toggle('light-theme', tema === 'light');
    document.documentElement.dataset.theme = tema;
    document.querySelectorAll('.theme-toggle-label').forEach(el => {
        el.textContent = tema === 'light' ? 'Modo escuro' : 'Modo claro';
    });
    document.querySelectorAll('.theme-toggle-item').forEach(el => {
        el.setAttribute('aria-pressed', tema === 'light' ? 'true' : 'false');
    });
    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
        el.innerHTML = tema === 'light'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
    });
}

window.handleToggleTheme = function(event) {
    if (event) event.stopPropagation();
    const atual = localStorage.getItem('rota_sirius_theme') || 'dark';
    localStorage.setItem('rota_sirius_theme', atual === 'light' ? 'dark' : 'light');
    aplicarTemaSistema();
};
aplicarTemaSistema();

// --- SISTEMA DE LOGIN ---
const loginScreen = document.getElementById('login-screen');
const mainApp = document.querySelector('.app');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPass = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

async function carregarPermissoesUsuarioLogado() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuarioLogado?.id || !usuarioLogado.email || !usuarioLogado.senha) return usuarioLogado;
    try {
        const { data, error } = await supabaseClient.rpc("obter_minhas_permissoes", {
            p_email: usuarioLogado.email,
            p_senha: usuarioLogado.senha
        });
        if (error) throw error;
        const registro = Array.isArray(data) ? data[0] : data;
        if (registro) {
            // O perfil-base oficial vem de usuarios.permissao. A RPC fornece
            // apenas as personalizações persistidas e não deve sobrescrever
            // o perfil atual com um perfil antigo gravado no JSON.
            usuarioLogado.__permissoesPersonalizadas = registro.permissoes || {};
            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
        }
    } catch (err) {
        console.warn("Permissões personalizadas não carregadas:", err);
    }
    return usuarioLogado;
}

function checkAuth() {
    initAdmin(); // Garante que o administrador padrão exista no sistema
    const isLogged = localStorage.getItem('rota_sirius_logged') === 'true';
    if (isLogged) {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        // --- START Task 4: Synchronize on System Load ---
        (async () => {
            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            if (usuarioLogado?.id) {
                console.log("checkAuth: Sincronizando usuário logado com Supabase...");
                const { data, error } = await supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("id", usuarioLogado.id)
                    .single();

                if (data && !error) {
                    console.log("checkAuth: Usuário logado atualizado do Supabase:", data);
                    localStorage.setItem("usuarioLogado", JSON.stringify(data));
                } else if (error) {
                    console.error("checkAuth: Erro ao buscar usuário logado do Supabase:", error);
                }
            }
            await carregarPermissoesUsuarioLogado();
            aplicarPermissoesNaInterface();
            inicializarMenuGlobal();
            carregarTudo();
            exibirUsuarioLogado();
        })();
        // --- END Task 4 ---
    } else {
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}


// =========================================================
// MENU GLOBAL DE NAVEGAÇÃO
// =========================================================
function inicializarMenuGlobal() {
    const menu = document.getElementById('global-menu');
    const overlay = document.getElementById('global-menu-overlay');
    const closeBtn = document.getElementById('global-menu-close');
    if (!menu || !overlay) return;

    // Um único botão de menu em todas as páginas/telas.
    document.querySelectorAll('.topbar-actions').forEach(actions => {
        if (actions.querySelector('.global-menu-trigger')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'global-menu-trigger';
        button.title = 'Abrir menu';
        button.setAttribute('aria-label', 'Abrir menu');
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>';
        button.addEventListener('click', abrirMenuGlobal);
        const profileGroup = actions.querySelector('.user-display')?.closest('.topbar-group');
        if (profileGroup) actions.insertBefore(button, profileGroup);
        else actions.appendChild(button);
    });

    if (!menu.dataset.initialized) {
        closeBtn?.addEventListener('click', fecharMenuGlobal);
        overlay.addEventListener('click', fecharMenuGlobal);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') fecharMenuGlobal();
        });

        document.querySelectorAll('.global-menu-item').forEach(item => {
            item.addEventListener('click', event => {
                if (item.dataset.menuAction === 'toggle-theme') {
                    event.stopPropagation();
                    handleToggleTheme(event);
                    return;
                }
                navegarPeloMenuGlobal(item.dataset.menuAction);
            });
        });
        menu.dataset.initialized = 'true';
    }

    atualizarMenuGlobalPermissoes();
}

function abrirMenuGlobal() {
    const menu = document.getElementById('global-menu');
    const overlay = document.getElementById('global-menu-overlay');
    if (!menu || !overlay) return;
    atualizarMenuGlobalPermissoes();
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    overlay.classList.remove('hidden');
    document.body.classList.add('global-menu-open');
}

function fecharMenuGlobal() {
    const menu = document.getElementById('global-menu');
    const overlay = document.getElementById('global-menu-overlay');
    if (!menu || !overlay) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    overlay.classList.add('hidden');
    document.body.classList.remove('global-menu-open');
}

function atualizarMenuGlobalPermissoes() {
    document.querySelectorAll('.global-menu-item[data-menu-permission]').forEach(item => {
        const tela = item.dataset.menuPermission;
        let permitido = true;
        try {
            permitido = !!usuarioPodeVisualizar(tela);
        } catch (_) {
            permitido = true;
        }
        item.classList.toggle('hidden', !permitido);
    });
}

function navegarPeloMenuGlobal(acao) {
    fecharMenuGlobal();

    const clicar = id => {
        const el = document.getElementById(id);
        if (el && !el.disabled) {
            el.click();
            return true;
        }
        return false;
    };

    if (acao === 'dashboard') {
        [dashboardView, controlPanelView, gerencialView, gerenciarUsuariosView, programacaoView, newHistoryView, simulateRouteView, permissoesView, limitesRetiradaView]
            .forEach(view => view?.classList.add('hidden'));
        dashboardView?.classList.remove('hidden');
        document.querySelector('.app')?.classList.remove('panel-active');
        carregarRotas();
        return;
    }
    if (acao === 'programacao') return clicar('open-programacao-btn');
    if (acao === 'historico') return clicar('open-history-btn');
    if (acao === 'painel') return clicar('open-control-panel-btn');
    if (acao === 'gerencial') return clicar('open-gerencial-btn');
    if (acao === 'simular') return clicar('open-simulate-route-btn');
}

function exibirUsuarioLogado() {
    const dashElem = document.getElementById('user-display-dashboard');
    const panelElem = document.getElementById('user-display-panel');
    const programacaoElem = document.getElementById('user-display-programacao');
    const newHistoryElem = document.getElementById('user-display-new-history');
    const simulateElem = document.getElementById('user-display-simulate');
    const gerencialElem = document.getElementById('user-display-gerencial');
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuarioLogado) {
        [dashElem, panelElem, programacaoElem, newHistoryElem, gerencialElem].forEach(el => { if (el) el.innerHTML = ""; });
        return;
    }

    const permissoes = obterPermissoesVisuaisUsuario(usuarioLogado);
    const isViewer = !Object.values(permissoes).some(p => p && p.gerenciamento);
    document.body.classList.toggle('is-viewer', isViewer);

    // Controle de visibilidade do Painel de Controle por permissão
    const podeGerenciarPainel = usuarioPodeVisualizar('Painel de Controle');
    const btnControlDash = document.getElementById('open-control-panel-btn');
    const btnControlProg = document.getElementById('open-control-panel-from-prog-btn');
    const btnControlHistory = document.getElementById('open-control-panel-from-new-history-btn');

    if (btnControlDash) {
        podeGerenciarPainel ? btnControlDash.classList.remove('hidden') : btnControlDash.classList.add('hidden');
    }
    if (btnControlProg) {
        podeGerenciarPainel ? btnControlProg.classList.remove('hidden') : btnControlProg.classList.add('hidden');
    }
    if (btnControlHistory) {
        podeGerenciarPainel ? btnControlHistory.classList.remove('hidden') : btnControlHistory.classList.add('hidden');
    }

    const primeiroNome = usuarioLogado.nome.split(" ")[0];
    const html = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>${primeiroNome}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5; margin-left: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        <div class="user-dropdown hidden">
            <div class="dropdown-header" style="display: flex; flex-direction: column; gap: 2px;">
                <span>${usuarioLogado.nome} ${usuarioLogado.sobrenome}</span>
                <span style="font-size: 10px; text-transform: none; color: var(--primary); font-weight: 500; opacity: 0.9;">${usuarioLogado.cargo || 'Colaborador'}</span>
            </div>
            <button onclick="handleOpenChangePasswordModal(event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Alterar Senha
            </button>
            <button onclick="handleLogout(event)" class="logout-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sair
            </button>
        </div>
    `;

    [dashElem, panelElem, programacaoElem, newHistoryElem, simulateElem, gerencialElem].forEach(el => {
        if (el) {
            el.innerHTML = html;
            el.onclick = toggleUserMenu;
        }
    });
}

window.toggleUserMenu = function(event) {
    event.stopPropagation();
    const dropdown = event.currentTarget.querySelector('.user-dropdown');
    // Fecha outros dropdowns se existirem
    document.querySelectorAll('.user-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
};

window.toggleMapsMenu = function(event) {
    if (event) event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.nextElementSibling;
    
    // Fecha outros dropdowns abertos
    document.querySelectorAll('.maps-dropdown, .user-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
    });
    
    dropdown.classList.toggle('hidden');
};

// Função auxiliar para montar a URL do Google Maps com paradas (waypoints)
function montarUrlGoogleMaps(nfs) {
    if (!nfs || nfs.length === 0) return null;

    const destinos = nfs.map(nf => {
        const parts = [];

        // 1. Endereço e Número
        let streetPart = String(nf.endereco || '').trim().replace(/ - /g, ", ");
        let numberPart = String(nf.numero_endereco || '').trim();

        if (streetPart && numberPart) {
            parts.push(`${streetPart}, ${numberPart}`);
        } else if (streetPart) {
            parts.push(streetPart);
        } else if (numberPart) {
            parts.push(numberPart);
        }

        // 2. Cidade, UF e CEP
        if (nf.cidade && String(nf.cidade).trim() !== "") parts.push(String(nf.cidade).trim());
        if (nf.uf && String(nf.uf).trim() !== "" && String(nf.uf).toUpperCase() !== 'RT') parts.push(String(nf.uf).trim());
        
        if (nf.cep && String(nf.cep).trim() !== "") {
            let formattedCep = String(nf.cep).replace(/\D/g, '');
            if (formattedCep.length === 8) formattedCep = formattedCep.replace(/^(\d{5})(\d)/, '$1-$2');
            parts.push(formattedCep);
        }
        
        return parts
            .filter(p => p !== "")
            .join(", ")
            .replace(/,\s*,/g, ',')
            .replace(/\s+/g, ' ')
            .trim();
    }).filter(addr => addr.trim() !== "");

    if (destinos.length === 0) return null;

    const destination = destinos[destinos.length - 1];
    const waypoints = destinos.slice(0, destinos.length - 1);
    
    let rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    if (waypoints.length > 0) {
        rotaUrl += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }
    return rotaUrl;
}

window.handleAbrirNoMaps = async function(rotaId) {
    if (!rotaId) return;
    
    try {
        // Tarefa 1: Pegar as NFs da rota na ordem atual (pela criação)
        const { data: nfs, error } = await supabaseClient
            .from("nfs")
            .select("*")
            .eq("rota_id", rotaId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!nfs || nfs.length === 0) {
            mostrarAviso("Esta rota não possui Notas Fiscais vinculadas.");
            return;
        }

        const rotaUrl = montarUrlGoogleMaps(nfs);
        if (!rotaUrl) {
            mostrarAviso("Dados insuficientes para abrir a rota no Maps.");
            return;
        }

        window.open(rotaUrl, "_blank");
        document.querySelectorAll('.maps-dropdown').forEach(d => d.classList.add('hidden'));
    } catch (err) {
        console.error("Erro ao gerar link do Maps:", err);
        mostrarAviso("Erro ao processar a rota para o Google Maps.");
    }
};

window.handleCopiarLinkMaps = async function(rotaId) {
    if (!rotaId) return;
    
    try {
        const { data: nfs, error } = await supabaseClient
            .from("nfs")
            .select("*")
            .eq("rota_id", rotaId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!nfs || nfs.length === 0) {
            mostrarAviso("Esta rota não possui Notas Fiscais vinculadas.");
            return;
        }

        const rotaUrl = montarUrlGoogleMaps(nfs);
        if (!rotaUrl) {
            mostrarAviso("Dados insuficientes para copiar o link da rota.");
            return;
        }

        await navigator.clipboard.writeText(rotaUrl);
        mostrarAviso("Link da rota copiado!");
        document.querySelectorAll('.maps-dropdown').forEach(d => d.classList.add('hidden'));
    } catch (err) {
        console.error("Erro ao copiar link do Maps:", err);
        mostrarAviso("Erro ao copiar o link da rota.");
    }
};

window.handleOpenChangePasswordModal = function(event) {
    if (event) event.stopPropagation();
    // Fecha o menu suspenso
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));
    // Abre o modal
    openModal(document.getElementById('change-password-modal'));
};

window.handleLogout = function(event) {
    if (event) event.stopPropagation();
    localStorage.removeItem('rota_sirius_logged');
    localStorage.removeItem('usuarioLogado');
    document.body.classList.remove('is-viewer');
    document.querySelector('.app').classList.remove('panel-active');
    checkAuth();
};

const changePasswordForm = document.getElementById('change-password-form');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        const loggedUser = JSON.parse(localStorage.getItem("usuarioLogado"));

        if (currentPass !== loggedUser.senha) {
            mostrarAviso("A senha atual está incorreta.");
            return;
        }

        if (newPass !== confirmPass) {
            mostrarAviso("A nova senha e a confirmação não coincidem.");
            return;
        }

        // Atualiza no localStorage (lista geral e sessão atual)
        let users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
        const index = users.findIndex(u => u.id == loggedUser.id);
        if (index !== -1) {
            users[index].senha = newPass;
            localStorage.setItem('sirios_usuarios', JSON.stringify(users));
        }
        loggedUser.senha = newPass;
        localStorage.setItem('usuarioLogado', JSON.stringify(loggedUser));

        // Atualiza no Supabase
        try {
            await supabaseClient.from("usuarios").update({ senha: newPass }).eq("id", loggedUser.id);
            mostrarAviso("Senha alterada com sucesso!");
        } catch (err) {
            console.error("Erro ao sincronizar com Supabase:", err);
            mostrarAviso("Senha alterada localmente, mas houve um erro na sincronização.");
        }

        closeModal(document.getElementById('change-password-modal'));
        changePasswordForm.reset();
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginEmail.value.trim();
        const pass = loginPass.value.trim();

        try {
            let usuarioLogado = null;
            const usersLocais = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');

            // O banco é a fonte principal do usuário. O cache local não deve decidir
            // qual ID será usado, pois pode conter dados antigos de versões anteriores.
            if (window.supabaseClient) {
                const { data, error } = await supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("email", email)
                    .eq("senha", pass)
                    .single();

                if (error) {
                    console.error("Erro detalhado do Supabase:", error.message, error.details, error.hint);
                }

                if (!error && data) {
                    usuarioLogado = data;

                    // Atualiza/substitui o cadastro local pelo registro oficial do banco.
                    // Isso garante que o ID usado pelo sistema seja o UUID de usuarios.id.
                    const indiceLocal = usersLocais.findIndex(u => u.email === data.email);
                    if (indiceLocal >= 0) {
                        usersLocais[indiceLocal] = data;
                    } else {
                        usersLocais.push(data);
                    }
                    localStorage.setItem('sirios_usuarios', JSON.stringify(usersLocais));
                }
            }

            // Fallback somente se o Supabase não estiver disponível.
            // Não é usado quando o banco respondeu, evitando IDs antigos do cache.
            if (!usuarioLogado && !window.supabaseClient) {
                usuarioLogado = usersLocais.find(u => u.email === email && u.senha === pass);
            }

            if (!usuarioLogado) {
                loginError.innerText = "E-mail ou senha inválidos";
                loginError.classList.remove('hidden');
                return;
            }

            // login OK
            localStorage.setItem('rota_sirius_logged', 'true');
            localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));

            loginError.classList.add('hidden');

            checkAuth(); // mantém seu fluxo atual

        } catch (err) {
            console.error("Erro no login:", err);
            loginError.innerText = "Erro ao conectar com servidor";
            loginError.classList.remove('hidden');
        }
    });
}

// Referências aos elementos do DOM para os modais
const createNfModal = document.getElementById('create-nf-modal');
const createRotaModal = document.getElementById('create-rota-modal');
const genericModal = document.getElementById('generic-modal');
const historyModal = document.getElementById('history-modal');
const routeDetailsModal = document.getElementById('route-details-modal');

const openNfModalBtn = document.getElementById('open-nf-modal-btn');
const openRotaModalBtn = document.getElementById('open-rota-modal-btn');
const openHistoryBtn = document.getElementById('open-history-btn');

const createNfForm = document.getElementById('create-nf-form');
const createRotaForm = document.getElementById('create-rota-form');

const nfNumeroInput = document.getElementById('nf-numero');
const btnLerDocs = document.getElementById('btn-ler-docs');
const nfIdHidden = document.getElementById('nf-id-hidden');
const nfModalTitle = document.getElementById('nf-modal-title');
const nfCepInput = document.getElementById('nf-cep');
const nfCidadeInput = document.getElementById('nf-cidade');
const nfEnderecoInput = document.getElementById('nf-endereco');
const nfEnderecoNumeroInput = document.getElementById('nf-endereco-numero');
const nfUfInput = document.getElementById('nf-uf');
const nfTipoInput = document.getElementById('nf-tipo');
const nfObsInput = document.getElementById('nf-obs');
const nfValorInput = document.getElementById('nf-valor');
const nfQuantidadeInput = document.getElementById('nf-quantidade');
const nfMarcaInput = document.getElementById('nf-marca');
const nfPotenciaInput = document.getElementById('nf-potencia');
const nfKamInput = document.getElementById('nf-kam');

const btnTransporte = document.getElementById('btn-transporte');
const btnRetira = document.getElementById('btn-retira');
const rotaNomeInput = document.getElementById('rota-nome');
const rotaDataInput = document.getElementById('rota-data');
const rotaTransportadoraInput = document.getElementById('rota-transportadora');
const rotaModalTitle = document.getElementById('rota-modal-title');
const rotaIdHidden = document.getElementById('rota-id-hidden');

const viewGridBtn = document.getElementById('view-grid-btn');
const viewListBtn = document.getElementById('view-list-btn');

const createKamModal = document.getElementById('create-kam-modal');
const createKamForm = document.getElementById('create-kam-form');
const kamNomeInput = document.getElementById('kam-nome');
const kamIdHidden = document.getElementById('kam-id-hidden');
const kamModalTitle = document.getElementById('kam-modal-title');
const addKamBtn = document.getElementById('add-kam-btn');

const genericModalOk = document.getElementById('generic-modal-ok');
const genericModalCancel = document.getElementById('generic-modal-cancel');
const genericModalTitle = document.getElementById('generic-modal-title');
const genericModalMessage = document.getElementById('generic-modal-message');
const limiteExcecaoModal = document.getElementById('limite-excecao-modal');
const limiteExcecaoForm = document.getElementById('limite-excecao-form');
const limiteExcecaoId = document.getElementById('limite-excecao-id');
const limiteExcecaoData = document.getElementById('limite-excecao-data');
const limiteExcecaoValor = document.getElementById('limite-excecao-valor');
const limiteExcecaoModalTitle = document.getElementById('limite-excecao-modal-title');
const limitePadraoInput = document.getElementById('limite-padrao-input');
const salvarLimitePadraoBtn = document.getElementById('salvar-limite-padrao-btn');
const limitePadraoMinus = document.getElementById('limite-padrao-minus');
const limitePadraoPlus = document.getElementById('limite-padrao-plus');
const adicionarExcecaoLimiteBtn = document.getElementById('adicionar-excecao-limite-btn');

const searchInput = document.querySelector('.search');
let filtroAtual = "todos";
let rotaSelecionada = null;
let rotaIdParaDeletar = null;

// Funções para abrir e fechar modais
function openModal(modalElement) {
  // FIX 2: Verificação de nulo ANTES do uso (bug original: verificava DEPOIS, causando crash)
  if (!modalElement) {
    console.error('openModal: Elemento modal é nulo.');
    return;
  }
  modalElement.classList.add('active');
}

// FUNÇÕES DE MODAL REUTILIZÁVEIS (Substitutos de alert/confirm)
window.mostrarAviso = function(mensagem) {
  // Mantém o aviso acima de outros modais abertos (ex.: resultado do Leitor DOC).
  if (genericModal) genericModal.style.zIndex = "10000";
  if (genericModalTitle) genericModalTitle.innerText = "Aviso";
  if (genericModalMessage) genericModalMessage.innerText = mensagem;
  if (genericModalCancel) genericModalCancel.style.display = "none";
  if (genericModalOk) {
    genericModalOk.innerText = "OK";
    genericModalOk.onclick = () => closeModal(genericModal);
  }
  openModal(genericModal);
};

window.confirmarAcao = function(mensagem, callback) {
  if (genericModalTitle) genericModalTitle.innerText = "Confirmação";
  if (genericModalMessage) genericModalMessage.innerText = mensagem;
  if (genericModalCancel) genericModalCancel.style.display = "block";
  if (genericModalOk) {
    genericModalOk.innerText = "Confirmar";
    genericModalOk.onclick = async () => {
      await callback();
      closeModal(genericModal);
    };
  }
  openModal(genericModal);
};

function closeModal(modalElement) {
  // FIX 2b: Verificação de nulo antes do uso
  if (!modalElement) {
    console.error('closeModal: Elemento modal é nulo.');
    return;
  }
  modalElement.classList.remove('active');

  // A fila temporária do Leitor DOC não é limpa ao fechar a Nova NF.
  // Ela permanece disponível durante a sessão e só é alterada pelo fluxo do Leitor DOC.
}

// --- NAVEGAÇÃO PAINEL DE CONTROLE ---
const dashboardView = document.getElementById('dashboard-view');
const controlPanelView = document.getElementById('control-panel-view');
const gerencialView = document.getElementById('gerencial-view');
const gerenciarUsuariosView = document.getElementById('gerenciar-usuarios-view');
const programacaoView = document.getElementById('programacao-view'); // Nova referência
const newHistoryView = document.getElementById('new-history-view');
const simulateRouteView = document.getElementById('simulate-route-view');

// Estado da tela Simular Rota
// Declarado explicitamente para evitar ReferenceError ao abrir a tela.
let simulateMap = null;
let simulateMarkersLayer = null;
let simulateRouteLayer = null;
let simulateMarkersData = {};
let simulateStopCounter = 1;


// Navegação exclusiva das telas gerenciais.
// As telas gerenciais ficam mutuamente exclusivas e as demais telas
// continuam usando apenas a navegação normal por .hidden.
function obterGerencialSubViews() {
    return [gerencialView, gerenciarUsuariosView, permissoesView, limitesRetiradaView];
}

function mostrarSomenteView(viewAlvo) {
    const todasViews = [
        dashboardView,
        controlPanelView,
        gerencialView,
        gerenciarUsuariosView,
        programacaoView,
        newHistoryView,
        simulateRouteView,
        permissoesView,
        limitesRetiradaView
    ];

    // Primeiro oculta todas as telas normalmente.
    todasViews.forEach(view => {
        if (view) view.classList.add('hidden');
    });

    // Nas telas gerenciais também forçamos display:none para impedir
    // qualquer regra de layout/CSS de fazê-las aparecer empilhadas.
    obterGerencialSubViews().forEach(view => {
        if (!view) return;
        view.classList.add('hidden');
        view.style.display = 'none';
    });

    if (viewAlvo) {
        viewAlvo.classList.remove('hidden');
        viewAlvo.style.removeProperty('display');
    }
}

// --- SIMULAÇÃO DE ROTA (MAPA, CEP, GEOCODIFICAÇÃO) ---
function initSimulateMap() {
    if (!simulateMap) {
        // Inicializa o mapa com opções de animação otimizadas
        simulateMap = L.map('map-simulate', {
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        }).setView([-15.7801, -47.9292], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(simulateMap);

        // Inicializa o grupo de camadas para os marcadores
        simulateMarkersLayer = L.layerGroup().addTo(simulateMap);
        simulateRouteLayer = L.layerGroup().addTo(simulateMap);
    }

    // O delay de 300ms é vital para que o Leaflet espere o fim das transições de CSS do layout
    setTimeout(() => {
        simulateMap.invalidateSize({ animate: true });
    }, 300);
}

// --- FUNÇÕES PARA CRIAR ÍCONES PERSONALIZADOS DO LEAFLET ---

// Ícone para a Origem (CD)
function createOriginIcon() {
    return L.divIcon({
        className: 'custom-pin custom-origin-pin',
        html: '<span>CD</span>',
        iconSize: [32, 32],
        iconAnchor: [16, 38], // Aponta exatamente para a extremidade inferior do pino
        popupAnchor: [0, -35]
    });
}

// Ícone para as Paradas Numeradas
function createNumberedStopIcon(number) {
    return L.divIcon({
        className: 'custom-pin custom-stop-pin',
        html: `<span>${number}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 38], // Aponta exatamente para a extremidade inferior do pino
        popupAnchor: [0, -35]
    });
}

async function buscarLocalizacaoPorCep(cep) {
    const cleanCep = String(cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`);
        const data = await response.json();
        if (data.erro) return null;

        // O Open-Meteo possui geocodificação pública com CORS e sem chave.
        // Usamos cidade + UF para evitar depender do Nominatim no cliente.
        const query = [data.localidade, data.uf].filter(Boolean).join(', ');
        const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json&countryCode=BR`
        );
        if (!geoRes.ok) throw new Error(`Open-Meteo HTTP ${geoRes.status}`);
        const geoData = await geoRes.json();
        const resultado = (geoData.results || []).find(r =>
            String(r.country_code || '').toUpperCase() === 'BR' &&
            (!data.uf || String(r.admin1 || '').toUpperCase().includes(String(data.uf).toUpperCase()))
        ) || (geoData.results || [])[0];

        if (resultado) {
            return {
                lat: Number(resultado.latitude),
                lng: Number(resultado.longitude),
                label: `${data.logradouro || 'CEP ' + cleanCep}, ${data.localidade}/${data.uf}`
            };
        }
    } catch (err) {
        console.error('Erro ao converter CEP em localização:', err);
    }
    return null;
}

const simulacaoGeocodeCache = new Map();
const SIMULACAO_CD = { lat: -8.242185, lng: -34.996948, label: 'Centro de distribuição Grupo Via1' };

function normalizarDestinoSimulacao(valor) {
    return String(valor || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function geocodificarDestinoSimulacao(destino, uf) {
    const cidade = normalizarDestinoSimulacao(destino)
        .replace(/\s*\/\s*[A-Za-z]{2}\s*$/i, '')
        .replace(/\s*-\s*[A-Za-z]{2}\s*$/i, '')
        .trim();
    const estado = normalizarDestinoSimulacao(uf).toUpperCase();
    if (!cidade || !estado || estado === 'RT') return null;

    const cacheKey = `${cidade.toUpperCase()}|${estado}`;
    if (simulacaoGeocodeCache.has(cacheKey)) return simulacaoGeocodeCache.get(cacheKey);

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(`${cidade}, ${estado}`)}&count=10&language=pt&format=json&countryCode=BR`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
        const data = await response.json();
        const resultados = Array.isArray(data.results) ? data.results : [];

        const resultado = resultados.find(r =>
            String(r.country_code || '').toUpperCase() === 'BR' &&
            String(r.admin1 || '').toUpperCase() === estado
        ) || resultados.find(r => String(r.country_code || '').toUpperCase() === 'BR');

        const loc = resultado ? {
            lat: Number(resultado.latitude),
            lng: Number(resultado.longitude),
            label: `${resultado.name || cidade}/${estado}`
        } : null;

        simulacaoGeocodeCache.set(cacheKey, loc);
        return loc;
    } catch (err) {
        console.error('Erro ao geocodificar destino da simulação:', cidade, estado, err);
        simulacaoGeocodeCache.set(cacheKey, null);
        return null;
    }
}

async function geocodificarNF(nf) {
    if (String(nf?.uf || '').toUpperCase() === 'RT' || String(nf?.destino || '').toUpperCase() === 'RETIRA') {
        return null;
    }

    // Se existir CEP, ele é a referência mais precisa disponível no cadastro.
    if (nf?.cep && String(nf.cep).replace(/\D/g, '').length === 8) {
        const cepKey = `CEP:${String(nf.cep).replace(/\D/g, '')}`;
        if (simulacaoGeocodeCache.has(cepKey)) return simulacaoGeocodeCache.get(cepKey);
        const loc = await buscarLocalizacaoPorCep(nf.cep);
        simulacaoGeocodeCache.set(cepKey, loc);
        if (loc) return loc;
    }

    return geocodificarDestinoSimulacao(nf?.destino || nf?.cidade, nf?.uf);
}

async function obterOrdemOtimizadaRoteirizada(pontos) {
    if (!Array.isArray(pontos) || pontos.length < 3) return pontos;

    const optDistancia = document.getElementById('simulate-opt-distance')?.checked;
    const optTempo = document.getElementById('simulate-opt-time')?.checked;
    const retornarOrigem = document.getElementById('simulate-opt-return')?.checked;
    const ultimaFixa = document.getElementById('simulate-opt-last-fixed')?.checked;

    // Se nenhuma opção estiver marcada, mantém a ordem cadastrada.
    if (!optDistancia && !optTempo) return pontos;

    const coordenadas = pontos.map(p => `${p.lng},${p.lat}`).join(';');
    const quantidade = pontos.length;
    const destinationParam = ultimaFixa && quantidade > 2 ? '&destination=last' : '';

    try {
        // Para distância usamos a matriz de distâncias e um algoritmo de vizinho mais próximo,
        // refinado por 2-opt. Para tempo usamos o Trip Service do OSRM.
        if (optDistancia && !optTempo) {
            const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordenadas}?annotations=distance,duration`;
            const response = await fetch(tableUrl);
            if (!response.ok) throw new Error(`OSRM Table HTTP ${response.status}`);
            const data = await response.json();
            if (data.code && data.code !== 'Ok') throw new Error(`OSRM Table: ${data.code}`);

            const distances = data.distances;
            if (!Array.isArray(distances)) throw new Error('OSRM não retornou a matriz de distâncias.');

            const ultimoIndex = quantidade - 1;
            const destinoFixo = ultimaFixa ? ultimoIndex : null;
            const naoVisitados = new Set();
            for (let i = 1; i < quantidade; i++) {
                if (i !== destinoFixo) naoVisitados.add(i);
            }

            const ordem = [0];
            let atual = 0;
            while (naoVisitados.size) {
                let proximo = null;
                let menor = Infinity;
                naoVisitados.forEach(i => {
                    const d = Number(distances[atual]?.[i]);
                    if (Number.isFinite(d) && d < menor) {
                        menor = d;
                        proximo = i;
                    }
                });
                if (proximo === null) break;
                ordem.push(proximo);
                naoVisitados.delete(proximo);
                atual = proximo;
            }

            if (destinoFixo !== null) ordem.push(destinoFixo);

            // 2-opt: melhora cruzamentos e reduz a distância total sem alterar origem/destino fixos.
            const inicio = 1;
            const fim = destinoFixo !== null ? ordem.length - 2 : ordem.length - 1;
            let melhorou = true;
            let tentativas = 0;
            const custo = (a, b) => Number(distances[a]?.[b]);
            while (melhorou && tentativas < 50) {
                melhorou = false;
                tentativas++;
                for (let i = inicio; i < fim - 1; i++) {
                    for (let k = i + 1; k <= fim - 1; k++) {
                        const a = ordem[i - 1], b = ordem[i];
                        const c = ordem[k], d = ordem[k + 1];
                        const atualCusto = custo(a, b) + custo(c, d);
                        const novoCusto = custo(a, c) + custo(b, d);
                        if (Number.isFinite(novoCusto) && novoCusto + 0.5 < atualCusto) {
                            const trecho = ordem.slice(i, k + 1).reverse();
                            ordem.splice(i, trecho.length, ...trecho);
                            melhorou = true;
                        }
                    }
                }
            }

            return ordem.map(i => pontos[i]);
        }

        // Menor tempo (ou quando as duas opções estão marcadas): OSRM otimiza a sequência.
        const params = new URLSearchParams({
            overview: 'full',
            geometries: 'geojson',
            source: 'first',
            roundtrip: retornarOrigem ? 'true' : 'false'
        });
        if (!retornarOrigem && destinationParam) params.set('destination', 'last');

        const tripUrl = `https://router.project-osrm.org/trip/v1/driving/${coordenadas}?${params.toString()}`;
        const response = await fetch(tripUrl);
        if (!response.ok) throw new Error(`OSRM Trip HTTP ${response.status}`);
        const data = await response.json();
        if (data.code && data.code !== 'Ok') throw new Error(`OSRM Trip: ${data.code}${data.message ? ' - ' + data.message : ''}`);

        const waypointInfo = Array.isArray(data.waypoints) ? data.waypoints : [];
        const ordenada = waypointInfo
            .map((wp, inputIndex) => ({ inputIndex, ordem: Number(wp.waypoint_index) }))
            .filter(item => Number.isFinite(item.ordem))
            .sort((a, b) => a.ordem - b.ordem)
            .map(item => pontos[item.inputIndex]);

        return ordenada.length === pontos.length ? ordenada : pontos;
    } catch (err) {
        console.error('Não foi possível otimizar a sequência da rota:', err);
        mostrarAviso('Não foi possível otimizar a rota automaticamente. A sequência original será mantida.');
        return pontos;
    }
}

window.atualizarMapaRoteirizado = async function(nfs) {
    if (!simulateMap || !simulateMarkersLayer || !simulateRouteLayer) return;

    const statsContainer = document.getElementById('simulate-stats-container');
    const distElem = document.getElementById('simulate-total-distance');
    const durElem = document.getElementById('simulate-total-duration');

    simulateMarkersLayer.clearLayers();
    simulateRouteLayer.clearLayers();
    if (statsContainer) statsContainer.classList.add('hidden');

    const pontos = [{
        lat: SIMULACAO_CD.lat,
        lng: SIMULACAO_CD.lng,
        label: SIMULACAO_CD.label,
        tipo: 'origem',
        nf: null
    }];

    let pontosIgnorados = 0;
    for (const nf of (nfs || [])) {
        const loc = await geocodificarNF(nf);
        if (loc) {
            pontos.push({
                lat: loc.lat,
                lng: loc.lng,
                label: loc.label,
                tipo: 'nf',
                nf
            });
        } else {
            pontosIgnorados++;
        }
    }

    if (pontos.length < 2) {
        L.marker([SIMULACAO_CD.lat, SIMULACAO_CD.lng], { icon: createOriginIcon() })
            .addTo(simulateMarkersLayer)
            .bindPopup(`<b>Origem Fixa:</b><br>${SIMULACAO_CD.label}`);
        mostrarAviso('Não foi possível localizar os destinos das NFs desta rota para montar a simulação.');
        window.currentSimulatedPoints = pontos.map(p => ({ lat: p.lat, lng: p.lng }));
        return;
    }

    const pontosOrdenados = await obterOrdemOtimizadaRoteirizada(pontos);
    const retornarOrigem = document.getElementById('simulate-opt-return')?.checked;
    const ultimaFixa = document.getElementById('simulate-opt-last-fixed')?.checked;

    // O OSRM não repete automaticamente a origem no array de waypoints usado para desenhar.
    // Aqui adicionamos o retorno visualmente quando solicitado.
    const sequenciaFinal = pontosOrdenados.slice();
    if (retornarOrigem && sequenciaFinal.length > 1) {
        sequenciaFinal.push({ ...sequenciaFinal[0], retorno: true });
    } else if (ultimaFixa && sequenciaFinal.length > 2) {
        // destination=last já preserva a última parada cadastrada como destino.
    }

    // Desenha os marcadores já na ordem otimizada.
    let parada = 1;
    sequenciaFinal.forEach(ponto => {
        if (ponto.tipo === 'origem') {
            L.marker([ponto.lat, ponto.lng], { icon: createOriginIcon() })
                .addTo(simulateMarkersLayer)
                .bindPopup(`<b>Origem Fixa:</b><br>${SIMULACAO_CD.label}`);
        } else if (!ponto.retorno) {
            L.marker([ponto.lat, ponto.lng], { icon: createNumberedStopIcon(parada) })
                .addTo(simulateMarkersLayer)
                .bindPopup(`<b>${ponto.label}</b><br>NF ${ponto.nf?.numero || '---'}`);
            parada++;
        }
    });

    window.currentSimulatedPoints = sequenciaFinal.map(p => ({ lat: p.lat, lng: p.lng }));

    if (pontosIgnorados > 0 && nfs.length > 0 && parada === 1) {
        mostrarAviso('Nenhum destino das NFs pôde ser localizado.');
    }

    if (sequenciaFinal.length >= 2) {
        try {
            const waypoints = sequenciaFinal.map(c => `${c.lng},${c.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
            const data = await response.json();
            if (data.code && data.code !== 'Ok') throw new Error(`OSRM: ${data.code}${data.message ? ' - ' + data.message : ''}`);

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                L.geoJSON(route.geometry, {
                    style: { color: '#38bdf8', weight: 5, opacity: 0.78, lineJoin: 'round' }
                }).addTo(simulateRouteLayer);

                if (statsContainer && distElem && durElem) {
                    const distanceKm = (route.distance / 1000).toFixed(1);
                    const durationMins = Math.round(route.duration / 60);
                    let durationText = `${durationMins} min`;
                    if (durationMins >= 60) {
                        const h = Math.floor(durationMins / 60);
                        const m = durationMins % 60;
                        durationText = m > 0 ? `${h}h ${m}min` : `${h}h`;
                    }
                    distElem.innerText = `${distanceKm} km`;
                    durElem.innerText = durationText;
                    statsContainer.classList.remove('hidden');
                }
            }
        } catch (err) {
            console.error('Erro ao calcular rota roteirizada:', err);
            const latLngs = sequenciaFinal.map(c => [c.lat, c.lng]);
            L.polyline(latLngs, { color: '#38bdf8', weight: 5, opacity: 0.7, dashArray: '10, 10' }).addTo(simulateRouteLayer);
        }
    }

    // Atualiza a lista lateral para refletir a mesma sequência mostrada no mapa.
    const lista = document.querySelector('#simulate-route-details-container .simulate-stop-item')?.parentElement;
    if (lista) {
        const itens = sequenciaFinal.filter(p => p.tipo === 'nf' && !p.retorno);
        const contador = document.querySelector('#simulate-route-details-container .address-label + span');
        if (contador) contador.textContent = String(itens.length);
        lista.innerHTML = `
            <div class="simulate-stop-item">
                <div class="stop-order-badge" style="background: var(--accent); color: white;">CD</div>
                <div class="stop-details"><div class="stop-main-info"><span class="stop-title">Origem Fixa</span><span class="stop-location">CD Sirius</span></div></div>
            </div>
            ${itens.map((p, index) => `
                <div class="simulate-stop-item">
                    <div class="stop-order-badge">${index + 1}</div>
                    <div class="stop-details"><div class="stop-main-info"><span class="stop-title">NF ${p.nf?.numero || '---'}</span><span class="stop-location">${p.label || '---'}</span></div></div>
                </div>
            `).join('')}
        `;
    }

    const markers = simulateMarkersLayer.getLayers();
    const routes = simulateRouteLayer.getLayers();
    if (markers.length > 0) {
        const group = L.featureGroup([...markers, ...routes]);
        simulateMap.fitBounds(group.getBounds().pad(0.4), { animate: true });
    }
};

async function lidarComInputCepSimulacao(e, tipo) {
    let val = e.target.value;
    let clean = val.replace(/\D/g, '');
    
    // Aplica máscara visual 00000-000
    if (clean.length > 5) {
        e.target.value = clean.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
    } else {
        e.target.value = clean;
    }

    // Se o campo for alterado ou apagado, removemos o marcador atual desse tipo
    if (clean.length < 8) {
        if (simulateMarkersData[tipo]) {
            simulateMarkersLayer.removeLayer(simulateMarkersData[tipo]);
            delete simulateMarkersData[tipo];
            await ajustarMapaSimulacao();
        }
        return;
    }

    if (clean.length === 8) {
        const loc = await buscarLocalizacaoPorCep(clean);
        if (loc) {
            if (simulateMarkersData[tipo]) {
                simulateMarkersLayer.removeLayer(simulateMarkersData[tipo]);
            }

            // Usa o ícone personalizado para origem ou paradas
            const isOrigin = tipo === 'origin';
            const label = isOrigin ? 'Origem' : `Parada ${parseInt(tipo.replace('stop', ''))}`;
            const marker = L.marker([loc.lat, loc.lng], { icon: isOrigin ? createOriginIcon() : createNumberedStopIcon(parseInt(tipo.replace('stop', ''))) })
                .addTo(simulateMarkersLayer) 
                .bindPopup(`<b>${label}: ${loc.label}</b>`);
            
            simulateMarkersData[tipo] = marker;
            await ajustarMapaSimulacao();
        }
    }
}

function adicionarNovaParadaSimulacao() {
    simulateStopCounter++;
    const container = document.getElementById('simulate-stops-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'simulation-address-block';
    div.dataset.stopId = simulateStopCounter;
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label class="address-label" style="margin-bottom: 0;">Parada ${simulateStopCounter}</label>
            <button class="icon-btn delete" onclick="removerParadaSimulacao(${simulateStopCounter})" style="padding: 2px;" title="Remover Parada">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <input type="text" id="simulate-stop${simulateStopCounter}-cep" class="search" placeholder="00000-000" style="margin: 0; width: 100%;">
    `;
    container.appendChild(div);

    const input = div.querySelector('input');
    const tipo = `stop${simulateStopCounter}`;
    input.addEventListener('input', (e) => lidarComInputCepSimulacao(e, tipo));
    reordenarLabelsParadas();
}

window.removerParadaSimulacao = async function(id) {
    const tipo = `stop${id}`;
    const block = document.querySelector(`.simulation-address-block[data-stopId="${id}"]`);
    
    if (simulateMarkersData[tipo]) {
        simulateMarkersLayer.removeLayer(simulateMarkersData[tipo]);
        delete simulateMarkersData[tipo];
    }
    
    if (block) block.remove();

    await ajustarMapaSimulacao();
    reordenarLabelsParadas();
};

function reordenarLabelsParadas() {
    const blocks = document.querySelectorAll('#simulate-stops-container .simulation-address-block');
    let counter = 1;
    blocks.forEach(block => {
        const input = block.querySelector('input');
        if (input && input.id !== 'simulate-origin-cep') {
            const label = block.querySelector('.address-label');
            if (label) label.innerText = `Parada ${counter++}`;
        }
    });
}

window.limparRotaSimulacao = async function() {
    const container = document.getElementById('simulate-stops-container');
    if (!container) return;

    container.innerHTML = `
        <div class="simulation-address-block">
            <label class="address-label">Origem</label>
            <input type="text" id="simulate-origin-cep" class="search" placeholder="00000-000" style="margin: 0; width: 100%;">
        </div>
        <div class="simulation-address-block" data-stopId="1">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label class="address-label" style="margin-bottom: 0;">Parada 1</label>
                <button class="icon-btn delete" onclick="removerParadaSimulacao(1)" style="padding: 2px;" title="Remover Parada">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <input type="text" id="simulate-stop1-cep" class="search" placeholder="00000-000" style="margin: 0; width: 100%;">
        </div>
    `;

    document.getElementById('simulate-origin-cep').addEventListener('input', (e) => lidarComInputCepSimulacao(e, 'origin'));
    document.getElementById('simulate-stop1-cep').addEventListener('input', (e) => lidarComInputCepSimulacao(e, 'stop1'));

    simulateMarkersData = {};
    window.currentSimulatedPoints = null;
    if (simulateMarkersLayer) simulateMarkersLayer.clearLayers();
    if (simulateRouteLayer) simulateRouteLayer.clearLayers();
    
    const statsContainer = document.getElementById('simulate-stats-container');
    if (statsContainer) statsContainer.classList.add('hidden');

    simulateStopCounter = 1;
    if (simulateMap) simulateMap.setView([-15.7801, -47.9292], 4);
};

async function carregarOpcoesRotasSimulacao() {
    const selector = document.getElementById('simulate-route-selector');
    if (!selector) return;

    try {
        const { data: rotas, error } = await supabaseClient
            .from("rotas")
            .select("id, nome, data")
            .eq("status", "ativa")
            .order("data", { ascending: false });

        if (error) throw error;

        selector.innerHTML = '<option value="" disabled selected>Escolha uma rota...</option>';

        if (!rotas || rotas.length === 0) {
            selector.innerHTML = '<option value="" disabled selected>Nenhuma rota ativa disponível</option>';
            const detalhes = document.getElementById('simulate-route-details-container');
            if (detalhes) detalhes.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Não há rotas ativas disponíveis para simulação.</p>';
            return;
        }

        rotas.forEach(r => {
            const dataFmt = r.data ? r.data.split('-').reverse().join('/') : 'S/D';
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = `${r.nome || 'Rota sem nome'} (${dataFmt})`;
            selector.appendChild(option);
        });

        // Listener para mudança de rota
        if (!selector.dataset.listener) {
            selector.addEventListener('change', (e) => exibirDetalhesRotaSimulacao(e.target.value));
            selector.dataset.listener = "true";
        }
    } catch (err) {
        console.error("Erro ao carregar rotas para simulação:", err);
        selector.innerHTML = '<option value="" disabled>Erro ao carregar rotas</option>';
    }
}

async function exibirDetalhesRotaSimulacao(rotaId) {
    const container = document.getElementById('simulate-route-details-container');
    const statsContainer = document.getElementById('simulate-stats-container');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Carregando dados da rota...</p>';
    // Oculta as estatísticas enquanto carrega ou se houver erro
    if (statsContainer) statsContainer.classList.add('hidden');
    try {
        const [rotaRes, nfsRes] = await Promise.all([
            supabaseClient.from("rotas").select("*").eq("id", rotaId).single(),
            supabaseClient.from("nfs").select("*").eq("rota_id", rotaId).order('created_at', { ascending: true })
        ]);

        if (rotaRes.error) throw rotaRes.error;
        const rota = rotaRes.data;
        const nfs = nfsRes.data || [];

        const dataFmt = rota.data ? rota.data.split('-').reverse().join('/') : '---';
        
        let nfsListHtml = ''; // Variável para construir a lista de NFs/paradas

        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 15px; border: 1px solid var(--border); margin-bottom: 20px;">
                <div style="margin-bottom: 12px;">
                    <span class="address-label" style="margin-bottom: 2px;">Rota</span>
                    <div style="font-weight: 700; color: var(--text-main);">${rota.nome}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <span class="address-label" style="margin-bottom: 2px;">Data</span>
                        <div style="font-size: 13px;">${dataFmt}</div>
                    </div>
                    <div>
                        <span class="address-label" style="margin-bottom: 2px;">Transportadora</span>
                        <div style="font-size: 13px;">${rota.transportadora || '---'}</div>
                    </div>
                </div>
            </div>

            <!-- Melhoria Visual: Lista de NFs/Paradas no Modo Roteirizado -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="address-label">Paradas na Rota</span>
                <span style="font-size: 11px; background: var(--primary); color: white; padding: 2px 8px; border-radius: 10px; font-weight: 700;">${nfs.length}</span>
            </div>
            <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 5px;">
                ${nfs.length > 0 ? `
                    <!-- Origem Fixa (CD) -->
                    <div class="simulate-stop-item">
                        <div class="stop-order-badge" style="background: var(--accent); color: white;">CD</div>
                        <div class="stop-details">
                            <div class="stop-main-info">
                                <span class="stop-title">Origem Fixa</span>
                                <span class="stop-location">CD Sirius</span>
                            </div>
                        </div>
                    </div>
                    <!-- Lista de NFs como paradas -->
                    ${nfs.map((nf, index) => {
                        const stopNumber = index + 1; // Parada 1, Parada 2, etc.
                        const locationText = nf.uf === 'RT' ? 'RETIRA' : `${nf.cidade || '---'}/${nf.uf || '--'}`;
                        return `
                            <div class="simulate-stop-item">
                                <div class="stop-order-badge">${stopNumber}</div>
                                <div class="stop-details">
                                    <div class="stop-main-info">
                                        <span class="stop-title">NF ${nf.numero}</span>
                                        <span class="stop-location">${locationText}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                ` : `
                    <p style="text-align: center; color: var(--text-muted); padding: 20px;">
                        Nenhuma NF vinculada a esta rota.
                        <br>Apenas a origem (CD) será exibida no mapa.
                    </p>
                `}
            </div>
        `;

        // Aciona a atualização do mapa com as NFs da rota
        atualizarMapaRoteirizado(nfs);
    } catch (err) {
        console.error("Erro ao exibir detalhes da rota na simulação:", err);
        container.innerHTML = '<p style="color: #ef4444; font-size: 13px;">Erro ao carregar dados da rota.</p>';
        if (statsContainer) statsContainer.classList.add('hidden'); // Garante que as stats estejam ocultas em caso de erro
    }
}

function initSimulateOptionsListeners() {
    const options = ['simulate-opt-distance', 'simulate-opt-time', 'simulate-opt-return', 'simulate-opt-last-fixed'];
    options.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.listener) {
            el.addEventListener('change', ajustarMapaSimulacao);
            el.dataset.listener = "true";
        }
    });
}

async function ajustarMapaSimulacao() {
    if (!simulateMap || !simulateMarkersLayer || !simulateRouteLayer) return;

    const statsContainer = document.getElementById('simulate-stats-container');
    const distElem = document.getElementById('simulate-total-distance');
    const durElem = document.getElementById('simulate-total-duration');

    // Limpa o traçado anterior antes de redesenhar
    simulateRouteLayer.clearLayers();

    // Esconde os stats por padrão até que uma nova rota seja calculada
    if (statsContainer) statsContainer.classList.add('hidden');

    // Coleta coordenadas em ordem (Origem -> Parada 1 -> Parada 2...)
    const coords = [];
    if (simulateMarkersData.origin) {
        coords.push(simulateMarkersData.origin.getLatLng());
    }

    const stopKeys = Object.keys(simulateMarkersData)
        .filter(k => k.startsWith('stop'))
        .sort((a, b) => {
            const numA = parseInt(a.replace('stop', ''));
            const numB = parseInt(b.replace('stop', ''));
            return numA - numB;
        });

    stopKeys.forEach(k => {
        if (simulateMarkersData[k]) {
            coords.push(simulateMarkersData[k].getLatLng());
        }
    });

    // Adiciona o retorno à origem ao final da lista de coordenadas se a opção estiver marcada
    const returnToOrigin = document.getElementById('simulate-opt-return')?.checked;
    if (returnToOrigin && simulateMarkersData.origin) {
        coords.push(simulateMarkersData.origin.getLatLng());
    }

    window.currentSimulatedPoints = coords; // Armazena a sequência para o Google Maps

    if (coords.length >= 2) {
        try {
            // Chamada à API do OSRM para obter a rota real pelas ruas
            const waypoints = coords.map(c => `${c.lng},${c.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
            const data = await response.json();
            if (data.code && data.code !== 'Ok') throw new Error(`OSRM: ${data.code}${data.message ? ' - ' + data.message : ''}`);

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                L.geoJSON(route.geometry, {
                    style: { color: '#22c55e', weight: 5, opacity: 0.7, lineJoin: 'round' }
                }).addTo(simulateRouteLayer);

                // EXIBIÇÃO DE DISTÂNCIA E TEMPO
                if (statsContainer && distElem && durElem) {
                    const distanceKm = (route.distance / 1000).toFixed(1);
                    const durationMins = Math.round(route.duration / 60);
                    
                    let durationText = `${durationMins} min`;
                    if (durationMins >= 60) {
                        const h = Math.floor(durationMins / 60);
                        const m = durationMins % 60;
                        durationText = m > 0 ? `${h}h ${m}min` : `${h}h`;
                    }

                    distElem.innerText = `${distanceKm} km`;
                    durElem.innerText = durationText;
                    statsContainer.classList.remove('hidden');
                }
            }
        } catch (err) {
            console.error("Erro ao calcular rota real:", err);
            // Fallback para linha reta em caso de erro na API
            L.polyline(coords, { color: '#22c55e', weight: 5, opacity: 0.7, dashArray: '10, 10' }).addTo(simulateRouteLayer);
        }
    }
    
    const markers = Object.values(simulateMarkersData).filter(m => m !== null);
    const routes = simulateRouteLayer.getLayers();

    if (markers.length > 0) {
        const group = L.featureGroup([...markers, ...routes]);
        simulateMap.fitBounds(group.getBounds().pad(0.4), { animate: true });
    } else {
        // Se não houver pontos, volta para o zoom padrão do Brasil
        simulateMap.setView([-15.7801, -47.9292], 4);
    }
}


const openControlPanelBtn = document.getElementById('open-control-panel-btn');
const openGerencialBtn = document.getElementById('open-gerencial-btn');
const backToControlPanelFromGerencialBtn = document.getElementById('back-to-control-panel-from-gerencial-btn');
const permissoesView = document.getElementById('permissoes-view');
const limitesRetiradaView = document.getElementById('limites-retirada-view');
const backToGerencialFromPermissoesBtn = document.getElementById('back-to-gerencial-from-permissoes-btn');
const backToGerencialFromLimitesBtn = document.getElementById('back-to-gerencial-from-limites-btn');
const openProgramacaoBtn = document.getElementById('open-programacao-btn'); // Novo botão
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const openProgHistoryBtn = document.getElementById('open-programacao-history-btn');
const progHistoryModal = document.getElementById('programacao-history-modal');
const openControlPanelFromProgBtn = document.getElementById('open-control-panel-from-prog-btn');
const openControlPanelFromHistoryBtn = document.getElementById('open-control-panel-from-new-history-btn');
const openProgramacaoFromHistoryBtn = document.getElementById('open-programacao-from-new-history-btn');
const exportProgramacaoBtn = document.getElementById('export-programacao-btn');
const openRotaModalFromProgBtn = document.getElementById('open-rota-modal-from-prog-btn');
const openSimulateRouteBtn = document.getElementById('open-simulate-route-btn');
const addUserBtn = document.getElementById('add-user-btn');
const createUserModal = document.getElementById('create-user-modal');
const createUserForm = document.getElementById('create-user-form');
const userModalTitle = document.getElementById('user-modal-title');
const userIdHidden = document.getElementById('user-id-hidden');

let listaUsuariosLocal = []; // Cache local para busca rápida na edição

// --- GERENCIAL: PERMISSÕES (ETAPA 3A - VISUAL) ---
const permissoesConfigBase = {
    'Roteirização': {
        visualizacao: true, gerenciamento: true, transporte: true, retirada: true,
        adicionar_nf: true, editar_nf: true, excluir_nf: true,
        criar_rota: true, editar_rota: true, excluir_rota: true,
        adicionar_nf_rota: true, remover_nf_rota: true, finalizar_rota: true,
        copiar_resumo: true, observacao_nf: true
    },
    'Programação': {
        visualizacao: true, gerenciamento: true,
        alterar_status: true, retornar_rota: true, exportar: true
    },
    'Histórico': {
        visualizacao: true, gerenciamento: false,
        visualizar_detalhes: true, retornar_rota: false, excluir_historico: false,
        observacao: false
    },
    'Simular Rota': { visualizacao: true, gerenciamento: true },
    'Painel de Controle': {
        visualizacao: true, gerenciamento: true
    },
    'Gerencial': {
        visualizacao: false, gerenciamento: false,
        gerenciar_usuarios: false, gerenciar_kam: false,
        gerenciar_permissoes: false, gerenciar_limites: false
    }
};

function obterPermissoesVisuaisUsuario(user) {
    const acesso = user?.permissao || user?.__permissoesPersonalizadas?.__perfilBase || 'Operador';
    const defaults = JSON.parse(JSON.stringify(permissoesConfigBase));

    if (acesso === 'Visualizador') {
        Object.values(defaults).forEach(p => {
            p.visualizacao = true;
            p.gerenciamento = false;
            Object.keys(p).forEach(k => { if (k !== 'visualizacao' && k !== 'gerenciamento') p[k] = false; });
        });
        defaults['Gerencial'].visualizacao = false;
    } else if (acesso === 'Operador') {
        Object.values(defaults).forEach(p => {
            p.visualizacao = true;
            p.gerenciamento = true;
            Object.keys(p).forEach(k => { if (k !== 'visualizacao' && k !== 'gerenciamento') p[k] = true; });
        });
        defaults['Histórico'].gerenciamento = false;
        defaults['Histórico'].retornar_rota = false;
        defaults['Histórico'].excluir_historico = false;
        defaults['Histórico'].observacao = false;
        defaults['Gerencial'].visualizacao = false;
        defaults['Gerencial'].gerenciamento = false;
        defaults['Gerencial'].gerenciar_permissoes = false;
        defaults['Gerencial'].gerenciar_limites = false;
    } else if (acesso === 'Administrador') {
        Object.values(defaults).forEach(p => {
            p.visualizacao = true;
            p.gerenciamento = true;
            Object.keys(p).forEach(k => { if (k !== 'visualizacao' && k !== 'gerenciamento') p[k] = true; });
        });
        defaults['Histórico'].gerenciamento = false;
        defaults['Histórico'].retornar_rota = false;
        defaults['Histórico'].excluir_historico = false;
        defaults['Histórico'].observacao = false;
        // Administrador também mantém acesso ao Gerencial, preservando o acesso
        // que já existia no sistema. O ADM TI continua sendo o perfil de acesso total.
        defaults['Gerencial'].visualizacao = true;
        defaults['Gerencial'].gerenciamento = true;
        defaults['Gerencial'].gerenciar_permissoes = true;
        defaults['Gerencial'].gerenciar_limites = true;
    } else if (acesso === 'ADM TI') {
        Object.values(defaults).forEach(p => {
            p.visualizacao = true;
            p.gerenciamento = true;
            Object.keys(p).forEach(k => { if (k !== 'visualizacao' && k !== 'gerenciamento') p[k] = true; });
        });
    }

    // As personalizações novas são exceções sobre o perfil-base.
    // Formato novo: { __perfilBase, __excecoes: { Tela: { flag: boolean } } }
    const personalizadas = user?.__permissoesPersonalizadas;
    if (personalizadas && typeof personalizadas === 'object') {
        if (personalizadas.__excecoes && typeof personalizadas.__excecoes === 'object') {
            Object.keys(personalizadas.__excecoes).forEach(tela => {
                if (!defaults[tela] || !personalizadas.__excecoes[tela] || typeof personalizadas.__excecoes[tela] !== 'object') return;
                Object.keys(personalizadas.__excecoes[tela]).forEach(chave => {
                    if (chave in defaults[tela] && typeof personalizadas.__excecoes[tela][chave] === 'boolean') {
                        defaults[tela][chave] = personalizadas.__excecoes[tela][chave];
                    }
                });
            });
        } else {
            // Compatibilidade com registros antigos que gravavam a matriz inteira.
            // Se o perfil salvo no registro antigo for diferente do perfil atual,
            // descartamos a matriz antiga para não carregar flags do perfil anterior.
            const perfilLegado = personalizadas.__perfilBase;
            const perfilAtual = user?.permissao || perfilLegado;
            if (!perfilLegado || perfilLegado === perfilAtual) {
                Object.keys(personalizadas).forEach(tela => {
                    if (!defaults[tela] || !personalizadas[tela] || typeof personalizadas[tela] !== 'object') return;
                    Object.keys(personalizadas[tela]).forEach(chave => {
                        if (chave in defaults[tela] && typeof personalizadas[tela][chave] === 'boolean') {
                            if (personalizadas[tela][chave] !== defaults[tela][chave]) {
                                defaults[tela][chave] = personalizadas[tela][chave];
                            }
                        }
                    });
                });
            }
        }
    }

    return defaults;
}

function obterPermissaoUsuario(tela) {
    const user = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    if (!user) return null;
    return obterPermissoesVisuaisUsuario(user)[tela] || null;
}

function usuarioPodeVisualizar(tela) {
    return !!obterPermissaoUsuario(tela)?.visualizacao;
}

function usuarioPodeGerenciar(tela) {
    return !!obterPermissaoUsuario(tela)?.gerenciamento;
}

function usuarioPodeAcao(tela, acao) {
    const p = obterPermissaoUsuario(tela);
    if (!p || !acao) return false;
    // Cada flag é independente. "Gerenciar" nunca concede automaticamente
    // acesso às ações específicas da tela.
    return p[acao] === true;
}

function usuarioPodeTransportar() {
    return !!obterPermissaoUsuario('Roteirização')?.transporte;
}

function usuarioPodeRetirar() {
    return !!obterPermissaoUsuario('Roteirização')?.retirada;
}

// Transporte e Retirada controlam operações sobre o tipo da NF.
// Eles são independentes das demais flags de Roteirização.
function obterTipoOperacaoNF(nf) {
    return (nf?.tipo === 'retira' || nf?.uf === 'RT') ? 'retira' : 'transporte';
}

function usuarioPodeTipoNF(nf) {
    return obterTipoOperacaoNF(nf) === 'retira' ? usuarioPodeRetirar() : usuarioPodeTransportar();
}

function verificarPermissaoTipoNFs(nfs, acaoDescricao = 'alterar estas NFs') {
    const lista = Array.isArray(nfs) ? nfs : (nfs ? [nfs] : []);
    const bloqueada = lista.find(nf => !usuarioPodeTipoNF(nf));
    if (!bloqueada) return true;

    const tipo = obterTipoOperacaoNF(bloqueada) === 'retira' ? 'Retirada' : 'Transporte';
    mostrarAviso(`⛔ Você não possui permissão para ${acaoDescricao} de ${tipo}.`);
    return false;
}

async function salvarPermissoesUsuario(button, usuarioId) {
    if (!button || !usuarioId) return;
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_permissoes')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar permissões.');
        return;
    }
    const detalhes = button.closest('.permission-detail-inner');
    if (!detalhes) return;
    const telasEfetivas = {};
    const usuarioConfigurado = listaUsuariosLocal.find(u => String(u.id) === String(usuarioId));
    const acessoSelect = button.closest('.permission-user-item')?.querySelector('.permission-access-select');
    const perfilBase = acessoSelect?.value || usuarioConfigurado?.permissao || 'Operador';

    detalhes.querySelectorAll('.permission-screen').forEach(screen => {
        const tela = screen.dataset.screen;
        if (!tela) return;
        const config = {};
        screen.querySelectorAll('input[data-permission]').forEach(input => {
            const chave = input.dataset.permission;
            if (chave) config[chave] = input.checked;
        });
        telasEfetivas[tela] = config;
    });

    // Salva somente as diferenças em relação ao preset do perfil.
    const defaultsPerfil = obterPermissoesVisuaisUsuario({ permissao: perfilBase });
    const excecoes = {};
    Object.keys(telasEfetivas).forEach(tela => {
        if (!defaultsPerfil[tela]) return;
        const diferencas = {};
        Object.keys(telasEfetivas[tela]).forEach(chave => {
            const valor = telasEfetivas[tela][chave];
            const padrao = defaultsPerfil[tela][chave];
            if (typeof valor === 'boolean' && typeof padrao === 'boolean' && valor !== padrao) {
                diferencas[chave] = valor;
            }
        });
        if (Object.keys(diferencas).length) excecoes[tela] = diferencas;
    });

    const permissoesParaSalvar = {
        __perfilBase: perfilBase,
        __excecoes: excecoes
    };

    const administrador = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!administrador?.email || !administrador?.senha) { mostrarAviso('Sessão administrativa inválida. Faça login novamente.'); return; }
    button.disabled = true;
    const textoOriginal = button.textContent;
    button.textContent = 'Salvando...';
    try {
        const { data, error } = await supabaseClient.rpc('salvar_permissoes_usuarios', {
            p_email: administrador.email, p_senha: administrador.senha, p_usuario_id: usuarioId, p_permissoes: permissoesParaSalvar
        });
        if (error) throw error;

        const salvo = Array.isArray(data) ? data[0] : data;
        const permissoesSalvas = salvo?.permissoes || permissoesParaSalvar;

        const perfilAnterior = usuarioConfigurado?.permissao;
        const { data: usuarioAtualizado, error: erroPerfil } = await supabaseClient
            .from('usuarios')
            .update({ permissao: perfilBase })
            .eq('id', usuarioId)
            .select('*')
            .single();

        if (erroPerfil) {
            if (perfilAnterior) {
                await supabaseClient
                    .from('usuarios')
                    .update({ permissao: perfilAnterior })
                    .eq('id', usuarioId);
            }
            throw erroPerfil;
        }

        if (usuarioConfigurado) {
            Object.assign(usuarioConfigurado, usuarioAtualizado || {}, {
                permissao: perfilBase,
                __permissoesPersonalizadas: permissoesSalvas
            });
        }

        const usuarioLogadoAtual = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
        if (usuarioLogadoAtual && String(usuarioLogadoAtual.id) === String(usuarioId)) {
            usuarioLogadoAtual.permissao = perfilBase;
            usuarioLogadoAtual.__permissoesPersonalizadas = permissoesSalvas;
            localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogadoAtual));
        }

        const badge = detalhes.querySelector('.permission-stage-badge');
        if (badge) badge.textContent = 'Configuração salva';
        mostrarAviso('Permissões e perfil salvos com sucesso.');
    } catch (err) {
        console.error('Gerencial: erro ao salvar permissões:', err);
        mostrarAviso('Erro ao salvar as permissões.');
    } finally {
        button.disabled = false; button.textContent = textoOriginal;
    }
}

function renderizarPermissoes() {
    const container = document.getElementById('permissions-users-list');
    const count = document.getElementById('count-permission-users');
    if (!container) return;

    const users = listaUsuariosLocal.length ? listaUsuariosLocal : JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
    if (count) count.textContent = `${users.length} ${users.length === 1 ? 'usuário' : 'usuários'}`;

    container.innerHTML = '';
    if (!users.length) {
        container.innerHTML = '<div class="permission-empty">Nenhum usuário encontrado.</div>';
        return;
    }

    users.forEach((user, index) => {
        const row = document.createElement('div');
        row.className = 'permission-user-item';
        row.dataset.userId = user.id || `user-${index}`;
        const initials = `${(user.nome || '').charAt(0)}${(user.sobrenome || '').charAt(0)}`.trim().toUpperCase() || '?';
        row.innerHTML = `
          <button type="button" class="permission-user-toggle" aria-expanded="false">
            <span class="permission-user-main">
              <span class="permission-avatar">${initials}</span>
              <span class="permission-user-text"><strong>${user.nome || ''} ${user.sobrenome || ''}</strong><small>${user.email || '---'}</small></span>
            </span>
            <span class="permission-user-role">${user.cargo || user.permissao || '---'}</span>
            <span class="permission-access-control">
              <select class="permission-access-select" aria-label="Alterar acesso atual">
                <option value="ADM TI" ${user.permissao === 'ADM TI' ? 'selected' : ''}>ADM TI</option>
                <option value="Administrador" ${user.permissao === 'Administrador' ? 'selected' : ''}>Administrador</option>
                <option value="Operador" ${user.permissao === 'Operador' ? 'selected' : ''}>Operador</option>
                <option value="Visualizador" ${user.permissao === 'Visualizador' ? 'selected' : ''}>Visualizador</option>
              </select>
            </span>
            <span class="permission-chevron">⌄</span>
          </button>
          <div class="permission-user-details hidden"></div>
        `;
        const toggle = row.querySelector('.permission-user-toggle');
        const accessSelect = row.querySelector('.permission-access-select');
        const details = row.querySelector('.permission-user-details');

        if (accessSelect) {
            accessSelect.addEventListener('click', (event) => event.stopPropagation());
            accessSelect.addEventListener('change', (event) => {
                event.stopPropagation();
                user.permissao = event.target.value;
                // Ao trocar o perfil, começa pelo preset do novo perfil.
                user.__permissoesPersonalizadas = {
                    __perfilBase: user.permissao,
                    __excecoes: {}
                };
                if (!details.classList.contains('hidden')) {
                    details.innerHTML = criarPainelPermissoesUsuario(user);
                    details.dataset.rendered = 'true';
                }
            });
        }

        toggle.addEventListener('click', (event) => {
            if (event.target.closest('.permission-access-control')) return;
            const open = !details.classList.contains('hidden');
            details.classList.toggle('hidden', open);
            toggle.setAttribute('aria-expanded', String(!open));
            row.classList.toggle('is-expanded', !open);
            if (!open && !details.dataset.rendered) {
                details.innerHTML = criarPainelPermissoesUsuario(user);
                details.dataset.rendered = 'true';
                configurarFlagsDePermissao(details);
            }
        });
        container.appendChild(row);
    });
}

function configurarFlagsDePermissao(detalhes) {
    if (!detalhes) return;
    detalhes.querySelectorAll('.permission-screen').forEach(screen => {
        const gerenciar = screen.querySelector('input[data-permission="gerenciamento"]');
        if (!gerenciar) return;
        gerenciar.addEventListener('change', () => {
            // "Gerenciar" é uma permissão independente.
            // As flags de ações continuam valendo individualmente e não são apagadas.
        });
    });
}

function aplicarPermissoesNaInterface() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    if (!user) return;

    const permissoes = obterPermissoesVisuaisUsuario(user);
    const isViewer = !Object.values(permissoes).some(p => p && p.gerenciamento);
    document.body.classList.toggle('is-viewer', isViewer);

    const ids = {
        'Programação': ['open-programacao-btn'],
        'Histórico': ['open-history-btn', 'open-programacao-history-btn'],
        'Painel de Controle': ['open-control-panel-btn', 'open-control-panel-from-prog-btn', 'open-control-panel-from-new-history-btn'],
        'Gerencial': ['open-gerencial-btn'],
        'Simular Rota': ['open-simulate-route-btn']
    };
    Object.entries(ids).forEach(([tela, lista]) => {
        lista.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', !usuarioPodeVisualizar(tela));
        });
    });
    const cardLimites = document.getElementById('open-limites-retirada-btn');
    if (cardLimites) cardLimites.classList.toggle('hidden', !usuarioPodeAcao('Gerencial', 'gerenciar_limites'));
    const cardUsuarios = document.querySelector('[data-gerencial-placeholder="Gerenciar Usuários"]');
    const kamSection = document.getElementById('gerencial-kam-section');
    if (cardUsuarios) cardUsuarios.classList.toggle('hidden', !usuarioPodeAcao('Gerencial', 'gerenciar_usuarios'));
    if (kamSection) kamSection.classList.toggle('hidden', !usuarioPodeAcao('Gerencial', 'gerenciar_kam'));

    // As ações específicas são independentes do "Gerenciar" e do perfil.
    // O CSS também acompanha as flags para não deixar botões visualmente utilizáveis
    // quando a ação está bloqueada.
    const styleId = 'permissoes-granulares-runtime';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }
    const regras = [];
    const definirVisibilidade = (acao, selector, display = 'flex') => {
        regras.push(`${selector}{display:${usuarioPodeAcao('Roteirização', acao) ? display : 'none'}!important;}`);
    };

    definirVisibilidade('adicionar_nf', '#open-nf-modal-btn');
    definirVisibilidade('criar_rota', '#open-rota-modal-btn');
    definirVisibilidade('editar_nf', '.nf-actions-top .edit');
    definirVisibilidade('excluir_nf', '.nf-actions-top .delete');
    definirVisibilidade('editar_rota', '.rota-actions .edit');
    definirVisibilidade('excluir_rota', '.rota-actions .delete');
    definirVisibilidade('finalizar_rota', '.rota-footer .btn:not(.btn-outline):not(.btn-map-route)');
    regras.push(`.maps-wrapper{display:flex!important;}`);
    regras.push(`.rota-footer .btn.btn-outline{display:${usuarioPodeAcao('Roteirização', 'copiar_resumo') ? 'inline-flex' : 'none'}!important;}`);
    regras.push(`.history-card .btn[onclick*="retornar"]{display:${usuarioPodeAcao('Histórico', 'retornar_rota') ? 'block' : 'none'}!important;}`);
    regras.push(`.history-card .btn[onclick*="excluirHistorico"]{display:${usuarioPodeAcao('Histórico', 'excluir_historico') ? 'block' : 'none'}!important;}`);
    regras.push(`#export-programacao-btn{display:${usuarioPodeAcao('Programação', 'exportar') ? 'inline-flex' : 'none'}!important;}`);
    style.textContent = regras.join('\n');
    inicializarMenuGlobal();
}

function criarPainelPermissoesUsuario(user) {
    const config = obterPermissoesVisuaisUsuario(user);
    const telas = Object.keys(config);
    return `
      <div class="permission-detail-inner">
        <div class="permission-detail-title">
          <div><strong>Permissões de ${user.nome || 'usuário'}</strong><small>Configure o nível de acesso por tela.</small></div>
          <span class="permission-stage-badge">Configuração visual</span>
        </div>
        <div class="permission-matrix">
          <div class="permission-matrix-head"><span>Tela / módulo</span><span>Visualizar</span><span>Gerenciar</span></div>
          ${telas.map(tela => {
              const p = config[tela];
              const hasOps = 'transporte' in p || 'retirada' in p;
              return `
                <div class="permission-screen" data-screen="${tela}">
                  <div class="permission-screen-name"><strong>${tela}</strong>${hasOps ? '<small>Permissões operacionais</small>' : ''}</div>
                  <label class="permission-switch-line"><input type="checkbox" data-permission="visualizacao" ${p.visualizacao ? 'checked' : ''}><span class="permission-switch"></span><span>Visualizar</span></label>
                  <label class="permission-switch-line"><input type="checkbox" data-permission="gerenciamento" ${p.gerenciamento ? 'checked' : ''}><span class="permission-switch"></span><span>Gerenciar</span></label>
                  ${hasOps ? `
                    <div class="permission-operations">
                      <span class="permission-operations-label">Operações</span>
                      <label class="permission-switch-line compact"><input type="checkbox" data-permission="transporte" ${p.transporte ? 'checked' : ''}><span class="permission-switch"></span><span>Transporte</span></label>
                      <label class="permission-switch-line compact"><input type="checkbox" data-permission="retirada" ${p.retirada ? 'checked' : ''}><span class="permission-switch"></span><span>Retirada</span></label>
                    </div>` : ''}
                  ${Object.entries(p).filter(([k]) => !['visualizacao','gerenciamento','transporte','retirada'].includes(k)).length ? `
                    <div class="permission-operations">
                      <span class="permission-operations-label">Ações específicas</span>
                      ${Object.entries(p).filter(([k]) => !['visualizacao','gerenciamento','transporte','retirada'].includes(k)).map(([k,v]) => {
                          const labels = { adicionar_nf:'Adicionar NF', editar_nf:'Editar NF', excluir_nf:'Excluir NF', criar_rota:'Criar rota', editar_rota:'Editar rota', excluir_rota:'Excluir rota', adicionar_nf_rota:'Adicionar NF à rota', remover_nf_rota:'Remover NF da rota', finalizar_rota:'Finalizar rota', copiar_resumo:'Copiar resumo', observacao_nf:'Observação da NF', alterar_status:'Alterar status', retornar_rota:'Retornar rota', exportar:'Exportar', visualizar_detalhes:'Detalhes da rota', excluir_historico:'Excluir histórico', observacao:'Observação', gerenciar_usuarios:'Gerenciar usuários', gerenciar_kam:'Gerenciar KAM', gerenciar_permissoes:'Gerenciar permissões', gerenciar_limites:'Gerenciar limites' };
                          return `<label class=\"permission-switch-line compact\"><input type=\"checkbox\" data-permission=\"${k}\" ${v ? 'checked' : ''}><span class=\"permission-switch\"></span><span>${labels[k] || k}</span></label>`;
                      }).join('')}
                    </div>` : ''}
                </div>`;
          }).join('')}
        </div>
        <div class="permission-detail-footer">
          <span>O perfil-base apenas preenche as permissões iniciais. As flags abaixo são as permissões efetivas e podem ser alteradas individualmente.</span>
          <button type="button" class="btn btn-outline permission-save-visual">Salvar configuração</button>
        </div>
      </div>`;
}

document.addEventListener('click', (event) => {
    const button = event.target.closest('.permission-save-visual');
    if (!button) return;
    const detalhes = button.closest('.permission-detail-inner');
    const row = button.closest('.permission-user-item');
    const usuarioId = row?.dataset.userId;
    if (detalhes && usuarioId) salvarPermissoesUsuario(button, usuarioId);
});

// --- ADMIN: USUÁRIOS ---
function initAdmin() {
    const users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
    // FIX 1: Verifica se o admin JÁ EXISTE especificamente.
    // BUG ORIGINAL: se outros usuários existissem no localStorage, o admin nunca era criado.
    // CONSEQUÊNCIA: admin ficava bloqueado sempre que algum outro usuário era cadastrado.
    if (!users.some(u => u.email === "admin@sirius.colibri")) {
        const admin = {
            id: 'admin-001',
            nome: "Admin",
            sobrenome: "Sistema",
            email: "admin@sirius.colibri",
            senha: "./Sirius.Admin",
            cargo: "Administrador",
            permissao: "Administrador",
            status: "Ativo"
        };
        users.push(admin);
        localStorage.setItem('sirios_usuarios', JSON.stringify(users));
    }
}

function renderizarUsuarios(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = "";

    const countElem = document.getElementById('count-users');
    if (countElem) countElem.innerText = `Total: ${users.length}`;

    users.forEach(user => {
        const tr = document.createElement('tr');
        const statusColor = user.status === 'Ativo' ? 'var(--primary)' : '#ef4444';
        
        tr.innerHTML = `
            <td>${user.nome} ${user.sobrenome}</td>
            <td>${user.cargo || '---'}</td>
            <td>${user.email || '---'}</td>
            <td><span style="background: var(--border); padding: 4px 8px; border-radius: 4px; font-size: 11px;">${user.permissao || 'Operador'}</span></td>
            <td><span style="color: ${statusColor}; font-weight: 600;">● ${user.status}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="icon-btn edit" title="Editar" onclick="editarUsuario('${user.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                    <button class="icon-btn delete" title="Excluir" onclick="excluirUsuario('${user.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editarUsuario = function(id) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_usuarios')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar usuários.');
        return;
    }
    const user = listaUsuariosLocal.find(u => u.id == id);
    if (!user) return;

    if (userModalTitle) userModalTitle.innerText = "Editar Usuário";
    if (userIdHidden) userIdHidden.value = user.id;
    
    document.getElementById('user-nome').value = user.nome;
    document.getElementById('user-sobrenome').value = user.sobrenome;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-password').value = user.senha;
    document.getElementById('user-cargo').value = user.cargo;
    document.getElementById('user-permissao').value = user.permissao;

    openModal(createUserModal);
};

window.excluirUsuario = function(id) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_usuarios')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar usuários.');
        return;
    }
    confirmarAcao("Tem certeza que deseja remover este usuário do banco de dados?", async () => {
        try {
            const { error } = await supabaseClient.from("usuarios").delete().eq("id", id);
            if (error) throw error;
            
            await carregarUsuarios();
        } catch (err) {
            console.error("Erro ao excluir usuário:", err);
            mostrarAviso("Erro ao excluir usuário no servidor.");
        }
    });
};

async function carregarUsuarios() {
    console.log("Carregando usuários do banco...");
    try {
        const { data, error } = await supabaseClient.from("usuarios").select("*").order("nome");
        console.log("Usuários carregados:", data, error);
        if (error) throw error;

        // IMPORTANTE: a tabela permissoes_usuarios pode estar protegida por RLS
        // para consultas diretas feitas pelo navegador. Nesse caso, um SELECT
        // simples retorna vazio e o editor volta a mostrar apenas o padrão do perfil.
        // Como já existe a RPC obter_minhas_permissoes, usamos a própria RPC para
        // recuperar a configuração persistida de cada usuário, sem criar/alterar
        // nenhuma tabela ou coluna.
        listaUsuariosLocal = await Promise.all((data || []).map(async user => {
            let personalizadas = null;

            if (user.email && user.senha) {
                try {
                    const { data: permissaoRpc, error: permissaoRpcError } = await supabaseClient.rpc('obter_minhas_permissoes', {
                        p_email: user.email,
                        p_senha: user.senha
                    });

                    if (!permissaoRpcError) {
                        const registro = Array.isArray(permissaoRpc) ? permissaoRpc[0] : permissaoRpc;
                        personalizadas = registro?.permissoes || null;
                    } else {
                        console.warn(`Não foi possível carregar permissões de ${user.email}:`, permissaoRpcError);
                    }
                } catch (errPermissao) {
                    console.warn(`Erro ao carregar permissões de ${user.email}:`, errPermissao);
                }
            }

            // O editor administrativo trabalha com o perfil salvo em usuarios.permissao
            // + as flags efetivas persistidas em permissoes_usuarios.
            if (personalizadas && typeof personalizadas === 'object') {
                user.__permissoesPersonalizadas = JSON.parse(JSON.stringify(personalizadas));
                if (!user.__permissoesPersonalizadas.__perfilBase) {
                    user.__permissoesPersonalizadas.__perfilBase = user.permissao || 'Operador';
                }
            } else {
                user.__permissoesPersonalizadas = {};
            }

            return user;
        }));

        renderizarUsuarios(listaUsuariosLocal);
    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
    }
}

// --- LÓGICA DE KAM ---
async function carregarKams() {
    try {
        const { data: kams, error } = await supabaseClient.from("kams").select("*").order("nome");
        if (error) throw error;

        renderizarKams(kams);
        popularSelectKam(kams);
    } catch (err) {
        console.error("Erro ao carregar KAMs:", err);
    }
}

function renderizarKams(kams) {
    const tbody = document.getElementById('kams-table-body');
    if (!tbody) return;
    tbody.innerHTML = "";

    const countElem = document.getElementById('count-kams');
    if (countElem) countElem.innerText = `Total: ${kams ? kams.length : 0}`;

    if (!kams || kams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:10px;">Nenhum KAM cadastrado.</td></tr>`;
        return;
    }

    kams.forEach(kam => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${kam.nome}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="icon-btn edit" title="Editar" onclick="editarKam('${kam.id}', '${kam.nome}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                    <button class="icon-btn delete" title="Excluir" onclick="excluirKam('${kam.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function popularSelectKam(kams, valorSelecionado = "") {
    if (!nfKamInput) return;
    nfKamInput.innerHTML = '<option value="" disabled selected>Selecione um KAM...</option>';
    
    if (kams && kams.length > 0) {
        kams.forEach(kam => {
            const option = document.createElement('option');
            option.value = kam.nome;
            option.textContent = kam.nome;
            nfKamInput.appendChild(option);
        });
    } else {
        nfKamInput.innerHTML = '<option value="" disabled selected>Nenhum KAM cadastrado</option>';
    }

    // Tarefa 7: Compatibilidade com NFs antigas (valor texto)
    if (valorSelecionado) {
        const existe = Array.from(nfKamInput.options).some(opt => opt.value === valorSelecionado);
        if (!existe) {
            const opt = document.createElement('option');
            opt.value = valorSelecionado;
            opt.textContent = valorSelecionado;
            nfKamInput.appendChild(opt);
        }
        nfKamInput.value = valorSelecionado;
    }
}

window.editarKam = function(id, nome) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_kam')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar KAM.');
        return;
    }
    if (kamModalTitle) kamModalTitle.innerText = "Editar KAM";
    if (kamIdHidden) kamIdHidden.value = id;
    if (kamNomeInput) kamNomeInput.value = nome;
    openModal(createKamModal);
};

window.excluirKam = function(id) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_kam')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar KAM.');
        return;
    }
    confirmarAcao("Tem certeza que deseja excluir este KAM?", async () => {
        try {
            await supabaseClient.from("kams").delete().eq("id", id);
            carregarKams();
        } catch (err) {
            console.error("Erro ao excluir KAM:", err);
        }
    });
};

if (addKamBtn) {
    addKamBtn.addEventListener('click', () => {
        if (!usuarioPodeAcao('Gerencial', 'gerenciar_kam')) {
            mostrarAviso('⛔ Você não possui permissão para gerenciar KAM.');
            return;
        }
        if (kamModalTitle) kamModalTitle.innerText = "Adicionar Novo KAM";
        if (kamIdHidden) kamIdHidden.value = "";
        if (createKamForm) createKamForm.reset();
        openModal(createKamModal);
    });
}

if (createKamForm) {
    createKamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!usuarioPodeAcao('Gerencial', 'gerenciar_kam')) {
            mostrarAviso('⛔ Você não possui permissão para gerenciar KAM.');
            return;
        }
        const id = kamIdHidden ? kamIdHidden.value : "";
        const nome = kamNomeInput ? kamNomeInput.value.trim() : "";

        console.log("Clique salvar KAM");
        console.log("Nome KAM:", nome);

        if (!nome) {
            mostrarAviso("Informe o nome do KAM");
            return;
        }

        try {
            let result;
            if (id) {
                // Modo Edição
                result = await supabaseClient.from("kams").update({ nome }).eq("id", id).select();
            } else {
                // Modo Criação
                result = await supabaseClient.from("kams").insert([{ nome }]).select();
            }

            const { data, error } = result;
            console.log("Resposta Supabase:", data, error);

            if (error) {
                console.error("Erro ao salvar KAM:", error);
                mostrarAviso("Erro ao salvar KAM");
                return; // Interrompe o fluxo para não fechar o modal
            }

            // Sucesso: Atualiza as listas (tabela e dropdown), limpa o form e fecha o modal
            await carregarKams();
            closeModal(createKamModal);
            createKamForm.reset();
            if (kamIdHidden) kamIdHidden.value = "";
            
        } catch (err) {
            console.error("Erro inesperado ao salvar KAM:", err);
            mostrarAviso("Erro inesperado ao salvar KAM");
        }
    });
}

if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
        if (!usuarioPodeAcao('Gerencial', 'gerenciar_usuarios')) {
            mostrarAviso('⛔ Você não possui permissão para gerenciar usuários.');
            return;
        }
        if (userModalTitle) userModalTitle.innerText = "Adicionar Novo Usuário";
        if (userIdHidden) userIdHidden.value = "";
        if (createUserForm) createUserForm.reset();
        openModal(createUserModal);
    });
}

if (createUserModal) {
    const closeBtn = createUserModal.querySelector('.close-button');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(createUserModal));
}

if (openControlPanelBtn) {
    openControlPanelBtn.addEventListener('click', () => {
        // FIX 4: Verificação de permissão de administrador
        // BUG ORIGINAL: qualquer usuário logado (Operador, Visualizador) podia acessar o painel
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioPodeVisualizar('Painel de Controle')) {
            mostrarAviso("⛔ Acesso restrito. Você não possui permissão para gerenciar o Painel de Controle.");
            return;
        }
        if (dashboardView && controlPanelView && programacaoView && newHistoryView) {
            dashboardView.classList.add('hidden');
            programacaoView.classList.add('hidden'); // Esconde programação também
            newHistoryView.classList.add('hidden');
            simulateRouteView.classList.add('hidden');
            if (gerencialView) gerencialView.classList.add('hidden');
            controlPanelView.classList.remove('hidden');
            document.querySelector('.app').classList.add('panel-active');
            carregarDashboard();
        }
    });
}

if (openControlPanelFromProgBtn) {
    openControlPanelFromProgBtn.addEventListener('click', () => {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioPodeVisualizar('Painel de Controle')) {
            mostrarAviso("⛔ Acesso restrito. Você não possui permissão para gerenciar o Painel de Controle.");
            return;
        }
        programacaoView.classList.add('hidden');
        if (gerencialView) gerencialView.classList.add('hidden');
        if (gerenciarUsuariosView) gerenciarUsuariosView.classList.add('hidden');
        if (newHistoryView) newHistoryView.classList.add('hidden');
        simulateRouteView.classList.add('hidden');
        if (gerencialView) gerencialView.classList.add('hidden');
        controlPanelView.classList.remove('hidden');
        document.querySelector('.app').classList.add('panel-active');
        carregarDashboard();
    });
}

if (openControlPanelFromHistoryBtn) {
    openControlPanelFromHistoryBtn.addEventListener('click', () => {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioPodeVisualizar('Painel de Controle')) {
            mostrarAviso("⛔ Acesso restrito. Você não possui permissão para gerenciar o Painel de Controle.");
            return;
        }
        newHistoryView.classList.add('hidden');
        simulateRouteView.classList.add('hidden');
        if (gerencialView) gerencialView.classList.add('hidden');
        controlPanelView.classList.remove('hidden');
        document.querySelector('.app').classList.add('panel-active');
        carregarDashboard();
    });
}

if (openProgramacaoFromHistoryBtn) {
    openProgramacaoFromHistoryBtn.addEventListener('click', () => {
        newHistoryView.classList.add('hidden');
        if (gerencialView) gerencialView.classList.add('hidden');
        programacaoView.classList.remove('hidden');
        document.querySelector('.app').classList.remove('panel-active');
        carregarProgramacao();
    });
}

if (openProgramacaoBtn) {
    openProgramacaoBtn.addEventListener('click', () => {
        // Não há verificação de permissão específica para "Programação" por enquanto,
        // mas pode ser adicionada aqui se necessário.
        if (dashboardView && controlPanelView && programacaoView && newHistoryView) {
            dashboardView.classList.add('hidden');
            controlPanelView.classList.add('hidden'); // Esconde painel de controle
            newHistoryView.classList.add('hidden');
            simulateRouteView.classList.add('hidden');
            if (gerencialView) gerencialView.classList.add('hidden');
            programacaoView.classList.remove('hidden');
            document.querySelector('.app').classList.remove('panel-active');
            carregarProgramacao();
        }
    });
}

if (openProgHistoryBtn) {
    openProgHistoryBtn.addEventListener('click', () => {
        if (dashboardView && controlPanelView && programacaoView && newHistoryView) {
            dashboardView.classList.add('hidden');
            controlPanelView.classList.add('hidden');
            programacaoView.classList.add('hidden');
            simulateRouteView.classList.add('hidden');
            newHistoryView.classList.remove('hidden');
            document.querySelector('.app').classList.add('panel-active');
            toggleNewHistoryViewMode('programacao');
        }
    });
}

if (openSimulateRouteBtn) {
    openSimulateRouteBtn.addEventListener('click', () => {
        dashboardView.classList.add('hidden');
        controlPanelView.classList.add('hidden');
        programacaoView.classList.add('hidden');
        newHistoryView.classList.add('hidden');
        simulateRouteView.classList.remove('hidden');
        document.querySelector('.app').classList.add('panel-active');
        // O mapa deve ser inicializado sem impedir o restante dos listeners caso o Leaflet/CDN falhe.
        try {
            initSimulateMap();
        } catch (err) {
            console.error('Erro ao inicializar o mapa da Simulação:', err);
            const mapEl = document.getElementById('map-simulate');
            if (mapEl) {
                mapEl.innerHTML = '<div style=\"height:100%;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--text-muted);\">Não foi possível carregar o mapa. Verifique sua conexão e tente novamente.</div>';
            }
        }

        // Configura os listeners para os campos de entrada de CEP da simulação
        const originInput = document.getElementById('simulate-origin-cep');
        const stop1Input = document.getElementById('simulate-stop1-cep');
        
        if (originInput && !originInput.dataset.listener) {
            originInput.addEventListener('input', (e) => lidarComInputCepSimulacao(e, 'origin'));
            originInput.dataset.listener = "true";
        }
        
        if (stop1Input && !stop1Input.dataset.listener) {
            stop1Input.addEventListener('input', (e) => lidarComInputCepSimulacao(e, 'stop1'));
            stop1Input.dataset.listener = "true";
        }

        const addStopBtn = document.getElementById('simulate-add-stop-btn');
        if (addStopBtn && !addStopBtn.dataset.listener) {
            addStopBtn.addEventListener('click', adicionarNovaParadaSimulacao);
            addStopBtn.dataset.listener = "true";
        }
        
        const clearBtn = document.getElementById('simulate-clear-btn');
        if (clearBtn && !clearBtn.dataset.listener) {
            clearBtn.addEventListener('click', limparRotaSimulacao);
            clearBtn.dataset.listener = "true";
        }

        const routedCalcBtn = document.getElementById('simulate-routed-calc-btn');
        if (routedCalcBtn && !routedCalcBtn.dataset.listener) {
            routedCalcBtn.addEventListener('click', async () => {
                const rotaId = document.getElementById('simulate-route-selector')?.value;
                if (!rotaId) {
                    mostrarAviso('Selecione uma rota ativa primeiro.');
                    return;
                }
                const { data: nfs, error } = await supabaseClient.from('nfs').select('*').eq('rota_id', rotaId).order('created_at', { ascending: true });
                if (error) {
                    console.error('Erro ao recalcular rota:', error);
                    mostrarAviso('Não foi possível carregar as NFs da rota.');
                    return;
                }
                await atualizarMapaRoteirizado(nfs || []);
            });
            routedCalcBtn.dataset.listener = 'true';
        }

        // Configura os botões de modo (CEP / Roteirizado)
        const cepModeBtn = document.getElementById('simulate-mode-cep-btn');
        const routedModeBtn = document.getElementById('simulate-mode-routed-btn');
        const cepContent = document.getElementById('simulate-cep-content');
        const routedContent = document.getElementById('simulate-routed-content');

        if (cepModeBtn && routedModeBtn && cepContent && routedContent) {
            cepModeBtn.onclick = () => {
                cepModeBtn.classList.add('active');
                routedModeBtn.classList.remove('active');
                cepContent.classList.remove('hidden');
                routedContent.classList.add('hidden');
                
                // Limpa o mapa ao voltar para CEP para não misturar visualmente
                simulateMarkersLayer.clearLayers();
                simulateRouteLayer.clearLayers();
                window.currentSimulatedPoints = null;
                ajustarMapaSimulacao(); 
            };
            routedModeBtn.onclick = () => {
                routedModeBtn.classList.add('active');
                cepModeBtn.classList.remove('active');
                routedContent.classList.remove('hidden');
                cepContent.classList.add('hidden');
                carregarOpcoesRotasSimulacao();
            };
        }

        // Vincula o botão "Calcular Rota" para disparar o ajuste manual se necessário
        const calcBtn = document.querySelector('#simulate-route-view .simulate-config-panel .btn-primary');
        if (calcBtn && !calcBtn.dataset.listener) {
            calcBtn.addEventListener('click', async () => {
                // Reprocessa os CEPs que já estiverem preenchidos ao abrir a tela.
                const originInputAtual = document.getElementById('simulate-origin-cep');
                if (originInputAtual?.value) {
                    await lidarComInputCepSimulacao({ target: originInputAtual }, 'origin');
                }

                const stopInputs = document.querySelectorAll('#simulate-stops-container input[id^=\"simulate-stop\"][id$=\"-cep\"]');
                for (const input of stopInputs) {
                    if (input.value) {
                        const tipo = input.id.replace('simulate-', '').replace('-cep', '');
                        await lidarComInputCepSimulacao({ target: input }, tipo);
                    }
                }

                await ajustarMapaSimulacao();
            });
            calcBtn.dataset.listener = "true";
        }

        // Configura o botão "Abrir no Google Maps"
        const openMapsBtn = document.getElementById('simulate-open-maps-btn');
        if (openMapsBtn && !openMapsBtn.dataset.listener) {
            openMapsBtn.addEventListener('click', () => {
                if (!window.currentSimulatedPoints || window.currentSimulatedPoints.length < 2) {
                    mostrarAviso("Calcule uma rota primeiro para abrir no Maps.");
                    return;
                }
                // A sequência em currentSimulatedPoints já respeita a ordem CD -> Paradas (Roteirizado)
                // ou Origem -> Paradas na sequência informada (CEP)
                const points = window.currentSimulatedPoints;
                const origin = `${points[0].lat},${points[0].lng}`;
                const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
                
                let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
                if (points.length > 2) {
                    const waypoints = points.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
                    url += `&waypoints=${encodeURIComponent(waypoints)}`;
                }
                window.open(url, "_blank");
            });
            openMapsBtn.dataset.listener = "true";
        }

        initSimulateOptionsListeners();
    });
}

const backToDashboardFromNewHistoryBtn = document.getElementById('back-to-dashboard-from-new-history-btn');
const backToDashboardFromProgramacaoBtn = document.getElementById('back-to-dashboard-from-programacao-btn');
const backToDashboardFromSimulateBtn = document.getElementById('back-to-dashboard-from-simulate-btn');

if (openGerencialBtn) {
    openGerencialBtn.addEventListener('click', () => {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioPodeVisualizar('Gerencial')) {
            mostrarAviso("⛔ Acesso restrito. Você não possui permissão para acessar a Área Gerencial.");
            return;
        }
        if (!gerencialView || !controlPanelView) return;
        mostrarSomenteView(gerencialView);
        document.querySelector('.app').classList.add('panel-active');
        aplicarPermissoesNaInterface();
    });
}

if (backToControlPanelFromGerencialBtn) {
    backToControlPanelFromGerencialBtn.addEventListener('click', () => {
        if (!controlPanelView) return;
        mostrarSomenteView(controlPanelView);
        document.querySelector('.app').classList.add('panel-active');
        carregarDashboard();
    });
}

const backToGerencialFromUsuariosBtn = document.getElementById('back-to-gerencial-from-usuarios-btn');

function abrirTelaGerenciarUsuarios(event) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_usuarios')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar usuários.');
        return;
    }
    event?.preventDefault();
    event?.stopPropagation();

    if (!gerenciarUsuariosView) {
        console.error('Rota Sirius: #gerenciar-usuarios-view não encontrado no HTML.');
        mostrarAviso('Não foi possível abrir a tela de Gerenciar Usuários.');
        return;
    }

    mostrarSomenteView(gerenciarUsuariosView);
    document.querySelector('.app')?.classList.add('panel-active');

    const origem = document.getElementById('user-display-gerencial');
    const destino = document.getElementById('user-display-gerenciar-usuarios');
    if (origem && destino) destino.innerHTML = origem.innerHTML;

    carregarUsuarios();
    carregarKams();
    aplicarPermissoesNaInterface();
}

if (backToGerencialFromUsuariosBtn) {
    backToGerencialFromUsuariosBtn.addEventListener('click', () => {
        mostrarSomenteView(gerencialView);
        aplicarPermissoesNaInterface();
    });
}

window.abrirTelaPermissoes = async function(event) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_permissoes')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar permissões.');
        return;
    }
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!permissoesView) {
        console.error('Rota Sirius: #permissoes-view não encontrado no HTML.');
        mostrarAviso('Não foi possível abrir a tela de Permissões.');
        return;
    }

    mostrarSomenteView(permissoesView);
    document.querySelector('.app')?.classList.add('panel-active');

    // A tela de permissões deve sempre trabalhar com os usuários vindos do Supabase.
    // Assim o dataset usado pelo botão Salvar contém o UUID real de usuarios.id.
    await carregarUsuarios();
    renderizarPermissoes();
    atualizarPerfilPermissoes();
};

document.querySelectorAll('[data-gerencial-placeholder]').forEach(card => {
    card.addEventListener('click', (event) => {
        const destino = card.dataset.gerencialPlaceholder;
        if (destino === 'Permissões') {
            abrirTelaPermissoes(event);
            return;
        }
        if (destino === 'Limites de Retirada') {
            abrirTelaLimitesRetirada(event);
            return;
        }
        if (destino === 'Gerenciar Usuários') {
            abrirTelaGerenciarUsuarios(event);
            return;
        }
        mostrarAviso(`${destino} será implementado na próxima etapa.`);
    });
});

if (backToGerencialFromPermissoesBtn) {
    backToGerencialFromPermissoesBtn.addEventListener('click', () => {
        mostrarSomenteView(gerencialView);
        aplicarPermissoesNaInterface();
    });
}

if (backToGerencialFromLimitesBtn) {
    backToGerencialFromLimitesBtn.addEventListener('click', () => {
        mostrarSomenteView(gerencialView);
        aplicarPermissoesNaInterface();
    });
}

if (limitePadraoMinus) {
    limitePadraoMinus.addEventListener('click', () => {
        const atual = Number(limitePadraoInput?.value || 1);
        if (limitePadraoInput) limitePadraoInput.value = Math.max(1, atual - 1);
    });
}
if (limitePadraoPlus) {
    limitePadraoPlus.addEventListener('click', () => {
        const atual = Number(limitePadraoInput?.value || 1);
        if (limitePadraoInput) limitePadraoInput.value = Math.min(999, atual + 1);
    });
}
if (salvarLimitePadraoBtn) salvarLimitePadraoBtn.addEventListener('click', salvarLimitePadraoRetirada);
if (adicionarExcecaoLimiteBtn) adicionarExcecaoLimiteBtn.addEventListener('click', () => abrirModalExcecaoLimite());
if (limiteExcecaoModal) {
    const closeBtn = limiteExcecaoModal.querySelector('.close-button');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(limiteExcecaoModal));
}
if (limiteExcecaoForm) {
    limiteExcecaoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) return;
        const id = limiteExcecaoId?.value || '';
        const data = limiteExcecaoData?.value || '';
        const limite = Math.max(1, Math.min(999, Number(limiteExcecaoValor?.value || 0)));
        if (!data || !limite) {
            mostrarAviso('Informe uma data e um limite válido.');
            return;
        }
        try {
            const payload = { data, limite };
            const result = id
                ? await supabaseClient.from('limites_retirada_excecoes').update(payload).eq('id', id)
                : await supabaseClient.from('limites_retirada_excecoes').insert([payload]);
            if (result.error) {
                if (result.error.code === '23505') {
                    mostrarAviso('Já existe uma exceção cadastrada para essa data.');
                } else {
                    console.error('Erro ao salvar exceção:', result.error);
                    mostrarAviso('Não foi possível salvar a exceção.');
                }
                return;
            }
            closeModal(limiteExcecaoModal);
            limiteExcecaoForm.reset();
            if (limiteExcecaoId) limiteExcecaoId.value = '';
            await carregarLimitesRetirada();
        } catch (error) {
            console.error('Erro inesperado ao salvar exceção:', error);
            mostrarAviso('Não foi possível salvar a exceção.');
        }
    });
}

function atualizarPerfilPermissoes() {
    const origem = document.getElementById('user-display-panel') || document.getElementById('user-display-gerencial');
    const destino = document.getElementById('user-display-permissoes');
    if (origem && destino) destino.innerHTML = origem.innerHTML;
}


function obterDataLocalISO(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
    if (!dataISO) return '—';
    const [ano, mes, dia] = String(dataISO).split('-');
    return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataISO;
}

async function obterLimitePadraoRetirada() {
    const { data, error } = await supabaseClient
        .from('configuracao_limite_retirada')
        .select('limite_padrao')
        .eq('id', 1)
        .maybeSingle();
    if (error) throw error;
    return Number(data?.limite_padrao || 4);
}

async function obterLimiteRetiradaParaData(dataISO) {
    const [padrao, excecao] = await Promise.all([
        obterLimitePadraoRetirada(),
        supabaseClient.from('limites_retirada_excecoes').select('id,data,limite').eq('data', dataISO).maybeSingle()
    ]);
    if (excecao.error) throw excecao.error;
    return { limite: Number(excecao.data?.limite ?? padrao), excecao: excecao.data || null, padrao };
}

async function contarRetiradasProgramadas(dataISO, rotaIdIgnorar = null) {
    const { data: rotas, error: errRotas } = await supabaseClient
        .from('rotas')
        .select('id')
        .eq('status', 'ativa')
        .eq('data', dataISO);
    if (errRotas) throw errRotas;

    const rotaIds = (rotas || []).map(r => r.id).filter(id => String(id) !== String(rotaIdIgnorar || ''));
    if (!rotaIds.length) return 0;

    const { data: nfs, error: errNfs } = await supabaseClient
        .from('nfs')
        .select('id')
        .eq('uf', 'RT')
        .in('rota_id', rotaIds);
    if (errNfs) throw errNfs;
    return (nfs || []).length;
}

async function verificarLimiteRetiradaNaRota(dataRota, quantidadeNova = 1, rotaIdIgnorar = null) {
    if (!dataRota || quantidadeNova <= 0) return { permitido: true };
    const { limite, excecao } = await obterLimiteRetiradaParaData(dataRota);
    const usadas = await contarRetiradasProgramadas(dataRota, rotaIdIgnorar);
    const permitido = usadas + quantidadeNova <= limite;
    return { permitido, limite, usadas, restante: Math.max(0, limite - usadas), excecao };
}

async function carregarResumoLimiteRetirada() {
    const dataHoje = obterDataLocalISO();
    const dataElem = document.getElementById('limite-resumo-data');
    const limiteElem = document.getElementById('limite-resumo-limite');
    const usadasElem = document.getElementById('limite-resumo-usadas');
    const barra = document.getElementById('limite-progress-bar');
    const fracao = document.getElementById('limite-resumo-fracao');
    const restanteElem = document.getElementById('limite-resumo-restante');
    if (!limiteElem) return;

    try {
        const { limite } = await obterLimiteRetiradaParaData(dataHoje);
        const usadas = await contarRetiradasProgramadas(dataHoje);
        const restante = Math.max(0, limite - usadas);
        const percentual = limite > 0 ? Math.min(100, (usadas / limite) * 100) : 0;
        if (dataElem) dataElem.innerText = `${formatarDataBR(dataHoje)} (Hoje)`;
        limiteElem.innerText = limite;
        usadasElem.innerText = usadas;
        if (barra) barra.style.width = `${percentual}%`;
        if (fracao) fracao.innerText = `${usadas} / ${limite}`;
        if (restanteElem) restanteElem.innerText = restante > 0 ? `Ainda pode programar ${restante} NF${restante === 1 ? '' : 's'}.` : 'Limite atingido para hoje.';
    } catch (error) {
        console.error('Erro ao carregar resumo do limite de retirada:', error);
        if (dataElem) dataElem.innerText = 'Não foi possível carregar';
        if (restanteElem) restanteElem.innerText = 'Verifique a configuração no Supabase.';
    }
}

async function carregarLimitesRetirada() {
    if (!limitesRetiradaView) return;
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar os limites de retirada.');
        return;
    }
    try {
        const limitePadrao = await obterLimitePadraoRetirada();
        if (limitePadraoInput) limitePadraoInput.value = limitePadrao;

        const { data, error } = await supabaseClient
            .from('limites_retirada_excecoes')
            .select('id,data,limite')
            .order('data', { ascending: true });
        if (error) throw error;

        const body = document.getElementById('limites-excecoes-body');
        const empty = document.getElementById('limites-excecoes-empty');
        if (body) body.innerHTML = '';
        if (!data || data.length === 0) {
            empty?.classList.remove('hidden');
        } else {
            empty?.classList.add('hidden');
            data.forEach(excecao => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatarDataBR(excecao.data)}</td>
                    <td>${excecao.limite}</td>
                    <td><div class="limite-action-group">
                        <button type="button" class="btn btn-outline limite-action-btn" onclick="editarExcecaoLimite('${excecao.id}','${excecao.data}',${excecao.limite})">Editar</button>
                        <button type="button" class="btn btn-outline limite-action-btn delete" onclick="excluirExcecaoLimite('${excecao.id}')">Excluir</button>
                    </div></td>`;
                body?.appendChild(tr);
            });
        }
        await carregarResumoLimiteRetirada();
    } catch (error) {
        console.error('Erro ao carregar limites de retirada:', error);
        mostrarAviso('Não foi possível carregar os limites de retirada. Execute o SQL de configuração no Supabase.');
    }
}

async function salvarLimitePadraoRetirada() {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) return;
    const novoLimite = Math.max(1, Math.min(999, Number(limitePadraoInput?.value || 0)));
    if (!novoLimite) {
        mostrarAviso('Informe um limite válido.');
        return;
    }
    const atual = await obterLimitePadraoRetirada();
    const salvar = async () => {
        const { error } = await supabaseClient
            .from('configuracao_limite_retirada')
            .upsert({ id: 1, limite_padrao: novoLimite }, { onConflict: 'id' });
        if (error) {
            console.error('Erro ao salvar limite padrão:', error);
            mostrarAviso('Não foi possível salvar o limite padrão.');
            if (limitePadraoInput) limitePadraoInput.value = atual;
            return;
        }
        if (limitePadraoInput) limitePadraoInput.value = novoLimite;
        mostrarAviso(`Limite padrão atualizado para ${novoLimite} retiradas por dia.`);
        await carregarResumoLimiteRetirada();
    };

    if (novoLimite > atual) {
        confirmarAcao(`Tem certeza que deseja aumentar o limite padrão diário de ${atual} para ${novoLimite} retiradas? Essa alteração será usada automaticamente nos dias sem exceção.`, salvar);
    } else if (novoLimite < atual) {
        await salvar();
    } else {
        if (limitePadraoInput) limitePadraoInput.value = atual;
    }
}

function abrirModalExcecaoLimite(id = '', data = '', limite = '') {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar os limites de retirada.');
        return;
    }
    if (limiteExcecaoModalTitle) limiteExcecaoModalTitle.innerText = id ? 'Editar Exceção' : 'Adicionar Exceção';
    if (limiteExcecaoId) limiteExcecaoId.value = id;
    if (limiteExcecaoData) limiteExcecaoData.value = data || obterDataLocalISO();
    if (limiteExcecaoValor) limiteExcecaoValor.value = limite || 4;
    openModal(limiteExcecaoModal);
}

window.editarExcecaoLimite = function(id, data, limite) {
    abrirModalExcecaoLimite(id, data, limite);
};

window.excluirExcecaoLimite = function(id) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar os limites de retirada.');
        return;
    }
    confirmarAcao('Tem certeza que deseja excluir esta exceção? O dia voltará a usar o limite padrão.', async () => {
        const { error } = await supabaseClient.from('limites_retirada_excecoes').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir exceção:', error);
            mostrarAviso('Não foi possível excluir a exceção.');
            return;
        }
        await carregarLimitesRetirada();
    });
};

window.abrirTelaLimitesRetirada = function(event) {
    if (!usuarioPodeAcao('Gerencial', 'gerenciar_limites')) {
        mostrarAviso('⛔ Você não possui permissão para gerenciar os limites de retirada.');
        return;
    }
    event?.preventDefault();
    event?.stopPropagation();
    mostrarSomenteView(limitesRetiradaView);
    document.querySelector('.app')?.classList.add('panel-active');
    const origem = document.getElementById('user-display-gerencial') || document.getElementById('user-display-panel');
    const destino = document.getElementById('user-display-limites-retirada');
    if (origem && destino) destino.innerHTML = origem.innerHTML;
    carregarLimitesRetirada();
};

async function validarLimiteAoAdicionarNFRetirada(nfId, rotaId) {
    const { data: nf, error: nfError } = await supabaseClient.from('nfs').select('id,uf,rota_id').eq('id', nfId).single();
    if (nfError) throw nfError;
    if (nf?.uf !== 'RT') return { permitido: true };

    const { data: rota, error: rotaError } = await supabaseClient.from('rotas').select('id,data,status').eq('id', rotaId).single();
    if (rotaError) throw rotaError;
    if (!rota?.data || rota.status !== 'ativa') return { permitido: true };
    if (String(nf.rota_id || '') === String(rotaId)) return { permitido: true };

    // Mover uma NF entre duas rotas da mesma data não aumenta o consumo diário.
    let quantidadeNova = 1;
    if (nf.rota_id) {
        const { data: rotaOrigem, error: origemError } = await supabaseClient.from('rotas').select('id,data,status').eq('id', nf.rota_id).maybeSingle();
        if (origemError) throw origemError;
        if (rotaOrigem?.status === 'ativa' && rotaOrigem?.data === rota.data) quantidadeNova = 0;
    }

    if (quantidadeNova === 0) return { permitido: true };
    return await verificarLimiteRetiradaNaRota(rota.data, quantidadeNova);
}

if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        // Este botão é do Painel de Controle
        // Garante que o dashboard seja exibido e o painel de controle oculto
        if (dashboardView && controlPanelView) {
            controlPanelView.classList.add('hidden');
            if (gerencialView) gerencialView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            document.querySelector('.app').classList.remove('panel-active');
            carregarTudo(); // Garante que os dados estejam atualizados ao voltar
        }
    });
}

if (backToDashboardFromProgramacaoBtn) {
    backToDashboardFromProgramacaoBtn.addEventListener('click', () => {
        // Este botão é da Programação
        if (dashboardView && programacaoView) {
            programacaoView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            document.querySelector('.app').classList.remove('panel-active');
            carregarTudo(); // Garante que os dados estejam atualizados ao voltar
        }
    });
}

if (backToDashboardFromNewHistoryBtn) {
    backToDashboardFromNewHistoryBtn.addEventListener('click', () => {
        // Este botão é do Novo Histórico
        if (dashboardView && newHistoryView) {
            newHistoryView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            document.querySelector('.app').classList.remove('panel-active');
            carregarTudo();
        }
    });
}

if (backToDashboardFromSimulateBtn) {
    backToDashboardFromSimulateBtn.addEventListener('click', () => {
        simulateRouteView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        document.querySelector('.app').classList.remove('panel-active');
        carregarTudo();
    });
}

if (openRotaModalFromProgBtn) {
    openRotaModalFromProgBtn.addEventListener('click', () => {
        if (rotaModalTitle) rotaModalTitle.innerText = "Adicionar Nova Rota";
        if (rotaIdHidden) rotaIdHidden.value = "";
        openModal(createRotaModal);
    });
}

if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!usuarioPodeAcao('Gerencial', 'gerenciar_usuarios')) {
            mostrarAviso('⛔ Você não possui permissão para gerenciar usuários.');
            return;
        }
        const id = userIdHidden ? userIdHidden.value : "";
        const email = document.getElementById('user-email').value.trim();

        const nome = document.getElementById('user-nome').value.trim();
        const sobrenome = document.getElementById('user-sobrenome').value.trim();
        const senha = document.getElementById('user-password').value;
        const cargo = document.getElementById('user-cargo').value.trim();
        const permissao = document.getElementById('user-permissao').value;

        const userData = {
            nome: nome,
            sobrenome: sobrenome,
            email: email,
            senha: senha,
            cargo: cargo,
            permissao: permissao,
        };

        console.log("Tentando salvar usuário:", userData);

        try {
            let result;
            if (id) {
                // Modo Edição
                console.log("Atualizando usuário:", userData);
                result = await supabaseClient.from("usuarios").update(userData).eq("id", id).select();
            } else {
                // Modo Criação
                userData.status = "Ativo";
                result = await supabaseClient.from("usuarios").insert([userData]).select();
            }

            const { data, error } = result;
            
            if (id) {
                console.log("Resposta update usuário:", data, error);
            } else {
                console.log("Resposta salvamento usuário:", data, error);
            }

            if (error) {
                console.error("Erro ao salvar no Supabase:", error);
                
                // Tratamento de e-mail duplicado comum no Supabase (código 23505)
                if (error.code === '23505') {
                    mostrarAviso("Este e-mail já está cadastrado no sistema.");
                } else {
                    mostrarAviso("Erro ao salvar usuário no servidor: " + error.message);
                }
                return; // Não fecha o modal nem limpa campos
            } else {
                console.log("Usuário persistido com sucesso");

                // Sincronização se for o usuário logado (Tarefa 3 e 5)
                const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
                if (usuarioLogado && id && usuarioLogado.id == id) {
                    console.log("Usuário logado antes:", usuarioLogado);
                    const usuarioAtualizado = { ...usuarioLogado, ...userData };
                    localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
                    console.log("Usuário logado depois:", usuarioAtualizado);
                    exibirUsuarioLogado();
                }

                await carregarUsuarios();
            }
        } catch (err) {
            console.error("Erro inesperado:", err);
        }

        closeModal(createUserModal);
        createUserForm.reset();
        if (userIdHidden) userIdHidden.value = "";
    });
}

// Event Listeners para abrir modais
if (openNfModalBtn) {
  openNfModalBtn.addEventListener('click', () => {
    if (!usuarioPodeAcao('Roteirização', 'adicionar_nf')) {
      mostrarAviso('⛔ Você não possui permissão para adicionar NF.');
      return;
    }
    if (nfModalTitle) nfModalTitle.innerText = "Adicionar Nova NF";
    if (nfIdHidden) nfIdHidden.value = "";
    if (createNfForm) createNfForm.reset();
    if (nfQuantidadeInput) nfQuantidadeInput.value = "";
    if (nfMarcaInput) nfMarcaInput.value = "";
    if (nfPotenciaInput) nfPotenciaInput.value = "";
    if (nfKamInput) nfKamInput.value = "";
    carregarKams(); // Atualiza dropdown ao abrir

    const podeTransporte = usuarioPodeTransportar();
    const podeRetirada = usuarioPodeRetirar();

    if (btnTransporte) {
      btnTransporte.classList.toggle('hidden', !podeTransporte);
      btnTransporte.disabled = !podeTransporte;
    }
    if (btnRetira) {
      btnRetira.classList.toggle('hidden', !podeRetirada);
      btnRetira.disabled = !podeRetirada;
    }

    if (podeTransporte && btnTransporte) {
      btnTransporte.click();
    } else if (podeRetirada && btnRetira) {
      btnRetira.click();
    } else {
      mostrarAviso('⛔ Você não possui permissão para Transporte ou Retirada.');
      return;
    }

    openModal(createNfModal);
  });
}
// Modal de resultado do Leitor DOC (elemento real em index.html:
// #leitor-doc-modal / #leitor-doc-content, mesmo padrão .modal-overlay
// / .modal-content / .close-button dos demais modais do sistema).
let leitorDocUltimoResultado = null;
let leitorDocResultados = [];
let leitorDocIndiceAtual = null;
let leitorDocFilaCarregada = false;

async function carregarFilaLeitorDoc() {
  if (typeof supabaseClient === 'undefined') {
    console.error('Leitor DOC: supabaseClient não está disponível.');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('leitor_doc_fila')
      .select('*')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('Leitor DOC: erro ao carregar fila:', error);
      mostrarAviso('Erro ao carregar a fila do Leitor DOC.');
      return;
    }

    leitorDocResultados = (data || []).map(item => ({
      id: item.id,
      arquivo: `NF ${item.numero_nf || 'Sem número'}`,
      dados: {
        numero_nf: item.numero_nf || '',
        tipo_operacao: item.tipo_operacao || '',
        cep: item.cep || '',
        cidade: item.cidade || '',
        uf: item.uf || '',
        endereco: item.endereco || '',
        numero: item.numero || '',
        quantidade: item.quantidade ?? '',
        marca: item.marca || '',
        potencia: item.potencia || '',
        kam: item.kam || '',
        observacao: item.observacao || ''
      }
    }));

    leitorDocFilaCarregada = true;

    console.log(
      'Leitor DOC: fila carregada:',
      leitorDocResultados
    );

  } catch (error) {
    console.error('Leitor DOC: erro inesperado ao carregar fila:', error);
  }
}

function abrirModalLeitorDoc(dados, mostrarVoltar = false, indice = null) {
  leitorDocUltimoResultado = dados;
  leitorDocIndiceAtual = indice;
  const modal = document.getElementById('leitor-doc-modal');
  const content = document.getElementById('leitor-doc-content');
  if (!modal || !content) return;

  const campo = (label, valor) => `
    <div>
      <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">${label}</label>
      <div style="font-weight: 500;">${valor || '---'}</div>
    </div>
  `;

  let html = '';
  if (mostrarVoltar) {
    html += `<button type="button" id="btn-voltar-lista-leitor-doc" class="btn btn-outline" style="margin-bottom: 16px;">← Voltar para a lista</button>`;
  }

  html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">`;
  html += campo('Número da NF', dados.numero_nf);
  html += campo('Tipo de Operação', dados.tipo_operacao);
  html += campo('CEP', dados.cep);
  html += campo('Cidade', dados.cidade);
  html += campo('UF', dados.uf);
  html += campo('Endereço', dados.endereco);
  html += campo('Número', dados.numero);
  html += campo('Quantidade', dados.quantidade);
  html += campo('Marca', dados.marca);
  html += campo('Potência', dados.potencia);
  html += campo('KAM', dados.kam);

  if (dados.observacao) {
    html += `
      <div style="grid-column: span 2; margin-top: 10px; padding: 16px; background: rgba(30, 41, 59, 0.4); border-radius: 12px; border: 1px solid var(--border);">
        <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Observação</label>
        <div>${dados.observacao}</div>
      </div>
    `;
  }

  html += `</div>`;
  content.innerHTML = html;

  const btnVoltar = document.getElementById('btn-voltar-lista-leitor-doc');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => mostrarListaLeitorDoc());
  }

  openModal(modal);
}

// Lista das NFs encontradas quando mais de um PDF é processado de uma vez.
// Itens com erro ficam visíveis (informando o arquivo), mas não são clicáveis.
function mostrarListaLeitorDoc() {
  const modal = document.getElementById('leitor-doc-modal');
  const content = document.getElementById('leitor-doc-content');
  if (!modal || !content) return;

  if (!leitorDocResultados.length) {
    content.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum PDF processado.</p>`;
    openModal(modal);
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;

  leitorDocResultados.forEach((item, index) => {
    if (item.erro) {
      html += `
        <div style="padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: rgba(239, 68, 68, 0.08);">
          <div style="font-weight: 600; color: #ef4444;">${item.arquivo}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${item.erro}</div>
        </div>
      `;
    } else {
      const numero = item.dados.numero_nf || 'Sem número identificado';
      html += `
        <button type="button" class="btn btn-outline leitor-doc-item" data-index="${index}" style="text-align: left; width: 100%; margin-top: 0;">
          <div style="font-weight: 700;">NF ${numero}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${item.arquivo}</div>
        </button>
      `;
    }
  });

  html += `</div>`;
  content.innerHTML = html;

  content.querySelectorAll('.leitor-doc-item').forEach((botao) => {
    botao.addEventListener('click', () => {
      const idx = parseInt(botao.dataset.index, 10);
      const item = leitorDocResultados[idx];
      if (item && !item.erro) {
        abrirModalLeitorDoc(item.dados, true, idx);
      }
    });
  });

  openModal(modal);
}

if (btnLerDocs) {
  btnLerDocs.addEventListener('click', async () => {
    // Fila compartilhada: consulta a tabela leitor_doc_fila no Supabase antes de
    // decidir entre reabrir a lista existente ou abrir o seletor de arquivos,
    // para que a fila fique visível em qualquer navegador (não só no que processou o PDF).
    await carregarFilaLeitorDoc();

    if (leitorDocResultados.length) {
      mostrarListaLeitorDoc();
      return;
    }

    // Seleciona um ou mais PDFs e envia cada um individualmente para a API.
    const inputLerDoc = document.createElement('input');
    inputLerDoc.type = 'file';
    inputLerDoc.accept = 'application/pdf';
    inputLerDoc.multiple = true;

    inputLerDoc.addEventListener('change', async () => {
      const arquivos = Array.from(inputLerDoc.files || []);
      if (!arquivos.length) return;

      leitorDocResultados = [];

      for (const arquivoPdf of arquivos) {
        const formData = new FormData();
        formData.append('file', arquivoPdf);

        try {
          const response = await fetch('https://leitor-docs.vercel.app/upload', {
            method: 'POST',
            body: formData
          });
          const resultado = await response.json();
          console.log('Leitor DOC - resultado:', arquivoPdf.name, resultado);

          if (!response.ok || resultado.erro) {
            leitorDocResultados.push({
              arquivo: arquivoPdf.name,
              erro: resultado.erro || 'Não foi possível ler o PDF.'
            });
                   } else {
            // Salva a NF na fila compartilhada do Leitor DOC
            const { data: filaInserida, error: filaError } = await supabaseClient
              .from('leitor_doc_fila')
              .insert([{
                numero_nf: resultado.numero_nf || '',
                tipo_operacao: resultado.tipo_operacao || '',
                cep: resultado.cep || '',
                cidade: resultado.cidade || '',
                uf: resultado.uf || '',
                endereco: resultado.endereco || '',
                numero: resultado.numero || '',
                quantidade: resultado.quantidade ?? null,
                marca: resultado.marca || '',
                potencia: resultado.potencia || '',
                kam: resultado.kam || '',
                observacao: resultado.observacao || '',
                status: 'pendente'
              }])
              .select()
              .single();

            if (filaError) {
              console.error('Leitor DOC: erro ao salvar na fila:', filaError);
              leitorDocResultados.push({
                arquivo: arquivoPdf.name,
                erro: 'PDF lido, mas não foi possível salvar a NF na fila compartilhada.'
              });
            } else {
              console.log('Leitor DOC: NF salva na fila:', filaInserida);

              leitorDocResultados.push({
                id: filaInserida.id,
                arquivo: arquivoPdf.name,
                dados: resultado
              });
            }
          }
        } catch (error) {
          console.error('Leitor DOC - erro ao enviar o PDF:', arquivoPdf.name, error);
          leitorDocResultados.push({
            arquivo: arquivoPdf.name,
            erro: 'Erro ao enviar o PDF para o Leitor DOC.'
          });
        }
      }

      mostrarListaLeitorDoc();
    });

    inputLerDoc.click();
  });
}
if (openRotaModalBtn) {
  openRotaModalBtn.addEventListener('click', () => {
    if (!usuarioPodeAcao('Roteirização', 'criar_rota')) {
      mostrarAviso('⛔ Você não possui permissão para criar rota.');
      return;
    }
    if (rotaModalTitle) rotaModalTitle.innerText = "Adicionar Nova Rota";
    if (rotaIdHidden) rotaIdHidden.value = "";
    if (rotaNomeInput) rotaNomeInput.value = "";
    if (rotaDataInput) rotaDataInput.value = "";
    openModal(createRotaModal);
  });
} else {
  console.warn('openRotaModalBtn não encontrado.');
}
if (openHistoryBtn) {
  openHistoryBtn.addEventListener('click', () => { 
      if (dashboardView && controlPanelView && programacaoView && newHistoryView) {
          dashboardView.classList.add('hidden');
          controlPanelView.classList.add('hidden');
          programacaoView.classList.add('hidden');
          newHistoryView.classList.remove('hidden');
          document.querySelector('.app').classList.add('panel-active');
          toggleNewHistoryViewMode(currentNewHistoryViewMode);
      }
  });
}


// Lógica de alternância do tipo de NF (Transporte/Retira)
if (btnTransporte && btnRetira && nfTipoInput) {
  btnTransporte.addEventListener('click', () => {
    if (!usuarioPodeTransportar()) {
      mostrarAviso('⛔ Você não possui permissão para NF de Transporte.');
      return;
    }
    nfTipoInput.value = 'transporte';
    btnTransporte.classList.add('active');
    btnRetira.classList.remove('active');
    
    // Habilitar campos de endereço para Transporte
    if (nfCepInput) nfCepInput.disabled = false;
    if (nfCidadeInput) { nfCidadeInput.disabled = false; nfCidadeInput.required = true; }
    if (nfUfInput) { nfUfInput.disabled = false; nfUfInput.required = true; }
    if (nfEnderecoInput) nfEnderecoInput.disabled = false;
    if (nfEnderecoNumeroInput) nfEnderecoNumeroInput.disabled = false;
    if (nfValorInput) { nfValorInput.disabled = false; nfValorInput.required = true; }
  });

  btnRetira.addEventListener('click', () => {
    if (!usuarioPodeRetirar()) {
      mostrarAviso('⛔ Você não possui permissão para NF de Retirada.');
      return;
    }
    nfTipoInput.value = 'retira';
    btnRetira.classList.add('active');
    btnTransporte.classList.remove('active');
    
    // Desabilitar campos de endereço para Retira e limpar valores
    if (nfCepInput) { nfCepInput.disabled = true; nfCepInput.value = ''; }
    if (nfCidadeInput) { nfCidadeInput.disabled = true; nfCidadeInput.value = ''; nfCidadeInput.required = false; }
    if (nfUfInput) { nfUfInput.disabled = true; nfUfInput.value = ''; nfUfInput.required = false; }
    if (nfEnderecoInput) { nfEnderecoInput.disabled = true; nfEnderecoInput.value = ''; }
    if (nfEnderecoNumeroInput) { nfEnderecoNumeroInput.disabled = true; nfEnderecoNumeroInput.value = ''; }
    
    if (nfValorInput) { nfValorInput.disabled = true; nfValorInput.value = '0'; nfValorInput.required = false; }
  });
}

// --- NOTAS FISCAIS (NF) E ROTAS: CRIAR, EDITAR, LISTAR ---
// SALVAR NF (UNIFICADO)
async function handleSalvarNF(fecharAoSalvar = true) {
    if (!usuarioPodeAcao('Roteirização', 'adicionar_nf')) { mostrarAviso('⛔ Você não possui permissão para adicionar NF.'); return; }
  console.log('handleSalvarNF: Função chamada. Fechar:', fecharAoSalvar);

  if (typeof supabaseClient === 'undefined') {
    console.error('handleSalvarNF: Cliente supabaseClient não está definido.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  // Adicionado verificação para nfNumeroInput etc. para evitar erro se forem nulos
  const nfId = nfIdHidden ? nfIdHidden.value : '';
  const numero = nfNumeroInput ? nfNumeroInput.value.trim() : '';
  // TAREFA: Limpa o CEP (remove o traço) para processamento interno/banco
  const cep = nfCepInput ? nfCepInput.value.replace(/\D/g, '') : '';
  const cidade = nfCidadeInput ? nfCidadeInput.value.trim() : '';
  const endereco = nfEnderecoInput ? nfEnderecoInput.value.trim() : '';
  const numero_endereco = nfEnderecoNumeroInput ? nfEnderecoNumeroInput.value.trim() : '';
  const uf = nfUfInput ? nfUfInput.value.trim().toUpperCase() : '';
  const tipo = nfTipoInput ? nfTipoInput.value : 'transporte';

  // Transporte e Retirada são permissões independentes.
  if (tipo === 'transporte' && !usuarioPodeTransportar()) {
    mostrarAviso('⛔ Você não possui permissão para adicionar NF de Transporte.');
    return;
  }
  if (tipo === 'retira' && !usuarioPodeRetirar()) {
    mostrarAviso('⛔ Você não possui permissão para adicionar NF de Retirada.');
    return;
  }

  const valor = (nfValorInput && nfValorInput.value) ? parseFloat(nfValorInput.value) : 0;
  const observacao = nfObsInput ? nfObsInput.value.trim() : '';
  const qtd = nfQuantidadeInput ? nfQuantidadeInput.value : '';
  const marca = nfMarcaInput ? nfMarcaInput.value.trim() : '';
  const potencia = nfPotenciaInput ? nfPotenciaInput.value.trim() : '';
  const kam = nfKamInput ? nfKamInput.value.trim() : '';

  // Validação básica
  if (!numero) {
    mostrarAviso("Por favor, preencha o número da NF.");
    return;
  }

  // Validação condicional baseada no tipo
  if (tipo === 'transporte' && (!cidade || !uf || isNaN(valor))) {
    mostrarAviso("Por favor, preencha todos os campos (Cidade, UF e Valor) para NFs de Transporte.");
    return;
  }

  try {
    // TAREFA 1, 2 e 3: Verificar duplicidade de NF (ignorando a própria se for edição)
    // O número da NF já está limpo (trim) na variável 'numero' definida acima.
    let checkQuery = supabaseClient.from("nfs").select("id").eq("numero", numero);
    if (nfId) checkQuery = checkQuery.neq("id", nfId);
    
    const { data: existingNfs, error: checkError } = await checkQuery;
    if (checkError) console.error('Erro ao validar duplicidade:', checkError);
    if (existingNfs && existingNfs.length > 0) {
      mostrarAviso("Já existe uma NF com esse número cadastrada no sistema.");
      return;
    }

    const nfData = {
      numero,
      cep: tipo === 'retira' ? '' : cep,
      cidade: tipo === 'retira' ? '' : cidade,
      endereco: tipo === 'retira' ? '' : endereco,
      numero_endereco: tipo === 'retira' ? '' : numero_endereco,
      uf: tipo === 'retira' ? 'RT' : uf,
      tipo,
      valor_frete: tipo === 'retira' ? 0 : valor,
      observacao,
      kam,
      marca,
      potencia,
      qtd
    };

    console.log("Objeto NF enviado:", nfData);

    let result;
    if (nfId) {
      // Modo Edição
      result = await supabaseClient.from("nfs").update(nfData).eq("id", nfId).select();
    } else {
      // Modo Criação
      nfData.rota_id = null;
      
      // Tarefa 4: Debug Temporário
      console.log("Nova NF payload:", nfData);

      result = await supabaseClient.from("nfs").insert([nfData]).select();
    }
    const { data, error } = result;
    console.log("Resultado Supabase NF:", data, error);

    if (error) {
      console.error('handleSalvarNF: Erro ao inserir NF no supabaseClient:', error);
      mostrarAviso('Erro ao salvar NF: ' + error.message);
      return;
    }

    console.log('handleCriarNF: NF salva com sucesso:', data);
    
    await carregarTudo();

    if (fecharAoSalvar) {
      closeModal(createNfModal);
    } else {
      // Feedback visual e limpeza para novo cadastro (Tarefa 2, 5 e 6)
      if (createNfForm) createNfForm.reset();
      if (nfIdHidden) nfIdHidden.value = "";
      if (nfQuantidadeInput) nfQuantidadeInput.value = "";
      if (nfMarcaInput) nfMarcaInput.value = "";
      if (nfPotenciaInput) nfPotenciaInput.value = "";
      if (nfKamInput) nfKamInput.value = "";
      
      carregarKams();
      if (btnTransporte) btnTransporte.click();
      
      if (nfNumeroInput) nfNumeroInput.focus();
      mostrarAviso("NF salva com sucesso!");
    }

  } catch (e) {
    console.error('handleSalvarNF: Erro inesperado:', e);
    mostrarAviso('Ocorreu um erro inesperado ao salvar a NF.');
  }
}

// CRIAR ROTA
async function handleCriarRota(event) {
    if (!usuarioPodeAcao('Roteirização', 'criar_rota')) { mostrarAviso('⛔ Você não possui permissão para criar rota.'); return; }
  event.preventDefault(); // Previne o recarregamento da página

  console.log('handleCriarRota: Função chamada.');

  if (typeof supabaseClient === 'undefined') {
    console.error('handleCriarRota: Cliente supabaseClient não está definido. Verifique se supabaseClient.js foi carregado.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  const nome = rotaNomeInput ? rotaNomeInput.value.trim() : '';
  const dataRota = rotaDataInput ? rotaDataInput.value : '';
  const transportadora = rotaTransportadoraInput ? rotaTransportadoraInput.value.trim() : '';
  const rotaId = rotaIdHidden ? rotaIdHidden.value : '';
  console.log('handleCriarRota: Nome da rota coletado:', nome);

  if (!nome || !dataRota) {
    mostrarAviso("Por favor, preencha o nome e a data da rota.");
    console.warn('handleCriarRota: Validação falhou.');
    return;
  }

  try {
    let result;
    if (rotaId) {
      // Modo Edição: uma rota com NFs de Retirada também precisa respeitar o limite da nova data.
      const { data: rotaAtual, error: rotaAtualError } = await supabaseClient.from('rotas').select('id,status,data').eq('id', rotaId).single();
      if (rotaAtualError) throw rotaAtualError;
      if (rotaAtual?.status === 'ativa') {
          const { data: nfsDaRota, error: nfsRotaError } = await supabaseClient.from('nfs').select('id,uf').eq('rota_id', rotaId);
          if (nfsRotaError) throw nfsRotaError;
          const quantidadeRetirada = (nfsDaRota || []).filter(nf => nf.uf === 'RT').length;
          if (quantidadeRetirada > 0) {
              const limiteDestino = await verificarLimiteRetiradaNaRota(dataRota, quantidadeRetirada, rotaId);
              if (!limiteDestino.permitido) {
                  mostrarAviso(`⛔ A data ${formatarDataBR(dataRota)} não comporta as ${quantidadeRetirada} NFs de Retirada desta rota. Limite: ${limiteDestino.limite}.`);
                  return;
              }
          }
      }
      result = await supabaseClient.from("rotas").update({ nome, data: dataRota, transportadora }).eq("id", rotaId).select();
    } else {
      // Modo Criação
      result = await supabaseClient.from("rotas").insert([{ nome, data: dataRota, transportadora }]).select();
    }

    const { data, error } = result;

    if (error) {
      console.error('handleCriarRota: Erro ao salvar Rota no supabaseClient:', error);
      mostrarAviso('Erro ao salvar Rota: ' + error.message);
      return;
    }

    console.log('handleCriarRota: Rota salva/atualizada com sucesso:', data);
    carregarTudo();
    closeModal(createRotaModal);
    if (createRotaForm) { // Verifica se o formulário existe antes de resetar
      createRotaForm.reset();
    }
  } catch (e) {
    console.error('handleCriarRota: Erro inesperado durante a criação da Rota:', e);
    mostrarAviso('Ocorreu um erro inesperado ao criar a Rota.');
  }
}

// Adicionar event listeners para os formulários

// FUNÇÃO DE FILTRO
window.trocarFiltro = function(status) {
  filtroAtual = status;
  const buttons = document.querySelectorAll('.filters button');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(status)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  carregarNFs();
};

// CARREGAR NFs (ESQUERDA)
async function carregarNFs() {
  try {
    if (typeof supabaseClient === 'undefined') return;

    const { data, error } = await supabaseClient
      .from("nfs")
      .select("*")
      .is("rota_id", null)
      .order('created_at', { ascending: false }); // Mostrar as novas primeiro

    if (error || !data) {
      console.error('Erro ao buscar NFs:', error);
      return;
    }

    const container = document.querySelector(".nf-list");
    if (!container) return;
    container.innerHTML = "";

    // Atualizar contadores com segurança
    const total = data.length;
    const transporte = data.filter(n => n.uf !== 'RT').length;
    const retira = data.filter(n => n.uf === 'RT').length;

    if (document.getElementById('count-todos')) document.getElementById('count-todos').innerText = total;
    if (document.getElementById('count-transporte')) document.getElementById('count-transporte').innerText = transporte;
    if (document.getElementById('count-retira')) document.getElementById('count-retira').innerText = retira;

    const termoBusca = searchInput ? searchInput.value.toLowerCase() : "";

    const nfsFiltradas = data.filter(nf => {
      const numeroStr = String(nf.numero || "").toLowerCase();
      const cidadeStr = String(nf.cidade || "").toLowerCase();
      const destinoStr = String(nf.destino || "").toLowerCase(); // Fallback busca
      const correspondeBusca = numeroStr.includes(termoBusca) || cidadeStr.includes(termoBusca) || destinoStr.includes(termoBusca);
      
      if (filtroAtual === 'transporte') return correspondeBusca && nf.uf !== 'RT';
      if (filtroAtual === 'retira') return correspondeBusca && nf.uf === 'RT';
      return correspondeBusca;
    });

    nfsFiltradas.forEach(nf => {
      const div = document.createElement("div");
      div.className = "nf-card";

      const badge = nf.uf === 'RT' ? '<small style="color: #f87171;">[RETIRA]</small>' : '';
      
      // Verifica se a NF possui observação para aplicar o destaque visual
      const temObs = nf.observacao && nf.observacao.trim() !== "";
      const infoStyle = temObs ? 'style="color: #fbbf24; opacity: 1;"' : '';
      const infoTitle = temObs ? "Informações (Possui Observação)" : "Informações";

      div.innerHTML = `
        <div class="nf-actions-top">
          <button class="icon-btn info" title="${infoTitle}" ${infoStyle} onclick="event.stopPropagation(); abrirModalInfoNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>
          <button class="icon-btn edit" title="Editar" onclick="event.stopPropagation(); editarNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
          <button class="icon-btn delete" title="Excluir" onclick="event.stopPropagation(); excluirNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
        <strong>NF ${nf.numero} ${badge}</strong>
        <span>${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</span>
        <small>R$ ${formatar(nf.valor_frete)}</small>
        ${nf.observacao ? `<br><span style="font-size: 11px; font-style: italic; color: var(--text-muted);">Obs: ${nf.observacao}</span>` : ''}
      `;

      div.onclick = () => enviarParaRota(nf.id);
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Erro em carregarNFs:", err);
  }
}

window.abrirModalInfoNF = async function(nfId, readOnly = false) {
    const modal = document.getElementById('nf-info-modal');
    const content = document.getElementById('nf-info-content');
    if (!modal || !content) return;

    const actualReadOnly = !!readOnly;

    // Feedback visual de carregamento (mantido)
    content.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Buscando informações da NF...</p>`;
    openModal(modal);

    try {
        const { data: nf, error } = await supabaseClient
            .from("nfs")
            .select("*")
            .eq("id", nfId)
            .single();

        if (error) throw error;

        const valorFrete = formatar(nf.valor_frete || 0);
        
        // Máscara de CEP para exibição
        let cepExibicao = nf.cep || "";
        if (cepExibicao.length === 8) {
            cepExibicao = cepExibicao.replace(/^(\d{5})(\d)/, '$1-$2');
        }

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="grid-column: span 2; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 4px;">
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Número da NF</label>
                    <div style="font-size: 20px; font-weight: 800; color: var(--primary);">NF ${nf.numero || '---'}</div>
                </div>
                
                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Tipo da Operação</label>
                    <div style="font-weight: 600; text-transform: capitalize;">${nf.tipo || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">KAM</label>
                    <div style="font-weight: 600;">${nf.kam || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Cidade</label>
                    <div style="font-weight: 500;">${nf.cidade || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">UF</label>
                    <div style="font-weight: 500;">${nf.uf || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">CEP</label>
                    <div>${cepExibicao || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Nº do Endereço</label>
                    <div>${nf.numero_endereco || '---'}</div>
                </div>

                <div style="grid-column: span 2;">
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Endereço Completo</label>
                    <div>${nf.endereco || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Quantidade</label>
                    <div>${nf.qtd || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Marca</label>
                    <div>${nf.marca || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Potência</label>
                    <div>${nf.potencia || '---'}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Valor de Frete</label>
                    <div style="color: var(--primary); font-weight: 700;">R$ ${valorFrete}</div>
                </div>

                <div style="grid-column: span 2; margin-top: 10px; padding: 16px; background: rgba(30, 41, 59, 0.4); border-radius: 12px; border: 1px solid var(--border);">
                    <label for="nf-info-observacao" style="display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Observação da NF</label>
                    <textarea id="nf-info-observacao" ${actualReadOnly ? 'readonly' : ''} style="width: 100%; padding: 10px; border: 1px solid var(--border); background: #0f172a; color: var(--text-main); border-radius: 5px; outline: none; resize: vertical; min-height: 80px; font-size: 13px; line-height: 1.6; ${actualReadOnly ? 'cursor: default;' : ''}">${nf.observacao || ''}</textarea>
                    ${!actualReadOnly ? `
                    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                        <button class="btn" style="width: auto; font-size: 11px; height: 32px; background: var(--primary); border-color: var(--primary); color: white;" onclick="salvarObservacaoNF('${nf.id}')">Salvar Observação</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Erro ao carregar detalhes da NF:", err);
        content.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 40px;">Erro ao buscar os dados desta NF no servidor.</p>`;
    }
};

// Nova função para salvar a observação da NF
window.salvarObservacaoNF = async function(nfId) {
    if (!usuarioPodeAcao('Roteirização', 'observacao_nf')) { mostrarAviso('⛔ Você não possui permissão para salvar observações.'); return; }
    const textarea = document.getElementById('nf-info-observacao');
      if (!textarea) return;

    const novaObs = textarea.value.trim();

    try {
        const { error } = await supabaseClient
            .from("nfs")
            .update({ observacao: novaObs })
            .eq("id", nfId);

        if (error) throw error;

        // Fecha o modal
        closeModal(document.getElementById('nf-info-modal'));

        // Atualiza as visualizações (Side list e Rotas ativas)
        await carregarNFs();
        await carregarRotas();
        
        // Se estiver na página de programação, atualiza também para refletir a mudança
        if (programacaoView && !programacaoView.classList.contains('hidden')) {
            await carregarProgramacao();
        }

        // Se estiver na página de histórico, atualiza também para refletir a mudança
        if (newHistoryView && !newHistoryView.classList.contains('hidden')) {
            if (currentNewHistoryViewMode === 'roteirizacao') await carregarNovoHistorico();
            else await carregarNovoHistoricoProgramacao();
        }

        mostrarAviso("Observação da NF salva com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar observação da NF:", err);
        mostrarAviso("Erro ao salvar observação no servidor.");
    }
};

// EDITAR NF
window.editarNF = async function(nfId) {
    if (!usuarioPodeAcao('Roteirização', 'editar_nf')) { mostrarAviso('⛔ Você não possui permissão para editar NF.'); return; }
  try {
    const { data, error } = await supabaseClient.from("nfs").select("*").eq("id", nfId).single();
    if (error) throw error;

    if (nfModalTitle) nfModalTitle.innerText = "Editar NF";
    if (nfIdHidden) nfIdHidden.value = data.id;
    if (nfNumeroInput) nfNumeroInput.value = data.numero;
    if (nfObsInput) nfObsInput.value = data.observacao || "";
    if (nfQuantidadeInput) nfQuantidadeInput.value = data.qtd ?? "";
    if (nfMarcaInput) nfMarcaInput.value = data.marca || "";
    if (nfPotenciaInput) nfPotenciaInput.value = data.potencia || "";
    
    const { data: kams } = await supabaseClient.from("kams").select("*").order("nome");
    popularSelectKam(kams, data.kam);
    
    // Usa o campo 'tipo' da tabela se existir, caso contrário verifica pela UF (compatibilidade)
    const tipoOperacao = data.tipo || (data.uf === 'RT' ? 'retira' : 'transporte');

    if (tipoOperacao === 'retira') {
        if (btnRetira) btnRetira.click();
    } else {
        if (btnTransporte) btnTransporte.click();
        if (nfCepInput) nfCepInput.value = data.cep ? data.cep.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9) : '';
        if (nfCidadeInput) nfCidadeInput.value = data.cidade || (data.destino !== 'RETIRA' ? data.destino : '');
        if (nfUfInput) nfUfInput.value = data.uf;
        if (nfEnderecoInput) nfEnderecoInput.value = data.endereco || "";
        if (nfEnderecoNumeroInput) nfEnderecoNumeroInput.value = data.numero_endereco || "";
        if (nfValorInput) nfValorInput.value = data.valor_frete;
    }

    openModal(createNfModal);
  } catch (err) {
    console.error("Erro ao buscar NF para edição:", err);
  }
};

// EXCLUIR NF
window.excluirNF = async function(nfId) {
    if (!usuarioPodeAcao('Roteirização', 'excluir_nf')) { mostrarAviso('⛔ Você não possui permissão para excluir NF.'); return; }
  confirmarAcao("Tem certeza que deseja excluir esta Nota Fiscal permanentemente?", async () => {
    try {
      const { error } = await supabaseClient.from("nfs").delete().eq("id", nfId);
      if (error) throw error;
      carregarTudo();
    } catch (err) {
      console.error("Erro ao excluir NF:", err);
    }
  });
};

// Listener para a busca
if (searchInput) {
  searchInput.addEventListener('input', carregarNFs);
}

// Listeners para os campos de pesquisa dos históricos (Tarefa 4)
const historySearchInput = document.getElementById('history-search');
if (historySearchInput) {
    historySearchInput.addEventListener('input', (e) => renderizarHistorico(e.target.value));
}

const progHistorySearchInput = document.getElementById('programacao-history-search');
if (progHistorySearchInput) {
    progHistorySearchInput.addEventListener('input', (e) => renderizarHistoricoProgramacao(e.target.value));
}

// ENVIAR PARA ROTA
async function enviarParaRota(nfId) {
    if (!usuarioPodeAcao('Roteirização', 'adicionar_nf_rota')) { mostrarAviso('⛔ Você não possui permissão para adicionar NF à rota.'); return; }
    if (typeof supabaseClient === 'undefined') {
        console.error('enviarParaRota: Cliente supabaseClient não está definido.');
        mostrarAviso('Erro: O serviço de banco de dados não está disponível.');
        return;
    }

    if (!rotaSelecionada) {
        mostrarAviso("Selecione uma rota primeiro clicando nela!");
        return;
    }

    try {
        const { data: nf, error: nfError } = await supabaseClient
            .from('nfs')
            .select('id,numero,tipo,uf,rota_id')
            .eq('id', nfId)
            .single();

        if (nfError || !nf) {
            mostrarAviso('Não foi possível identificar o tipo desta NF.');
            return;
        }

        if (!verificarPermissaoTipoNFs(nf, 'adicionar NFs de')) return;

        const resultadoLimite = await validarLimiteAoAdicionarNFRetirada(nfId, rotaSelecionada);
        if (!resultadoLimite.permitido) {
            mostrarAviso(`⛔ Limite de Retirada atingido para ${formatarDataBR((await supabaseClient.from('rotas').select('data').eq('id', rotaSelecionada).single()).data?.data)}. O limite é de ${resultadoLimite.limite} NF${resultadoLimite.limite === 1 ? '' : 's'} de Retirada programadas para esse dia.`);
            return;
        }

        const { error } = await supabaseClient
            .from("nfs")
            .update({ rota_id: rotaSelecionada })
            .eq("id", nfId);
        if (error) throw error;

        carregarTudo();
    } catch (error) {
        console.error('Erro ao adicionar NF à rota:', error);
        mostrarAviso('Não foi possível programar esta NF na rota.');
    }
}

// FILTRO GLOBAL DE PERÍODO
// Um único intervalo (Início/Fim) é compartilhado entre Roteirização, Programação, Histórico e Painel de Controle.
const CHAVE_FILTRO_DATA_GLOBAL = 'rota_sirius_filtro_data_global';

const filtroNomeRota = document.getElementById('filtro-nome-rota');
const filtroDataRotaInicio = document.getElementById('filtro-data-rota-inicio');
const filtroDataRotaFim = document.getElementById('filtro-data-rota-fim');

const filtroNomeProg = document.getElementById('filtro-nome-programacao');
const filtroDataProgInicio = document.getElementById('filtro-data-programacao-inicio');
const filtroDataProgFim = document.getElementById('filtro-data-programacao-fim');

const filtroNomeNewHistory = document.getElementById('filtro-nome-new-history');
const filtroDataNewHistoryInicio = document.getElementById('filtro-data-new-history-inicio');
const filtroDataNewHistoryFim = document.getElementById('filtro-data-new-history-fim');

const filtroDataPainelInicio = document.getElementById('filtro-data-painel-inicio');
const filtroDataPainelFim = document.getElementById('filtro-data-painel-fim');
const pesquisaNfPainel = document.getElementById('pesquisa-nf-painel');
const limparPesquisaNfPainel = document.getElementById('limpar-pesquisa-nf-painel');
const resultadoPesquisaNfPainel = document.getElementById('resultado-pesquisa-nf-painel');
let nfsDashboardCache = [];
let rotasDashboardCache = [];
let timerPesquisaNfPainel = null;

function obterFiltroDataGlobal() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_FILTRO_DATA_GLOBAL) || '{}');
        return { inicio: salvo.inicio || '', fim: salvo.fim || '' };
    } catch {
        return { inicio: '', fim: '' };
    }
}

function sincronizarCamposFiltroDataGlobal(inicio, fim) {
    [
        [filtroDataRotaInicio, filtroDataRotaFim],
        [filtroDataProgInicio, filtroDataProgFim],
        [filtroDataNewHistoryInicio, filtroDataNewHistoryFim],
        [filtroDataPainelInicio, filtroDataPainelFim]
    ].forEach(([campoInicio, campoFim]) => {
        if (campoInicio) campoInicio.value = inicio || '';
        if (campoFim) campoFim.value = fim || '';
    });
}

function definirFiltroDataGlobal(inicio, fim, recarregar = true) {
    if (inicio && fim && inicio > fim) {
        mostrarAviso('A data de início não pode ser maior que a data de fim.');
        const atual = obterFiltroDataGlobal();
        sincronizarCamposFiltroDataGlobal(atual.inicio, atual.fim);
        return false;
    }

    const filtro = { inicio: inicio || '', fim: fim || '' };
    localStorage.setItem(CHAVE_FILTRO_DATA_GLOBAL, JSON.stringify(filtro));
    sincronizarCamposFiltroDataGlobal(filtro.inicio, filtro.fim);

    if (recarregar) {
        // Recarrega apenas a tela atualmente visível. O intervalo continua global
        // e será reaplicado automaticamente ao abrir qualquer outra tela.
        if (dashboardView && !dashboardView.classList.contains('hidden')) {
            carregarRotas();
        } else if (controlPanelView && !controlPanelView.classList.contains('hidden')) {
            carregarDashboard();
        } else if (programacaoView && !programacaoView.classList.contains('hidden')) {
            carregarProgramacao();
        } else if (newHistoryView && !newHistoryView.classList.contains('hidden')) {
            if (currentNewHistoryViewMode === 'roteirizacao') carregarNovoHistorico();
            else carregarNovoHistoricoProgramacao();
        }
    }
    return true;
}

function dataDentroDoFiltroGlobal(dataISO, filtro = obterFiltroDataGlobal()) {
    if (!dataISO) return !filtro.inicio && !filtro.fim;
    if (filtro.inicio && dataISO < filtro.inicio) return false;
    if (filtro.fim && dataISO > filtro.fim) return false;
    return true;
}

function obterDataReferenciaNF(nf, rotasPorId = new Map()) {
    const rota = nf?.rota_id ? rotasPorId.get(nf.rota_id) : null;
    if (rota?.data) return rota.data;
    if (nf?.created_at) return String(nf.created_at).slice(0, 10);
    return '';
}

const filtroDataGlobalAtual = obterFiltroDataGlobal();
sincronizarCamposFiltroDataGlobal(filtroDataGlobalAtual.inicio, filtroDataGlobalAtual.fim);

function listenerFiltroDataGlobal(campoInicio, campoFim) {
    if (!campoInicio || !campoFim) return;
    const atualizar = () => definirFiltroDataGlobal(campoInicio.value, campoFim.value);
    campoInicio.addEventListener('change', atualizar);
    campoFim.addEventListener('change', atualizar);
}

listenerFiltroDataGlobal(filtroDataRotaInicio, filtroDataRotaFim);
listenerFiltroDataGlobal(filtroDataProgInicio, filtroDataProgFim);
listenerFiltroDataGlobal(filtroDataNewHistoryInicio, filtroDataNewHistoryFim);
listenerFiltroDataGlobal(filtroDataPainelInicio, filtroDataPainelFim);
configurarPesquisaNfPainel();

if (filtroNomeRota) filtroNomeRota.addEventListener('input', carregarRotas);
if (filtroNomeProg) filtroNomeProg.addEventListener('input', carregarProgramacao);
if (filtroNomeNewHistory) filtroNomeNewHistory.addEventListener('input', () => currentNewHistoryViewMode === 'roteirizacao' ? carregarNovoHistorico() : carregarNovoHistoricoProgramacao());

// CARREGAR ROTAS (COM 3 COLUNAS)
async function carregarRotas() {
  if (typeof supabaseClient === 'undefined') {
    console.error('carregarRotas: Cliente supabaseClient não está definido.');
    return;
  }
  
  let query = supabaseClient.from("rotas").select("*").eq("status", "ativa");
  
  const { data: rotas, error: errR } = await query;
  const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");

  if (errR || errN || !rotas || !nfs) return;

  const container = document.querySelector(".rotas");
  if (!container) return;
  container.innerHTML = "";

  // Lógica de Visualização (Grid vs Lista)
  const viewMode = localStorage.getItem('rota_view_mode') || 'grid';
  if (viewMode === 'list') {
    container.classList.add('list-view');
  } else {
    container.classList.remove('list-view');
  }

  // Lógica de Filtragem Local para resposta instantânea
  const termoNome = filtroNomeRota ? filtroNomeRota.value.toLowerCase() : "";
  const filtroData = obterFiltroDataGlobal();

  const rotasFiltradas = rotas.filter(rota => {
    const nomeMatch = rota.nome.toLowerCase().includes(termoNome);
    const transportadoraMatch = (rota.transportadora || "").toLowerCase().includes(termoNome);

    // Pesquisa por NF ou destino: se alguma NF da rota corresponder ao termo,
    // a rota inteira é considerada um resultado (mostra todas as suas NFs).
    const nfDestinoMatch = termoNome ? nfs.some(nf => {
      if (nf.rota_id !== rota.id) return false;
      const numeroMatch = String(nf.numero || "").toLowerCase().includes(termoNome);
      const destinoMatch = (nf.cidade || nf.destino || "").toLowerCase().includes(termoNome);
      return numeroMatch || destinoMatch;
    }) : false;

    const dataMatch = dataDentroDoFiltroGlobal(rota.data, filtroData);
    return (nomeMatch || transportadoraMatch || nfDestinoMatch) && dataMatch;
  });

  if (rotasFiltradas.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma rota encontrada para os filtros aplicados.</p>`;
    return;
  }

  rotasFiltradas.forEach(rota => {
    const card = document.createElement("div");
    card.className = "rota-card";

    // Destaque visual para observação da rota
    const hasObs = rota.observacao_historico && rota.observacao_historico.trim() !== "";
    const iconStyle = hasObs ? 'color: #fbbf24; opacity: 1;' : 'color: var(--accent); opacity: 0.7;';
    
    // Mantém o destaque se a rota já estiver selecionada
    if (rotaSelecionada === rota.id) {
      card.classList.add("selected");
    }

    // Mantém o estado recolhido de cada rota entre atualizações da tela.
    const rotasRecolhidas = JSON.parse(localStorage.getItem('rotas_recolhidas') || '[]');
    if (rotasRecolhidas.map(String).includes(String(rota.id))) {
      card.classList.add('collapsed');
    }

    // Lógica de seleção de rota por clique
    card.onclick = (e) => {
      e.stopPropagation(); // Impede que o clique chegue no document e deselecione

      // Se o clique for para remover uma NF de dentro da rota, não altera a seleção do card
      if (e.target.closest('.nf-row')) return;

      if (rotaSelecionada === rota.id) {
        rotaSelecionada = null;
        card.classList.remove('selected');
      } else {
        document.querySelectorAll('.rota-card').forEach(c => c.classList.remove('selected'));
        rotaSelecionada = rota.id;
        card.classList.add('selected');
      }
    };

    const nfsDaRota = nfs.filter(n => n.rota_id === rota.id);

    let total = 0;
    nfsDaRota.forEach(n => total += Number(n.valor_frete));

    // Formatação do Nome e Data (Tarefa 5 e 6)
    const displayNome = rota.data 
        ? `${rota.nome} - ${rota.data.split('-')[2]}/${rota.data.split('-')[1]}` 
        : rota.nome;

    card.innerHTML = `
      <div class="rota-header">
        <div>
          <div class="rota-title-group">
            <h3>${displayNome}</h3>
            <button type="button" class="rota-collapse-btn" title="Recolher rota" aria-label="Recolher rota" aria-expanded="true" onclick="event.stopPropagation(); alternarRotaRecolhida('${rota.id}', this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="rota-actions">
              <button class="icon-btn info" title="${hasObs ? 'Ver detalhes da rota (Possui observação)' : 'Ver detalhes da rota'}" style="${iconStyle}" onclick="event.stopPropagation(); abrirModalDetalhesRota('${rota.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </button>
              <button class="icon-btn edit" title="Editar rota" onclick="event.stopPropagation(); editarRota('${rota.id}', '${rota.nome}', '${rota.data || ''}', '${rota.transportadora || ''}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
              <button class="icon-btn delete" title="Excluir rota" onclick="event.stopPropagation(); deletarRota('${rota.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
          </div>
          ${rota.transportadora ? `<div style="font-size: 13px; color: var(--text-muted); margin-bottom: 2px;">Transportadora: ${rota.transportadora}</div>` : ''}
          <span>${nfsDaRota.length} NFs</span>
        </div>
        <div class="valor">R$ ${formatar(total)}</div>
      </div>

      <div class="rota-body">

        <div class="nf-header">
          <span>NF</span>
          <span>DESTINO</span>
          <span>FRETE</span>
          <span></span>
        </div>

      </div>

      <div class="rota-footer">
        <div class="maps-wrapper">
          <button class="btn btn-map-route" onclick="toggleMapsMenu(event)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Maps
          </button>
          <div class="maps-dropdown hidden">
            <button type="button" onclick="event.stopPropagation(); handleAbrirNoMaps('${rota.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Abrir no Maps
            </button>
            <button type="button" onclick="event.stopPropagation(); handleCopiarLinkMaps('${rota.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              Copiar link
            </button>
          </div>
        </div>
        <button class="btn btn-outline" onclick="event.stopPropagation(); copiarResumo('${rota.id}', '${rota.nome}', ${total})">Copiar Resumo</button>
        <button class="btn" onclick="event.stopPropagation(); finalizarRota('${rota.id}')">Finalizar Rota</button>
      </div>
    `;

    const body = card.querySelector(".rota-body");

    nfsDaRota.forEach(nf => {
      const linha = document.createElement("div");
      linha.className = "nf-row";
      
      // Destaque visual para observação
      const temObs = nf.observacao && nf.observacao.trim() !== "";
      const infoStyle = temObs ? 'color: #fbbf24; opacity: 1;' : '';
      const infoTitle = temObs ? "Informações (Possui Observação)" : "Informações";

      linha.innerHTML = `
        <span>NF ${nf.numero}</span>
        <span>${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</span>
        <span>R$ ${formatar(nf.valor_frete)}</span>
        <button class="icon-btn info" title="${infoTitle}" onclick="event.stopPropagation(); abrirModalInfoNF('${nf.id}');" style="padding: 2px; ${infoStyle}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </button>
      `;

      linha.onclick = () => removerDaRota(nf.id);

      body.appendChild(linha);
    });

    container.appendChild(card);
  });
}

// ALTERNAR RECOLHIMENTO DO CARD DE ROTA
window.alternarRotaRecolhida = function(rotaId, button) {
  const card = button?.closest('.rota-card');
  if (!card) return;

  const recolhida = card.classList.toggle('collapsed');
  const rotasRecolhidas = JSON.parse(localStorage.getItem('rotas_recolhidas') || '[]').map(String);
  const id = String(rotaId);

  if (recolhida) {
    if (!rotasRecolhidas.includes(id)) rotasRecolhidas.push(id);
  } else {
    const index = rotasRecolhidas.indexOf(id);
    if (index !== -1) rotasRecolhidas.splice(index, 1);
  }

  localStorage.setItem('rotas_recolhidas', JSON.stringify(rotasRecolhidas));
  button.setAttribute('aria-expanded', String(!recolhida));
  button.setAttribute('aria-label', recolhida ? 'Expandir rota' : 'Recolher rota');
  button.setAttribute('title', recolhida ? 'Expandir rota' : 'Recolher rota');
};

// REMOVER DA ROTA
async function removerDaRota(nfId) {
    if (!usuarioPodeAcao('Roteirização', 'remover_nf_rota')) { mostrarAviso('⛔ Você não possui permissão para remover NF da rota.'); return; }
  if (typeof supabaseClient === 'undefined') {
    console.error('removerDaRota: Cliente supabaseClient não está definido.');
    alert('Erro: O serviço de banco de dados não está disponível.');
    return;
  }

  const { data: nf, error: nfError } = await supabaseClient
    .from('nfs')
    .select('id,numero,tipo,uf,rota_id')
    .eq('id', nfId)
    .single();

  if (nfError || !nf) {
    mostrarAviso('Não foi possível identificar o tipo desta NF.');
    return;
  }

  if (!verificarPermissaoTipoNFs(nf, 'remover NFs de')) return;

  const { error } = await supabaseClient
    .from("nfs")
    .update({ rota_id: null })
    .eq("id", nfId);

  if (error) {
    console.error('Erro ao remover NF da rota:', error);
    mostrarAviso('Não foi possível remover a NF da rota.');
    return;
  }

  carregarTudo();
}

// EDITAR NOME DA ROTA
window.editarRota = async function(rotaId, nomeAtual, dataAtual, transportadoraAtual) {
    if (!usuarioPodeAcao('Roteirização', 'editar_rota')) { mostrarAviso('⛔ Você não possui permissão para editar rota.'); return; }
  if (rotaModalTitle) rotaModalTitle.innerText = "Editar Rota";
  if (rotaIdHidden) rotaIdHidden.value = rotaId;
  if (rotaNomeInput) rotaNomeInput.value = nomeAtual;
  if (rotaDataInput) rotaDataInput.value = dataAtual || "";
  if (rotaTransportadoraInput) rotaTransportadoraInput.value = transportadoraAtual || "";
  openModal(createRotaModal);
}

// COPIAR RESUMO DA ROTA
window.copiarResumo = async function(rotaId, rotaNome, totalFrete) {
    if (!usuarioPodeAcao('Roteirização', 'copiar_resumo')) { mostrarAviso('⛔ Você não possui permissão para copiar o resumo.'); return; }
  try {
    // Busca dados complementares da rota (data e transportadora) no Supabase
    const { data: rota, error: errRota } = await supabaseClient
      .from("rotas")
      .select("data, transportadora")
      .eq("id", rotaId)
      .single();

    if (errRota) throw errRota;

    const { data: nfs, error } = await supabaseClient
      .from("nfs")
      .select("*")
      .eq("rota_id", rotaId);

    if (error) throw error;

    let resumo = `ROTA: ${rotaNome}\n`;

    if (rota.data) {
      const [ano, mes, dia] = rota.data.split('-');
      resumo += `DATA: ${dia}/${mes}/${ano}\n`;
    }

    resumo += `QTD NFs: ${nfs.length}\n`;
    if (rota.transportadora) {
      resumo += `TRANSPORTADORA: ${rota.transportadora}\n`;
    }
    resumo += `TOTAL FRETE: R$ ${formatar(totalFrete)}\n\n`;

    nfs.forEach(nf => {
      resumo += `NF ${nf.numero} | ${nf.cidade || nf.destino}/${nf.uf} | R$ ${formatar(nf.valor_frete)}\n`;
    });

    await navigator.clipboard.writeText(resumo);
    mostrarAviso("Resumo copiado para a área de transferência!");
  } catch (err) {
    console.error("Erro ao copiar resumo:", err);
    mostrarAviso("Erro ao copiar resumo.");
  }
};

// FINALIZAR ROTA (Deleta a rota sem devolver NFs para pendentes)
window.finalizarRota = async function(rotaId) {
    if (!usuarioPodeAcao('Roteirização', 'finalizar_rota')) { mostrarAviso('⛔ Você não possui permissão para finalizar rota.'); return; }
  confirmarAcao("Deseja finalizar esta rota? Ela será movida para o histórico.", async () => {
    try {
      // TAREFA 2: Garantir que os dados sejam capturados antes da exclusão
      const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*").eq("id", rotaId);
      const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*").eq("rota_id", rotaId);

      if (errR || errN) throw new Error("Erro ao buscar dados para o histórico.");

      if (!verificarPermissaoTipoNFs(nfs || [], 'finalizar rotas com NFs de')) return;

      if (rotas && rotas.length > 0) {
          let total = 0;
          if (nfs && nfs.length > 0) {
              nfs.forEach(n => total += Number(n.valor_frete));
          }
          salvarRotaNoHistorico(rotas[0], nfs || [], total);
      } else {
          console.warn("finalizarRota: Rota não encontrada para registro no histórico.");
      }

      // Alteração para atualizar o status e a data de finalização ao invés de deletar
      const { error } = await supabaseClient
        .from("rotas")
        .update({ 
          status: 'finalizada', 
          finalizada_em: new Date().toISOString() 
        })
        .eq("id", rotaId);

      if (error) throw error;
      
      if (rotaSelecionada === rotaId) rotaSelecionada = null;
      carregarTudo();
    } catch (error) {
      console.error("Erro ao finalizar rota:", error);
      mostrarAviso("Erro ao finalizar rota.");
    }
  });
};

// LOGICA DE HISTÓRICO (LocalStorage)
function salvarRotaNoHistorico(rota, nfs, totalFrete) {
    const historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    
    const novaEntrada = {
        id: rota.id,
        nome: rota.nome,
        dataRota: rota.data, // Salva a data original da rota (ex: 2024-04-16)
            transportadora: rota.transportadora || null, // TAREFA 1: Preservar transportadora
        data: new Date().toLocaleString('pt-BR'),
        qtdNfs: nfs.length,
        totalFrete: totalFrete,
        nfs: nfs.map(n => ({
                id: n.id, // TAREFA 1 & 5: Preservar ID real da NF no histórico
            numero: n.numero,
            cidade: n.cidade,
            destino: n.destino, // Mantido para histórico legado
            uf: n.uf,
            valor_frete: n.valor_frete
        }))
    };

    historico.unshift(novaEntrada); // Adiciona no início (mais recente primeiro)
    localStorage.setItem('rota_historico', JSON.stringify(historico));
}

window.renderizarHistorico = async function(termoBusca = "") {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    try {
        // Busca rotas finalizadas no Supabase
        const { data: rotas, error: errR } = await supabaseClient
            .from("rotas")
            .select("*")
            .eq("status", "finalizada")
            .order("finalizada_em", { ascending: false });

        if (errR) throw errR;

        // Busca NFs vinculadas para calcular totais
        const rotaIds = rotas.map(r => r.id);
        const { data: nfs, error: errN } = await supabaseClient
            .from("nfs")
            .select("rota_id, valor_frete")
            .in("rota_id", rotaIds);

        if (errN) throw errN;

        container.innerHTML = "";
        const termo = termoBusca.toLowerCase();

        const historicoFiltrado = rotas.filter(rota => {
            const nomeMatch = (rota.nome || "").toLowerCase().includes(termo);
            const dataFinMatch = rota.finalizada_em ? new Date(rota.finalizada_em).toLocaleString('pt-BR').includes(termo) : false;
            
            let dataRotaMatch = false;
            if (rota.data) {
                if (rota.data.includes(termo)) dataRotaMatch = true;
                const [y, m, d] = rota.data.split('-');
                if (`${d}/${m}/${y}`.includes(termo)) dataRotaMatch = true;
            }
            
            return nomeMatch || dataFinMatch || dataRotaMatch;
        });

        if (historicoFiltrado.length === 0) {
            const msg = termo ? "Nenhum resultado encontrado." : "Nenhuma rota finalizada no histórico.";
            container.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>${msg}</p>`;
            return;
        }

        historicoFiltrado.forEach(rota => {
            const nfsDaRota = nfs.filter(n => n.rota_id === rota.id);
            const totalFrete = nfsDaRota.reduce((acc, n) => acc + Number(n.valor_frete), 0);
            const dataFinalizacao = formatarDataHora(rota.finalizada_em);

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div>
                        <strong style="font-size:16px;">${rota.nome}</strong><br>
                        <small style="color:var(--text-muted)">${dataFinalizacao}</small>
                    </div>
                    <div style="text-align:right">
                        <span style="color:var(--primary); font-weight:bold;">R$ ${formatar(totalFrete)}</span><br>
                        <small style="color:var(--text-muted)">${nfsDaRota.length} NFs</small>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px;" onclick="copiarResumoHistorico('${rota.id}')">Resumo</button>
                    <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:var(--accent); color:var(--accent);" onclick="retornarRota('${rota.id}')">Retornar</button>
                    <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:#ef4444; color:#ef4444;" onclick="excluirHistorico('${rota.id}')">Excluir</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Erro ao carregar histórico do Supabase:", err);
    }
};

// EXCLUIR ROTA DO HISTÓRICO
window.excluirHistorico = function(historicoId) {
    if (!usuarioPodeAcao('Histórico', 'excluir_historico')) { mostrarAviso('⛔ Você não possui permissão para excluir histórico.'); return; }
      confirmarAcao("Tem certeza que deseja excluir esta rota permanentemente do histórico?", () => {
        let historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
        historico = historico.filter(h => h.id !== historicoId);
        localStorage.setItem('rota_historico', JSON.stringify(historico));
        
        renderizarHistorico();
    });
};

// RETORNAR ROTA PARA ATIVA
window.retornarRota = async function(rotaId) {
    if (!usuarioPodeAcao('Histórico', 'retornar_rota')) { mostrarAviso('⛔ Você não possui permissão para retornar rota.'); return; }
      try {
        const { error } = await supabaseClient
            .from("rotas")
            .update({ 
                status: 'ativa', 
                finalizada_em: null 
            })
            .eq("id", rotaId);

        if (error) throw error;

        // Atualiza as interfaces de histórico e a tela principal
        if (window.renderizarHistorico) await window.renderizarHistorico();
        if (window.renderizarHistoricoProgramacao) await window.renderizarHistoricoProgramacao();
        
        carregarTudo();
        if (typeof carregarProgramacao === 'function') carregarProgramacao();

        mostrarAviso("Rota restaurada com sucesso! Ela voltou para a tela principal.");
    } catch (err) {
        console.error("Erro ao retornar rota:", err);
        mostrarAviso("Erro ao tentar restaurar a rota para o painel ativo.");
    }
};

window.copiarResumoHistorico = async function(rotaId) {
    if (!usuarioPodeAcao('Histórico', 'visualizar_detalhes')) { mostrarAviso('⛔ Você não possui permissão para visualizar este resumo.'); return; }
    try {
        const { data: rota, error: errR } = await supabaseClient.from("rotas").select("*").eq("id", rotaId).single();
        const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*").eq("rota_id", rotaId);

        if (errR || errN || !rota) return;

        const totalFrete = nfs.reduce((acc, n) => acc + Number(n.valor_frete), 0);
        const dataFin = formatarDataHora(rota.finalizada_em);

        let resumo = `ROTA: ${rota.nome} - ${dataFin}\n`;
        resumo += `QTD NFs: ${nfs.length}\n`;
        resumo += `TOTAL FRETE: R$ ${formatar(totalFrete)}\n\n`;

        nfs.forEach(nf => {
            resumo += `NF ${nf.numero} | ${nf.cidade || nf.destino}/${nf.uf} | R$ ${formatar(nf.valor_frete)}\n`;
        });

        await navigator.clipboard.writeText(resumo);
        mostrarAviso("Resumo da rota copiado para a área de transferência!");
    } catch (e) {
        console.error("Erro ao copiar resumo do histórico:", e);
        mostrarAviso("Erro ao copiar.");
    }
};
window.deletarRota = async function(rotaId) {
    if (!usuarioPodeAcao('Roteirização', 'excluir_rota')) { mostrarAviso('⛔ Você não possui permissão para excluir rota.'); return; }

  const { data: nfsDaRota, error: nfsError } = await supabaseClient
    .from('nfs')
    .select('id,numero,tipo,uf,rota_id')
    .eq('rota_id', rotaId);

  if (nfsError) {
    console.error('Erro ao verificar NFs da rota antes da exclusão:', nfsError);
    mostrarAviso('Não foi possível verificar as NFs desta rota.');
    return;
  }

  if (!verificarPermissaoTipoNFs(nfsDaRota || [], 'excluir rotas com NFs de')) return;

  confirmarAcao("Tem certeza que deseja excluir esta rota? As Notas Fiscais vinculadas retornarão para a lista de pendentes.", async () => {
    try {
      // Primeiro removemos o vínculo das NFs com esta rota
      await supabaseClient.from("nfs").update({ rota_id: null }).eq("rota_id", rotaId);
      // Depois deletamos a rota
      const { error } = await supabaseClient.from("rotas").delete().eq("id", rotaId);
      if (error) throw error;
      
      if (rotaSelecionada === rotaId) rotaSelecionada = null;
      carregarTudo();
    } catch (error) {
      console.error("Erro ao deletar rota:", error);
      mostrarAviso("Erro ao deletar rota.");
    }
  });
}

// --- LÓGICA DE PROGRAMAÇÃO / AGENDAMENTO ---

async function buscarDadosParaProgramacao() {
    const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*").eq("status", "ativa");
    const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*").not("rota_id", "is", null);
    
    if (errR || errN) throw new Error("Erro ao carregar dados do Supabase");
    return { rotas, nfs };
}

function agruparDadosProgramacao(rotas, nfs, termoBusca = "") {
    const agrupado = {};
    const termo = termoBusca.toLowerCase();

    nfs.forEach(nf => {
        const rota = rotas.find(r => r.id === nf.rota_id);
        if (!rota) return;

        // Lógica de busca multi-campo
        if (termo) {
            const matchRota = rota.nome.toLowerCase().includes(termo);
            const matchTransp = (rota.transportadora || "").toLowerCase().includes(termo);
            const matchNF = String(nf.numero).toLowerCase().includes(termo);
            const matchKam = String(nf.kam || "").toLowerCase().includes(termo);
            const localizacao = (nf.cidade || nf.destino || "").toLowerCase();
            const matchDestino = localizacao.includes(termo) || 
                                String(nf.uf || "").toLowerCase().includes(termo);

            // Se nenhum dos campos bater, ignora esta NF
            if (!matchRota && !matchTransp && !matchNF && !matchKam && !matchDestino) return;
        }

        const dataKey = rota.data || "sem-data";
        if (!agrupado[dataKey]) agrupado[dataKey] = {};
        
        if (!agrupado[dataKey][rota.id]) {
            agrupado[dataKey][rota.id] = {
                nome: rota.nome,
                transportadora: rota.transportadora,
                observacao_historico: rota.observacao_historico,
                nfs: []
            };
        }
        agrupado[dataKey][rota.id].nfs.push(nf);
    });

    return agrupado;
}

function formatarDataComDiaSemana(dataISO) {
    if (dataISO === "sem-data") return "Data não definida";
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dataFormatada = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
    return `${dataFormatada} (${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)})`;
}

// Helper reutilizável: formata uma data/hora ISO no padrão pt-BR usado em vários
// pontos do sistema (histórico, detalhes de rota, resumo de rota). Mesmo
// comportamento que já existia de forma duplicada: retorna o fallback quando
// não há data.
function formatarDataHora(dataISO, fallback = '---') {
    return dataISO ? new Date(dataISO).toLocaleString('pt-BR') : fallback;
}

// Estado de ordenação das tabelas diárias da Programação.
// Cada data possui sua própria coluna/ordem, evitando que uma tabela afete outra.
const ordenacaoProgramacaoPorData = {};
// Ordenação independente do histórico de programação, para não alterar a tela de Programação ativa.
const ordenacaoHistoricoProgramacaoPorData = {};

function normalizarValorOrdenacaoProgramacao(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function obterValorOrdenacaoProgramacao(nf, infoRota, coluna) {
    switch (coluna) {
        case 'nf':
            return Number.isFinite(Number(nf.numero)) ? Number(nf.numero) : normalizarValorOrdenacaoProgramacao(nf.numero);
        case 'destino':
            return normalizarValorOrdenacaoProgramacao(nf.uf === 'RT' ? 'RETIRA' : `${nf.cidade || nf.destino || ''}/${nf.uf || ''}`);
        case 'tipo':
            return normalizarValorOrdenacaoProgramacao(nf.tipo);
        case 'qtd':
            return Number.isFinite(Number(nf.qtd)) ? Number(nf.qtd) : normalizarValorOrdenacaoProgramacao(nf.qtd);
        case 'marca':
            return normalizarValorOrdenacaoProgramacao(nf.marca);
        case 'potencia':
            return normalizarValorOrdenacaoProgramacao(nf.potencia);
        case 'kam':
            return normalizarValorOrdenacaoProgramacao(nf.kam);
        case 'rota':
            return normalizarValorOrdenacaoProgramacao(infoRota.nome);
        case 'transportadora':
            return normalizarValorOrdenacaoProgramacao(infoRota.transportadora);
        case 'status':
            return normalizarValorOrdenacaoProgramacao(nf.status);
        default:
            return '';
    }
}

function compararValoresOrdenacaoProgramacao(a, b, direcao) {
    let comparacao = 0;

    if (typeof a === 'number' && typeof b === 'number') {
        comparacao = a - b;
    } else {
        comparacao = String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
    }

    return direcao === 'desc' ? -comparacao : comparacao;
}

function ordenarNfsDaRotaProgramacao(nfs, infoRota, coluna, direcao) {
    return [...nfs].sort((a, b) => {
        const valorA = obterValorOrdenacaoProgramacao(a, infoRota, coluna);
        const valorB = obterValorOrdenacaoProgramacao(b, infoRota, coluna);
        return compararValoresOrdenacaoProgramacao(valorA, valorB, direcao);
    });
}

window.alternarOrdenacaoProgramacao = function(dataKey, coluna) {
    const atual = ordenacaoProgramacaoPorData[dataKey];

    if (atual?.coluna === coluna) {
        atual.direcao = atual.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacaoProgramacaoPorData[dataKey] = { coluna, direcao: 'asc' };
    }

    // Mantém o filtro global, a busca e todas as regras atuais; apenas redesenha
    // a tabela do dia com a ordenação escolhida.
    carregarProgramacao();
};

function obterIndicadorOrdenacaoProgramacao(dataKey, coluna) {
    const ordenacao = ordenacaoProgramacaoPorData[dataKey];
    if (!ordenacao || ordenacao.coluna !== coluna) return '↕';
    return ordenacao.direcao === 'asc' ? '↑' : '↓';
}

function obterLabelColunaProgramacao(coluna) {
    const labels = {
        nf: 'NF',
        destino: 'Destino',
        tipo: 'Tipo',
        qtd: 'Qtd',
        marca: 'Marca',
        potencia: 'Potência',
        kam: 'KAM',
        rota: 'Rota',
        transportadora: 'Transportadora',
        status: 'Status'
    };
    return labels[coluna] || coluna;
}

function renderizarCabecalhoOrdenavelProgramacao(dataKey) {
    const colunas = ['nf', 'destino', 'tipo', 'qtd', 'marca', 'potencia', 'kam', 'rota', 'transportadora', 'status'];

    return colunas.map(coluna => `
        <th class="programacao-sortable-header">
            <button type="button"
                    class="programacao-sort-button"
                    onclick="window.alternarOrdenacaoProgramacao('${String(dataKey).replace(/'/g, "\\'")}', '${coluna}')"
                    title="Ordenar ${obterLabelColunaProgramacao(coluna)}">
                <span>${obterLabelColunaProgramacao(coluna)}</span>
                <span class="programacao-sort-indicator" aria-hidden="true">${obterIndicadorOrdenacaoProgramacao(dataKey, coluna)}</span>
            </button>
        </th>
    `).join('');
}

function renderizarProgramacaoAutomatica(agrupado) {
    const container = document.getElementById('programacao-dinamica-container');
    if (!container) return;
    container.innerHTML = "";

    const canEdit = usuarioPodeAcao('Programação', 'alterar_status');

    const datas = Object.keys(agrupado).sort((a, b) => {
        if (a === "sem-data") return 1;
        if (b === "sem-data") return -1;
        return a.localeCompare(b);
    });

    if (datas.length === 0) {
        container.innerHTML = `<div class="panel-container"><p style="text-align:center; color:var(--text-muted); padding:20px;">Nenhuma rota com NFs vinculadas para exibir na programação.</p></div>`;
        return;
    }

    datas.forEach(dataKey => {
        const cardData = document.createElement('div');
        cardData.className = "panel-container";

        const ordenacao = ordenacaoProgramacaoPorData[dataKey] || null;
        let rotasIds = Object.keys(agrupado[dataKey]);

        // "Rota" é uma ordenação especial: reorganiza os grupos de rota,
        // mas nunca mistura as NFs de uma rota com outra.
        if (ordenacao?.coluna === 'rota') {
            rotasIds.sort((a, b) => {
                const infoA = agrupado[dataKey][a];
                const infoB = agrupado[dataKey][b];
                const valorA = normalizarValorOrdenacaoProgramacao(infoA.nome);
                const valorB = normalizarValorOrdenacaoProgramacao(infoB.nome);
                return compararValoresOrdenacaoProgramacao(valorA, valorB, ordenacao.direcao);
            });
        } else {
            rotasIds.sort((a, b) => agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
        }

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                <h3 style="margin: 0; color: var(--primary); font-size: 16px;">
                    ${formatarDataComDiaSemana(dataKey)}
                </h3>
                <div class="export-day-wrapper" style="position: relative;" onclick="toggleUserMenu(event)">
                    <button class="btn btn-outline" style="height: 30px; font-size: 11px; padding: 0 12px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; color: var(--primary);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Exportar Dia
                    </button>
                    <div class="user-dropdown hidden" style="top: calc(100% + 5px); right: 0; width: 140px;">
                        <button type="button" onclick="handleExportExcel(event, '${dataKey}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #22c55e;"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                            Excel
                        </button>
                        <button type="button" onclick="handleExportPDF(event, '${dataKey}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            PDF
                        </button>
                    </div>
                </div>
            </div>
            <table class="data-table programacao-data-table">
                <thead>
                    <tr>
                        ${renderizarCabecalhoOrdenavelProgramacao(dataKey)}
                    </tr>
                </thead>
                <tbody>
        `;

        rotasIds.forEach((rotaId, indiceRota) => {
            const infoRota = agrupado[dataKey][rotaId];

            // Separação visual entre grupos de rota, mantendo tudo dentro
            // do mesmo card do dia e sem misturar as NFs entre rotas.
            if (indiceRota > 0) {
                html += `
                    <tr class="programacao-route-separator" aria-hidden="true">
                        <td colspan="10"></td>
                    </tr>
                `;
            }

            // Identificação discreta do início de cada rota para facilitar
            // a leitura da produção sem criar um novo card.
            html += `
                <tr class="programacao-route-heading">
                    <td colspan="10">
                        <div class="programacao-route-heading-content">
                            <span class="programacao-route-heading-label">ROTA</span>
                            <span class="programacao-route-heading-name">${infoRota.nome}</span>
                            ${infoRota.transportadora ? `<span class="programacao-route-heading-transportadora">${infoRota.transportadora}</span>` : ''}
                        </div>
                    </td>
                </tr>
            `;
            const nfsOrdenadas = ordenacao && ordenacao.coluna !== 'rota'
                ? ordenarNfsDaRotaProgramacao(infoRota.nfs, infoRota, ordenacao.coluna, ordenacao.direcao)
                : infoRota.nfs;

            nfsOrdenadas.forEach((nf, indiceNF) => {
                const temObsNF = nf.observacao && nf.observacao.trim() !== "";
                const infoStyleNF = temObsNF ? 'color: #fbbf24; opacity: 1;' : '';
                const infoTitleNF = temObsNF ? "Informações (Possui Observação)" : "Informações";
                const statusAtual = nf.status || "";
                const statusDisplay = statusAtual || "---";
                const editAttr = canEdit ? `onclick="window.abrirEdicaoStatus(event, '${nf.id}', '${String(statusAtual).replace(/'/g, "\\'")}')" title="Clique para editar status" style="cursor: pointer;"` : "";
                html += `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <strong>${nf.numero}</strong>
                                <button class="icon-btn info" title="${infoTitleNF}" style="padding: 2px; ${infoStyleNF}" onclick="event.stopPropagation(); abrirModalInfoNF('${nf.id}');">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </button>
                            </div>
                        </td>
                        <td>${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</td>
                        <td style="text-transform: capitalize;">${nf.tipo}</td>
                        <td>${nf.qtd || '---'}</td>
                        <td>${nf.marca || '---'}</td>
                        <td>${nf.potencia || '---'}</td>
                        <td>${nf.kam || '---'}</td>
                        <td><span style="background: var(--border); padding: 2px 6px; border-radius: 4px; font-size: 11px; white-space: nowrap;">${infoRota.nome}</span></td>
                        <td>${infoRota.transportadora || '---'}</td>
                        <td id="cell-status-${nf.id}" ${editAttr}><span style="color: var(--text-muted); font-size: 11px;">${statusDisplay}</span></td>
                    </tr>
                `;
            });
        });

        html += `</tbody></table>`;
        cardData.innerHTML = html;
        container.appendChild(cardData);
    });
}

// FUNÇÕES DE EDIÇÃO INLINE DE STATUS
window.abrirEdicaoStatus = function(event, nfId, statusAtual) {
    event.stopPropagation();
    const cell = document.getElementById(`cell-status-${nfId}`);
    
    // Evita abrir múltiplos se já estiver editando
    if (!cell || cell.querySelector('select')) return;

    const select = document.createElement('select');
    select.className = 'status-select-inline';
    
    const opcoes = ["", "Em produção", "Produzida", "Expedida"];
    opcoes.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.text = opt || "Vazio";
        if (opt === statusAtual) o.selected = true;
        select.appendChild(o);
    });

    cell.innerHTML = "";
    cell.appendChild(select);
    select.focus();

    // Salvar ao mudar o valor
    select.onchange = () => window.salvarStatusNF(nfId, select.value);
    
    // Voltar ao normal se perder o foco sem mudar
    select.onblur = () => {
        if (cell.contains(select)) {
            cell.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">${statusAtual || "---"}</span>`;
        }
    };
};

window.salvarStatusNF = async function(nfId, novoStatus) {
    if (!usuarioPodeAcao('Programação', 'alterar_status')) { mostrarAviso('⛔ Você não possui permissão para alterar status.'); return; }
      try {
        const { error } = await supabaseClient.from("nfs").update({ status: novoStatus }).eq("id", nfId);
        if (error) throw error;
        carregarProgramacao(); // Atualiza a tabela para refletir a mudança
    } catch (err) {
        console.error("Erro ao salvar status:", err);
        mostrarAviso("Erro ao salvar status no servidor.");
        carregarProgramacao();
    }
};

async function carregarProgramacao() {
    try {
        const { rotas, nfs } = await buscarDadosParaProgramacao();

        // Lógica de Filtragem
        const termoTexto = filtroNomeProg ? filtroNomeProg.value : "";
        const filtroData = obterFiltroDataGlobal();

        // Filtramos as rotas pelo intervalo global (inclusivo)
        const rotasPorData = rotas.filter(rota => dataDentroDoFiltroGlobal(rota.data, filtroData));

        const agrupado = agruparDadosProgramacao(rotasPorData, nfs, termoTexto);
        renderizarProgramacaoAutomatica(agrupado);
    } catch (err) {
        console.error("Erro ao carregar programação automática:", err);
    }
}

const exportDropdown = document.getElementById('export-dropdown');
if (exportProgramacaoBtn) {
    exportProgramacaoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!usuarioPodeAcao('Programação', 'exportar')) {
            mostrarAviso('⛔ Você não possui permissão para exportar.');
            return;
        }
        if (exportDropdown) {
            // Fecha outros dropdowns abertos (como o de perfil)
            document.querySelectorAll('.user-dropdown').forEach(d => {
                if (d !== exportDropdown) d.classList.add('hidden');
            });
            exportDropdown.classList.toggle('hidden');
        }
    });
}

window.handleExportExcel = async function (e, specificDate = null) {
    if (e) e.stopPropagation();
    if (!usuarioPodeAcao('Programação', 'exportar')) {
        mostrarAviso('⛔ Você não possui permissão para exportar.');
        return;
    }

    // 1. Fechar todos os menus de exportação (principal e individuais)
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));

    try {
        // 2. Mostrar aviso de processamento
        const msg = specificDate ? "Gerando planilha do dia..." : "Gerando relatório da programação... O download iniciará em instantes.";
        mostrarAviso(msg);

        // 3. Buscar dados atuais (respeitando filtros da tela)
        const { rotas, nfs } = await buscarDadosParaProgramacao();
        const termoTexto = filtroNomeProg ? filtroNomeProg.value : "";
        
        // Se houver uma data específica (clique no card), mantém o comportamento de exportar somente aquele dia.
        const filtroData = obterFiltroDataGlobal();
        const rotasFiltradas = rotas.filter(rota => {
            if (specificDate) return specificDate === 'sem-data' ? !rota.data : rota.data === specificDate;
            return dataDentroDoFiltroGlobal(rota.data, filtroData);
        });

        // Agrupar usando a lógica já existente no sistema
        const agrupado = agruparDadosProgramacao(rotasFiltradas, nfs, termoTexto);

        if (Object.keys(agrupado).length === 0) {
            mostrarAviso("Nenhum dado disponível para exportação com os filtros atuais.");
            return;
        }

        // 4. Construir o array de dados (AoA - Array of Arrays) para a planilha organizada
        const sheetData = [];
        const merges = [];
        const agora = new Date();

        // Título Principal e Metadados do Relatório
        sheetData.push(["RELATÓRIO DE PROGRAMAÇÃO ATIVA - ROTA SIRIUS"]);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // Mescla de A1 até I1
        sheetData.push(["Gerado em:", agora.toLocaleString('pt-BR')]);
        sheetData.push([]); // Linha de respiro
        sheetData.push([]); // ETAPA 6: Respiro extra entre topo e primeiro bloco

        const datas = Object.keys(agrupado).sort((a, b) => {
            if (a === "sem-data") return 1;
            if (b === "sem-data") return -1;
            return a.localeCompare(b);
        });

        const dateRows = [];
        const headerRows = [];
        const dataRowIndices = [];
        datas.forEach(dataKey => {
            // ETAPA 2: Rastrear e configurar a linha da Data como Cabeçalho de Bloco
            const rowIdx = sheetData.length;
            dateRows.push(rowIdx);

            const dataTitulo = formatarDataComDiaSemana(dataKey).toUpperCase();
            sheetData.push([dataTitulo]);
            merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 8 } }); // Mescla A:I para a data

            // Cabeçalho de colunas do bloco - Adicionado apenas uma vez por data
            headerRows.push(sheetData.length);
            sheetData.push([
                "NF", "DESTINO", "Status", "Qtd.", "Marca", "Potência", "KAM", "ROTA", "TRANSPORTADORA"
            ]);

            const rotasIds = Object.keys(agrupado[dataKey]).sort((a, b) => 
                agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome)
            );

            rotasIds.forEach(rotaId => {
                const infoRota = agrupado[dataKey][rotaId];
                infoRota.nfs.forEach(nf => {
                    dataRowIndices.push(sheetData.length);
                    sheetData.push([
                        nf.numero,
                        `${nf.cidade || nf.destino}/${nf.uf}`,
                        nf.status || "",
                        nf.qtd || 0,
                        nf.marca || "---",
                        nf.potencia || "---",
                        nf.kam || "---",
                        infoRota.nome,
                        infoRota.transportadora || ""
                    ]);
                });
            });

            // Espaçadores após fechar o bloco completo da data (todas as rotas do dia)
            sheetData.push([]);
            sheetData.push([]);
        });

        // 5. Gerar a planilha a partir do AoA
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        worksheet['!merges'] = merges;

        // Estilização do Título (A1) - ETAPA 1
        if (worksheet['A1']) {
            worksheet['A1'].s = {
                fill: { fgColor: { rgb: "22C55E" } }, // Fundo Verde
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin" }, bottom: { style: "thin" },
                    left: { style: "thin" }, right: { style: "thin" }
                }
            };

            // ETAPA 6: Polimento da linha de metadados (Gerado em)
            if (worksheet['A2']) worksheet['A2'].s = { font: { italic: true, sz: 9, color: { rgb: "64748B" } } };
            if (worksheet['B2']) worksheet['B2'].s = { font: { italic: true, sz: 9, color: { rgb: "64748B" } } };
        }

        // ETAPA 2: Estilização profissional das linhas de data (Cabeçalho de Bloco)
        dateRows.forEach(rowIdx => {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = {
                    fill: { fgColor: { rgb: "CFE2F3" } }, // Azul claro suave
                    font: { bold: true, sz: 12 },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin" }, bottom: { style: "thin" },
                        left: { style: "thin" }, right: { style: "thin" }
                    }
                };
            }
        });

        // ETAPA 3: Estilização profissional dos cabeçalhos das colunas
        headerRows.forEach(rowIdx => {
            for (let c = 0; c <= 8; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: c });
                if (worksheet[cellRef]) {
                    worksheet[cellRef].s = {
                        fill: { fgColor: { rgb: "F1F5F9" } }, // Fundo suave (Slate 100)
                        font: { bold: true, sz: 10 },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                }
            }
        });

        // ETAPA 4: Melhoria visual das linhas de dados
        const dataAlignments = ["center", "left", "center", "center", "left", "center", "left", "left", "left"];
        dataRowIndices.forEach(rowIdx => {
            for (let c = 0; c <= 8; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: c });
                if (worksheet[cellRef]) {
                    worksheet[cellRef].s = {
                        font: { sz: 10 },
                        alignment: { horizontal: dataAlignments[c], vertical: "center" },
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                }
            }
        });

        // Configurar larguras de colunas para leitura fácil
        worksheet['!cols'] = [
            { wch: 10 }, // NF (Compacta)
            { wch: 45 }, // DESTINO (Espaço importante para endereços)
            { wch: 15 }, // Status (Largura para não quebrar texto)
            { wch: 8 },  // Qtd.
            { wch: 18 }, // Marca
            { wch: 18 }, // Potencia
            { wch: 25 }, // KAM (Boa leitura para nomes)
            { wch: 25 }, // ROTA (Boa leitura)
            { wch: 25 }  // TRANSPORTADORA (Boa leitura)
        ];

        // Congelar as 3 primeiras linhas (Título do Relatório)
        worksheet["!view"] = [{ state: 'frozen', ySplit: 3 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Programação Ativa");

        // 7. Iniciar download automático
        const filename = specificDate ? `programacao-${specificDate}.xlsx` : `programacao-sirius-${agora.toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, filename);

    } catch (err) {
        console.error("Erro na exportação Excel:", err);
        mostrarAviso("Ocorreu um erro ao gerar a planilha. Tente novamente.");
    }
};

window.handleExportPDF = async function(e, specificDate = null) {
    if (e) e.stopPropagation();

    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));

    try {
        const { rotas, nfs } = await buscarDadosParaProgramacao();
        const termoTexto = filtroNomeProg ? filtroNomeProg.value : "";
        const filtroData = obterFiltroDataGlobal();

        const rotasFiltradas = rotas.filter(rota => {
            if (specificDate) return specificDate === 'sem-data' ? !rota.data : rota.data === specificDate;
            return dataDentroDoFiltroGlobal(rota.data, filtroData);
        });

        const agrupado = agruparDadosProgramacao(rotasFiltradas, nfs, termoTexto);

        // Remove datas sem nenhuma rota com NF. Isso evita blocos de data vazios no PDF.
        const datas = Object.keys(agrupado)
            .filter(dataKey => Object.keys(agrupado[dataKey] || {}).some(rotaId => {
                const infoRota = agrupado[dataKey][rotaId];
                return infoRota && Array.isArray(infoRota.nfs) && infoRota.nfs.length > 0;
            }))
            .sort((a, b) => {
                if (a === 'sem-data') return 1;
                if (b === 'sem-data') return -1;
                return a.localeCompare(b);
            });

        if (datas.length === 0) {
            mostrarAviso("Nenhum dado disponível para exportação.");
            return;
        }

        const msg = specificDate
            ? "Gerando PDF do dia..."
            : "Gerando PDF da programação... O download iniciará em instantes.";
        mostrarAviso(msg);

        const { jsPDF } = window.jspdf;
        // Retrato: mantém o relatório em A4 vertical, como no padrão solicitado.
        const doc = new jsPDF('p', 'mm', 'a4');
        const agora = new Date();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margem = 14;
        const verdeSirius = [34, 197, 94];
        const textoPrincipal = [30, 41, 59];
        const textoSecundario = [100, 116, 139];
        const fundoBloco = [241, 245, 249];
        const borda = [226, 232, 240];
        const sectionRadius = 1.8;
        const sectionPadding = 2;
        let currentY = 24;

        // Cabeçalho
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(textoPrincipal[0], textoPrincipal[1], textoPrincipal[2]);
        doc.text('RELATÓRIO DE PROGRAMAÇÃO ATIVA', margem, currentY);

        doc.setFontSize(11);
        doc.setTextColor(verdeSirius[0], verdeSirius[1], verdeSirius[2]);
        doc.text('SISTEMA ROTA SIRIUS', margem, currentY + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(textoSecundario[0], textoSecundario[1], textoSecundario[2]);
        doc.text(`Gerado em: ${agora.toLocaleString('pt-BR')}`, margem, currentY + 14);

        doc.setDrawColor(borda[0], borda[1], borda[2]);
        doc.setLineWidth(0.3);
        doc.line(margem, currentY + 18, pageWidth - margem, currentY + 18);
        currentY += 28;

        datas.forEach((dataKey) => {
            const dataTitulo = formatarDataComDiaSemana(dataKey).toUpperCase();
            // A exportação do PDF deve reproduzir exatamente a ordenação
            // atualmente aplicada na tabela daquele dia. Isso vale tanto para
            // o PDF geral quanto para o PDF de um dia específico.
            const ordenacaoPDF = ordenacaoProgramacaoPorData[dataKey] || null;

            const rotasIds = Object.keys(agrupado[dataKey]).filter(rotaId => {
                const infoRota = agrupado[dataKey][rotaId];
                return infoRota && Array.isArray(infoRota.nfs) && infoRota.nfs.length > 0;
            });

            if (ordenacaoPDF?.coluna === 'rota') {
                rotasIds.sort((a, b) => {
                    const infoA = agrupado[dataKey][a];
                    const infoB = agrupado[dataKey][b];
                    const valorA = normalizarValorOrdenacaoProgramacao(infoA.nome);
                    const valorB = normalizarValorOrdenacaoProgramacao(infoB.nome);
                    return compararValoresOrdenacaoProgramacao(valorA, valorB, ordenacaoPDF.direcao);
                });
            } else {
                rotasIds.sort((a, b) =>
                    agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome, 'pt-BR', { numeric: true, sensitivity: 'base' })
                );
            }

            if (rotasIds.length === 0) return;

            // Reserva espaço suficiente para a faixa de data + primeira rota, evitando sobreposição.
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = 20;
            }

            // Bloco visual da data
            doc.setFillColor(fundoBloco[0], fundoBloco[1], fundoBloco[2]);
            doc.setDrawColor(borda[0], borda[1], borda[2]);
            doc.roundedRect(margem, currentY - 5, pageWidth - (margem * 2), 13, 2.2, 2.2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(textoPrincipal[0], textoPrincipal[1], textoPrincipal[2]);
            doc.text(dataTitulo, margem + 5, currentY + 3);
            // Espaço entre a faixa da data e o primeiro bloco de rota.
            currentY += 19;

            const segmentosRotas = [];

            rotasIds.forEach((rotaId, rotaIndex) => {
                const infoRota = agrupado[dataKey][rotaId];
                const nfsOriginais = infoRota.nfs || [];
                const nfsRota = ordenacaoPDF && ordenacaoPDF.coluna !== 'rota'
                    ? ordenarNfsDaRotaProgramacao(nfsOriginais, infoRota, ordenacaoPDF.coluna, ordenacaoPDF.direcao)
                    : nfsOriginais;
                const totalModulos = nfsRota.reduce((total, nf) => total + (Number(nf.qtd) || 0), 0);

                if (currentY > pageHeight - 78) {
                    doc.addPage();
                    currentY = 20;
                }

                // Cabeçalho da rota
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(textoPrincipal[0], textoPrincipal[1], textoPrincipal[2]);
                doc.text(`ROTA: ${infoRota.nome || '—'}`, margem, currentY);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(textoSecundario[0], textoSecundario[1], textoSecundario[2]);
                doc.text(`Transportadora: ${infoRota.transportadora || '—'}`, margem, currentY + 5);
                doc.text(`NFs: ${nfsRota.length}  •  Módulos: ${totalModulos}`, pageWidth - margem, currentY + 5, { align: 'right' });
                currentY += 10;

                // Guarda o ponto de início do bloco da rota para desenhar
                // um contorno visual próprio ao redor de cada rota.
                const paginaRotaInicial = doc.internal.getCurrentPageInfo().pageNumber;
                const topoRota = currentY - 9;
                const tableBody = nfsRota.map(nf => {
                    const ehRetira = String(nf.tipo_operacao || nf.tipo || '').toLowerCase() === 'retira'
                        || nf.uf === 'RT'
                        || String(nf.status || '').toLowerCase().includes('retira');
                    const destino = ehRetira
                        ? 'RETIRA'
                        : (nf.cidade || nf.destino
                            ? `${nf.cidade || nf.destino}${nf.uf ? `/${nf.uf}` : ''}`
                            : '—');

                    return [
                        nf.numero || '—',
                        destino,
                        (nf.status || '—').toUpperCase(),
                        nf.qtd || 0,
                        (nf.marca || '—').toUpperCase(),
                        nf.potencia || '—',
                        (nf.kam || '—').toUpperCase(),
                        (infoRota.transportadora || '—').toUpperCase()
                    ];
                });

                doc.autoTable({
                    startY: currentY,
                    head: [['NF', 'DESTINO', 'STATUS', 'QTD', 'MARCA', 'POTÊNCIA', 'KAM', 'TRANSPORTADORA']],
                    body: tableBody,
                    theme: 'grid',
                    showHead: 'everyPage',
                    margin: { left: margem, right: margem },
                    styles: {
                        fontSize: 7.1,
                        cellPadding: 2.0,
                        lineColor: [210, 216, 224],
                        lineWidth: 0.12,
                        textColor: textoPrincipal,
                        valign: 'middle'
                    },
                    headStyles: {
                        fillColor: verdeSirius,
                        textColor: [255, 255, 255],
                        fontSize: 7.0,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252]
                    },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 14 },
                        1: { halign: 'left', cellWidth: 34 },
                        2: { halign: 'center', cellWidth: 22 },
                        3: { halign: 'center', cellWidth: 10 },
                        4: { halign: 'center', cellWidth: 22 },
                        5: { halign: 'center', cellWidth: 18 },
                        6: { halign: 'left', cellWidth: 30 },
                        7: { halign: 'left', cellWidth: 32 }
                    },
                    pageBreak: 'auto',
                    rowPageBreak: 'avoid'
                });

                const paginaDepoisDaTabela = doc.internal.getCurrentPageInfo().pageNumber;
                currentY = doc.lastAutoTable.finalY + 9;

                // Registra as páginas ocupadas por esta rota. Se uma tabela
                // ultrapassar uma página, o contorno será fechado por trecho.
                segmentosRotas.push({
                    paginaInicial: paginaRotaInicial,
                    paginaFinal: paginaDepoisDaTabela,
                    topo: topoRota,
                    finalY: doc.lastAutoTable.finalY
                });

                if (rotaIndex < rotasIds.length - 1) {
                    doc.setDrawColor(borda[0], borda[1], borda[2]);
                    doc.setLineWidth(0.25);
                    doc.line(margem, currentY - 4, pageWidth - margem, currentY - 4);
                    currentY += 4;
                }
            });

            // Contorno individual de cada rota. Mantemos as rotas dentro do mesmo
            // card do dia, mas cada grupo recebe uma caixa discreta para facilitar
            // a leitura operacional no PDF.
            segmentosRotas.forEach((segmento) => {
                for (let pagina = segmento.paginaInicial; pagina <= segmento.paginaFinal; pagina++) {
                    // A caixa começa antes do título da rota e acompanha a tabela.
                    // Em páginas de continuação, ela ocupa apenas o trecho daquela página.
                    let topo = pagina === segmento.paginaInicial ? segmento.topo : 12;
                    let bottom = pagina === segmento.paginaFinal ? segmento.finalY + 5 : pageHeight - 13;

                    topo = Math.max(9, topo);
                    bottom = Math.min(pageHeight - 11, bottom);
                    if (bottom <= topo + 4) continue;

                    doc.setPage(pagina);
                    doc.setFillColor(252, 253, 255);
                    doc.setDrawColor(203, 213, 225);
                    doc.setLineWidth(0.35);
                    doc.roundedRect(
                        margem - 2.2,
                        topo,
                        (pageWidth - (margem * 2)) + 4.4,
                        bottom - topo,
                        2.2,
                        2.2,
                        'S'
                    );

                    // Destaque verde apenas no início de cada rota, alinhado ao título.
                    if (pagina === segmento.paginaInicial) {
                        doc.setDrawColor(verdeSirius[0], verdeSirius[1], verdeSirius[2]);
                        doc.setLineWidth(0.9);
                        doc.line(margem - 2.2, topo + 3, margem - 2.2, Math.min(topo + 15, bottom - 3));
                    }
                }
            });

            // Mantém uma separação clara entre dias sem criar uma segunda moldura
            // envolvendo todas as rotas do dia.
            const paginaFinalData = doc.internal.getCurrentPageInfo().pageNumber;
            doc.setPage(paginaFinalData);
            currentY += 11;
        });

        const totalPaginas = doc.getNumberOfPages();
        for (let pagina = 1; pagina <= totalPaginas; pagina++) {
            doc.setPage(pagina);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(textoSecundario[0], textoSecundario[1], textoSecundario[2]);
            doc.text(`Rota Sirius • Página ${pagina} de ${totalPaginas}`, pageWidth - margem, pageHeight - 8, { align: 'right' });
        }

        const filename = specificDate
            ? `programacao-${specificDate}.pdf`
            : `programacao-completa-${agora.toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);

    } catch (err) {
        console.error('Erro na exportação PDF:', err);
        mostrarAviso('Ocorreu um erro ao gerar o PDF. Verifique o console.');
    }
};


// --- HISTÓRICO ESPECÍFICO DA PROGRAMAÇÃO ---

window.renderizarHistoricoProgramacao = async function(termoBusca = "") {
    const container = document.getElementById('programacao-history-container');
    if (!container) return;

    try {
        const { data: rotas, error: errR } = await supabaseClient
            .from("rotas")
            .select("*")
            .eq("status", "finalizada")
            .order("data", { ascending: false });

        if (errR) throw errR;

        const rotaIds = rotas.map(r => r.id);
        const { data: nfs, error: errN } = await supabaseClient
            .from("nfs")
            .select("rota_id, valor_frete")
            .in("rota_id", rotaIds);

        if (errN) throw errN;

        container.innerHTML = "";
        const termo = termoBusca.toLowerCase();

        const historico = rotas.filter(rota => {
            const nomeMatch = (rota.nome || "").toLowerCase().includes(termo);
            if (rota.data && rota.data.includes(termo)) return true;
            return nomeMatch;
        });

        if (historico.length === 0) {
            const msg = termo ? "Nenhum resultado encontrado." : "Nenhuma rota finalizada no histórico da programação.";
            container.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>${msg}</p>`;
            return;
        }

        const agrupado = {};
        historico.forEach(item => {
            const dataKey = item.data || "sem-data";
            if (!agrupado[dataKey]) agrupado[dataKey] = [];
            agrupado[dataKey].push(item);
        });

        const datas = Object.keys(agrupado).sort((a, b) => b.localeCompare(a));

        datas.forEach(dataKey => {
            const section = document.createElement('div');
            section.style.marginBottom = "30px";
            
            let html = `
                <h4 style="color: var(--primary); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 18px; font-size: 14px;">
                    ${formatarDataComDiaSemana(dataKey)}
                </h4>
            `;

            agrupado[dataKey].forEach(rota => {
                const nfsDaRota = nfs.filter(n => n.rota_id === rota.id);
                const totalFrete = nfsDaRota.reduce((acc, n) => acc + Number(n.valor_frete), 0);
                const dataFin = formatarDataHora(rota.finalizada_em);

                html += `
                    <div class="panel-container" style="margin-bottom: 15px; padding: 20px; background: rgba(30, 41, 59, 0.2); border-color: rgba(255,255,255,0.03);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <div>
                                <strong style="font-size: 14px;">Rota: ${rota.nome}</strong><br>
                                <small style="color:var(--text-muted); font-size: 11px;">Finalizada em: ${dataFin}</small>
                            </div>
                            <div style="text-align:right">
                                <span style="color:var(--primary); font-weight:bold;">R$ ${formatar(totalFrete)}</span><br>
                                <small style="color:var(--text-muted)">${nfsDaRota.length} NFs</small>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px;" onclick="copiarResumoHistorico('${rota.id}')">Resumo</button>
                            <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:var(--accent); color:var(--accent);" onclick="retornarRotaProgramacao('${rota.id}')">Retornar para Ativa</button>
                        </div>
                    </div>
                `;
            });

            section.innerHTML = html;
            container.appendChild(section);
        });
    } catch (e) {
        console.error("Erro ao carregar histórico da programação do Supabase:", e);
    }
};

window.retornarRotaProgramacao = async function(id) {
    // Reutiliza a lógica de retornar rota, mas fecha o modal específico de histórico de programação
    await retornarRota(id);
    closeModal(progHistoryModal);
};

// --- LÓGICA DA NOVA PÁGINA DE HISTÓRICO ---

// Referências para os novos elementos do toggle e conteúdo
const newHistoryRoteirizacaoBtn = document.getElementById('new-history-roteirizacao-btn');
const newHistoryProgramacaoBtn = document.getElementById('new-history-programacao-btn');
const newHistoryRoteirizacaoContent = document.getElementById('new-history-roteirizacao-content');
const newHistoryProgramacaoContent = document.getElementById('new-history-programacao-content');
const newHistoryCurrentTitle = document.getElementById('new-history-current-title'); // O span com o título
const newHistoryCount = document.getElementById('new-history-count'); // O span com a contagem

// Estado inicial: 'roteirizacao' por padrão, ou o último salvo
let currentNewHistoryViewMode = localStorage.getItem('new_history_view_mode') || 'roteirizacao';

function toggleNewHistoryViewMode(mode) {
    currentNewHistoryViewMode = mode;
    localStorage.setItem('new_history_view_mode', mode);

    // Atualiza a classe 'active' nos botões
    if (newHistoryRoteirizacaoBtn) {
        newHistoryRoteirizacaoBtn.classList.toggle('active', mode === 'roteirizacao');
    }
    if (newHistoryProgramacaoBtn) {
        newHistoryProgramacaoBtn.classList.toggle('active', mode === 'programacao');
    }

    // Mostra/esconde as áreas de conteúdo
    if (newHistoryRoteirizacaoContent) {
        newHistoryRoteirizacaoContent.classList.toggle('hidden', mode !== 'roteirizacao');
    }
    if (newHistoryProgramacaoContent) {
        newHistoryProgramacaoContent.classList.toggle('hidden', mode !== 'programacao');
    }

    // Atualiza o título e a contagem
    if (newHistoryCurrentTitle) {
        newHistoryCurrentTitle.innerText = mode === 'roteirizacao' ? 'Rotas Finalizadas' : 'Programação Finalizada';
    }
    if (newHistoryCount) {
        if (mode === 'roteirizacao') {
            newHistoryCount.style.color = 'var(--accent)';
            newHistoryCount.style.background = 'rgba(56, 189, 248, 0.1)';
            newHistoryCount.style.borderColor = 'rgba(56, 189, 248, 0.2)';
            newHistoryCount.innerText = 'Carregando...'; // Placeholder enquanto carrega
            carregarNovoHistorico(); // Carrega os dados para o modo Roteirização
        } else { // 'programacao'
            newHistoryCount.style.color = 'var(--accent)';
            newHistoryCount.style.background = 'rgba(56, 189, 248, 0.1)';
            newHistoryCount.style.borderColor = 'rgba(56, 189, 248, 0.2)';
            newHistoryCount.style.color = 'var(--primary)'; // Corrigido para primary, como na programação normal
            newHistoryCount.style.background = 'rgba(34, 197, 94, 0.1)'; // Corrigido para primary, como na programação normal
            newHistoryCount.style.borderColor = 'rgba(34, 197, 94, 0.2)'; // Corrigido para primary, como na programação normal
            newHistoryCount.innerText = 'Carregando...';
            newHistoryCurrentTitle.innerText = 'Programação Finalizada'; // Atualiza o título
            carregarNovoHistoricoProgramacao();
        }
    }
}

window.abrirModalDetalhesRota = async function(rotaId) {
    if (!rotaId) return;
    const isViewer = !usuarioPodeAcao('Histórico', 'observacao');

    const content = document.getElementById('route-details-content');
    if (!content) return;

    // Feedback visual de carregamento
    content.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Buscando informações da rota...</p>`;
    openModal(routeDetailsModal);

    try {
        // Busca os dados da rota e das NFs em paralelo para melhor performance
        const [rotaRes, nfsRes] = await Promise.all([
            supabaseClient.from("rotas").select("*").eq("id", rotaId).single(),
            supabaseClient.from("nfs").select("*").eq("rota_id", rotaId).order("numero", { ascending: true })
        ]);

        if (rotaRes.error) throw rotaRes.error;
        if (nfsRes.error) throw nfsRes.error;

        const rota = rotaRes.data;
        const nfs = nfsRes.data || [];
        const totalFrete = nfs.reduce((acc, nf) => acc + Number(nf.valor_frete || 0), 0);
        
        const dataRota = rota.data ? rota.data.split('-').reverse().join('/') : '---';
        const dataFin = formatarDataHora(rota.finalizada_em);

        // Construção do conteúdo dinâmico do modal
        content.innerHTML = `
            <!-- Área de Resumo -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 25px; padding: 20px; background: rgba(30, 41, 59, 0.4); border-radius: 12px; border: 1px solid var(--border);">
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Nome da Rota</label>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${rota.nome}</div>
                </div>
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Data da Rota</label>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${dataRota}</div>
                </div>
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Finalizada em</label>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${dataFin}</div>
                </div>
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Transportadora</label>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${rota.transportadora || '---'}</div>
                </div>
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Quantidade NFs</label>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${nfs.length}</div>
                </div>
                <div>
                    <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Valor Total</label>
                    <div style="font-weight: 700; color: var(--primary); font-size: 14px;">R$ ${formatar(totalFrete)}</div>
                </div>
            </div>

            <!-- Tabela de NFs Detalhada -->
            <div style="overflow-x: auto; max-height: 400px; border-radius: 8px; border: 1px solid var(--border);">
                <table class="data-table" style="margin-top: 0; width: 100%;">
                    <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-sidebar);">
                        <tr>
                            <th>NF</th>
                            <th>DESTINO</th>
                            <th style="text-align: center;">TIPO</th>
                            <th style="text-align: center;">QTD</th>
                            <th>MARCA</th>
                            <th>POTÊNCIA</th>
                            <th>KAM</th>
                            <th>TRANSPORTADORA</th>
                            <th style="text-align: center;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nfs.map(nf => `
                            <tr>
                                <td><strong>${nf.numero}</strong></td>
                                <td style="font-size: 11px;">${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</td>
                                <td style="text-align: center; text-transform: capitalize; font-size: 11px;">${nf.tipo || '---'}</td>
                                <td style="text-align: center; font-size: 11px;">${nf.qtd || '---'}</td>
                                <td style="font-size: 11px;">${nf.marca || '---'}</td>
                                <td style="font-size: 11px;">${nf.potencia || '---'}</td>
                                <td style="font-size: 11px;">${nf.kam || '---'}</td>
                                <td style="font-size: 11px;">${rota.transportadora || '---'}</td>
                                <td style="text-align: center;"><span style="color: var(--text-muted); font-size: 10px;">${nf.status || '---'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Área de Observação -->
            <div style="margin-top: 25px; padding: 20px; background: rgba(30, 41, 59, 0.4); border-radius: 12px; border: 1px solid var(--border);">
                <label style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Observação da Rota Finalizada</label>
                <textarea id="hist-obs-${rota.id}" ${isViewer ? 'readonly' : ''} placeholder="Adicione uma observação sobre esta rota..." style="width: 100%; padding: 12px; border: 1px solid var(--border); background: #0f172a; color: #e2e8f0; border-radius: 8px; outline: none; resize: vertical; min-height: 80px; font-size: 13px; transition: border-color 0.2s; ${isViewer ? 'cursor: default;' : ''}">${rota.observacao_historico || ''}</textarea>
                ${!isViewer ? `
                <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                    <button class="btn" style="width: auto; font-size: 11px; height: 32px; background: var(--primary); border-color: var(--primary); color: white;" onclick="salvarObservacaoHistorico('${rota.id}')">Salvar Observação</button>
                </div>` : ''}
            </div>
        `;

    } catch (err) {
        console.error("Erro ao carregar detalhes da rota:", err);
        content.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 40px;">Erro ao carregar os dados desta rota no servidor.</p>`;
    }
};

window.salvarObservacaoHistorico = async function(rotaId) {
    if (!usuarioPodeAcao('Histórico', 'observacao')) {
        mostrarAviso('⛔ Você não possui permissão para salvar observações.');
        return;
    }
    const textarea = document.getElementById(`hist-obs-${rotaId}`);
    if (!textarea) return;

    const novaObs = textarea.value.trim();

    try {
        const { error } = await supabaseClient
            .from("rotas")
            .update({ observacao_historico: novaObs })
            .eq("id", rotaId);

        if (error) throw error;
        
        // Fecha o modal após o salvamento bem-sucedido
        closeModal(routeDetailsModal);

        // Atualiza a visualização principal (Dashboard)
        await carregarRotas();

        // Atualiza a lista da página de histórico se estiver aberta
        if (newHistoryView && !newHistoryView.classList.contains('hidden')) {
            if (currentNewHistoryViewMode === 'roteirizacao') {
                await carregarNovoHistorico();
            } else {
                await carregarNovoHistoricoProgramacao();
            }
        }

        mostrarAviso("Observação salva com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar observação da rota:", err);
        mostrarAviso("Erro ao salvar observação no servidor.");
    }
};

async function carregarNovoHistorico() {
    // Histórico de Roteirização segue as mesmas regras visuais e de interação
    // da tela principal: filtro global, busca multi-campo, grid/lista e cards retráteis.
    if (currentNewHistoryViewMode !== 'roteirizacao') return;

    const container = document.getElementById('new-history-roteirizacao-content');
    const countElem = document.getElementById('new-history-count');
    if (!container) return;

    const termoTexto = filtroNomeNewHistory ? filtroNomeNewHistory.value.toLowerCase().trim() : "";
    const filtroData = obterFiltroDataGlobal();
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Carregando histórico...</p>`;

    try {
        const { data: rotas, error: errR } = await supabaseClient
            .from("rotas")
            .select("*")
            .eq("status", "finalizada")
            .order("finalizada_em", { ascending: false });
        if (errR) throw errR;

        if (!rotas || rotas.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma rota finalizada encontrada.</p>`;
            if (countElem) countElem.innerText = "0 Rotas";
            return;
        }

        const rotaIds = rotas.map(r => r.id);
        const { data: nfs, error: errN } = rotaIds.length
            ? await supabaseClient.from("nfs").select("*").in("rota_id", rotaIds)
            : { data: [], error: null };
        if (errN) throw errN;

        // Mesma lógica de pesquisa da Roteirização: rota, transportadora,
        // NF, destino e KAM. A busca na NF retorna a rota inteira.
        const rotasFiltradas = rotas.filter(rota => {
            const nfsDaRota = (nfs || []).filter(n => n.rota_id === rota.id);
            const nomeMatch = (rota.nome || '').toLowerCase().includes(termoTexto);
            const transportadoraMatch = (rota.transportadora || '').toLowerCase().includes(termoTexto);
            const nfMatch = nfsDaRota.some(nf => {
                const numero = String(nf.numero || '').toLowerCase();
                const destino = String(nf.cidade || nf.destino || '').toLowerCase();
                const uf = String(nf.uf || '').toLowerCase();
                const kam = String(nf.kam || '').toLowerCase();
                return numero.includes(termoTexto) || destino.includes(termoTexto) || uf.includes(termoTexto) || kam.includes(termoTexto);
            });
            return (nomeMatch || transportadoraMatch || nfMatch) && dataDentroDoFiltroGlobal(rota.data, filtroData);
        });

        if (countElem) countElem.innerText = `${rotasFiltradas.length} Rota(s)`;
        if (rotasFiltradas.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum resultado encontrado para os filtros aplicados.</p>`;
            return;
        }

        // O histórico usa exatamente o mesmo modo de visualização salvo da Roteirização.
        const viewMode = localStorage.getItem('rota_view_mode') || 'grid';
        container.classList.toggle('list-view', viewMode === 'list');
        container.innerHTML = "";

        rotasFiltradas.forEach(rota => {
            const nfsDaRota = (nfs || []).filter(n => n.rota_id === rota.id);
            const total = nfsDaRota.reduce((acc, n) => acc + Number(n.valor_frete || 0), 0);
            const hasObs = !!(rota.observacao_historico && rota.observacao_historico.trim() !== "");
            const iconStyle = hasObs ? 'color: #fbbf24; opacity: 1;' : 'color: var(--accent); opacity: 0.7;';
            const dataFin = formatarDataHora(rota.finalizada_em);
            const dataRotaFormatada = rota.data ? rota.data.split('-').reverse().join('/') : '---';
            const recolhida = JSON.parse(localStorage.getItem('rotas_recolhidas') || '[]').map(String).includes(String(rota.id));
            const podeResumo = usuarioPodeAcao('Histórico', 'visualizar_detalhes');
            const podeRetornar = usuarioPodeAcao('Histórico', 'retornar_rota');
            const podeExcluir = usuarioPodeAcao('Histórico', 'excluir_historico');

            const card = document.createElement('div');
            card.className = `rota-card${recolhida ? ' collapsed' : ''}`;
            card.style.cursor = 'default';

            const displayNome = rota.data
                ? `${rota.nome} - ${rota.data.split('-')[2]}/${rota.data.split('-')[1]}`
                : rota.nome;

            card.innerHTML = `
                <div class="rota-header">
                    <div>
                        <div class="rota-title-group">
                            <h3>${displayNome}</h3>
                            <button type="button" class="rota-collapse-btn" title="${recolhida ? 'Expandir rota' : 'Recolher rota'}" aria-label="${recolhida ? 'Expandir rota' : 'Recolher rota'}" aria-expanded="${!recolhida}" onclick="event.stopPropagation(); alternarRotaRecolhida('${rota.id}', this)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            <div class="rota-actions">
                                <button class="icon-btn info" title="${hasObs ? 'Ver detalhes da rota (Possui observação)' : 'Ver detalhes da rota'}" style="${iconStyle}" onclick="event.stopPropagation(); abrirModalDetalhesRota('${rota.id}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </button>
                            </div>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Data: ${dataRotaFormatada} | Finalizada em: ${dataFin}</div>
                        ${rota.transportadora ? `<div style="font-size: 11px; color: var(--text-muted);">Transportadora: ${rota.transportadora}</div>` : ''}
                        <span>${nfsDaRota.length} NFs</span>
                    </div>
                    <div class="valor">R$ ${formatar(total)}</div>
                </div>

                <div class="rota-body">
                    <div class="nf-header"><span>NF</span><span>DESTINO</span><span>FRETE</span><span></span></div>
                </div>

                <div class="rota-footer">
                    ${podeResumo ? `<button class="btn btn-outline" onclick="event.stopPropagation(); copiarResumoHistorico('${rota.id}')">Copiar Resumo</button>` : ''}
                    ${podeRetornar ? `<button class="btn btn-outline" style="border-color: var(--accent); color: var(--accent);" onclick="event.stopPropagation(); retornarRotaNovaPagina('${rota.id}')">Retornar para Ativa</button>` : ''}
                </div>
            `;

            const body = card.querySelector('.rota-body');
            nfsDaRota.forEach(nf => {
                const linha = document.createElement('div');
                linha.className = 'nf-row';
                const temObs = nf.observacao && nf.observacao.trim() !== '';
                const infoStyle = temObs ? 'color: #fbbf24; opacity: 1;' : '';
                const infoTitle = temObs ? 'Informações (Possui Observação)' : 'Informações';
                linha.innerHTML = `
                    <span>NF ${nf.numero}</span>
                    <span>${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</span>
                    <span>R$ ${formatar(nf.valor_frete)}</span>
                    <button class="icon-btn info" title="${infoTitle}" style="padding:2px; ${infoStyle}" onclick="event.stopPropagation(); abrirModalInfoNF('${nf.id}');">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </button>
                `;
                body.appendChild(linha);
            });
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Erro ao carregar novo histórico:', err);
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Erro ao carregar dados do servidor.</p>`;
    }
}

let currentRouteDetailsId = null;

function obterIndicadorOrdenacaoHistoricoProgramacao(dataKey, coluna) {
    const ordenacao = ordenacaoHistoricoProgramacaoPorData[dataKey];
    if (!ordenacao || ordenacao.coluna !== coluna) return '↕';
    return ordenacao.direcao === 'asc' ? '↑' : '↓';
}

window.alternarOrdenacaoHistoricoProgramacao = function(dataKey, coluna) {
    const atual = ordenacaoHistoricoProgramacaoPorData[dataKey];
    if (atual?.coluna === coluna) {
        atual.direcao = atual.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacaoHistoricoProgramacaoPorData[dataKey] = { coluna, direcao: 'asc' };
    }
    carregarNovoHistoricoProgramacao();
};

function renderizarCabecalhoOrdenavelHistoricoProgramacao(dataKey) {
    const colunas = ['nf', 'destino', 'tipo', 'qtd', 'marca', 'potencia', 'kam', 'rota', 'transportadora', 'status'];
    return colunas.map(coluna => `
        <th class="programacao-sortable-header">
            <button type="button" class="programacao-sort-button"
                onclick="window.alternarOrdenacaoHistoricoProgramacao('${String(dataKey).replace(/'/g, "\\'")}', '${coluna}')"
                title="Ordenar ${obterLabelColunaProgramacao(coluna)}">
                <span>${obterLabelColunaProgramacao(coluna)}</span>
                <span class="programacao-sort-indicator" aria-hidden="true">${obterIndicadorOrdenacaoHistoricoProgramacao(dataKey, coluna)}</span>
            </button>
        </th>
    `).join('');
}

async function carregarNovoHistoricoProgramacao() {
    if (currentNewHistoryViewMode !== 'programacao') return;

    const container = document.getElementById('new-history-programacao-content');
    const countElem = document.getElementById('new-history-count');
    if (!container) return;

    const termoTexto = filtroNomeNewHistory ? filtroNomeNewHistory.value : '';
    const filtroData = obterFiltroDataGlobal();
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:40px;">Carregando histórico de programação...</p>`;

    try {
        const { data: rotas, error: errR } = await supabaseClient
            .from('rotas').select('*').eq('status', 'finalizada').order('data', { ascending: false });
        if (errR) throw errR;

        if (!rotas || rotas.length === 0) {
            container.innerHTML = `<div class="panel-container"><p style="text-align:center; color:var(--text-muted); padding:20px;">Nenhuma programação finalizada encontrada.</p></div>`;
            if (countElem) countElem.innerText = '0 Rotas';
            return;
        }

        const rotaIds = rotas.map(r => r.id);
        const { data: nfs, error: errN } = await supabaseClient
            .from('nfs').select('*').in('rota_id', rotaIds);
        if (errN) throw errN;

        const rotasFiltradas = rotas.filter(rota => dataDentroDoFiltroGlobal(rota.data, filtroData));
        const agrupado = agruparDadosProgramacao(rotasFiltradas, nfs || [], termoTexto);
        const datas = Object.keys(agrupado).sort((a, b) => {
            if (a === 'sem-data') return 1;
            if (b === 'sem-data') return -1;
            return b.localeCompare(a);
        });

        let rotasContadas = 0;
        datas.forEach(dataKey => { rotasContadas += Object.keys(agrupado[dataKey] || {}).length; });
        if (countElem) countElem.innerText = `${rotasContadas} Rota(s)`;

        if (!rotasContadas) {
            container.innerHTML = `<div class="panel-container"><p style="text-align:center; color:var(--text-muted); padding:20px;">Nenhum resultado encontrado para os filtros aplicados.</p></div>`;
            return;
        }

        container.innerHTML = '';
        datas.forEach(dataKey => {
            const section = document.createElement('div');
            section.className = 'panel-container';
            section.style.marginBottom = '32px';

            const ordenacao = ordenacaoHistoricoProgramacaoPorData[dataKey] || null;
            let rotasIds = Object.keys(agrupado[dataKey] || {});

            if (ordenacao?.coluna === 'rota') {
                rotasIds.sort((a, b) => compararValoresOrdenacaoProgramacao(
                    normalizarValorOrdenacaoProgramacao(agrupado[dataKey][a].nome),
                    normalizarValorOrdenacaoProgramacao(agrupado[dataKey][b].nome),
                    ordenacao.direcao
                ));
            } else {
                rotasIds.sort((a, b) => agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
            }

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px;">
                    <h3 style="margin:0; color:var(--primary); font-size:15px;">${formatarDataComDiaSemana(dataKey)}</h3>
                    <span style="font-size:11px; color:var(--text-muted);">${rotasIds.length} rota(s)</span>
                </div>
                <div class="table-scroll">
                <table class="data-table programacao-data-table">
                    <thead><tr>${renderizarCabecalhoOrdenavelHistoricoProgramacao(dataKey)}</tr></thead>
                    <tbody>
            `;

            rotasIds.forEach((rotaId, indiceRota) => {
                const infoRota = agrupado[dataKey][rotaId];
                if (indiceRota > 0) {
                    html += `<tr class="programacao-route-separator" aria-hidden="true"><td colspan="10"></td></tr>`;
                }
                const hasObs = infoRota.observacao_historico && infoRota.observacao_historico.trim() !== '';
                const iconStyle = hasObs ? 'color:#fbbf24; opacity:1;' : 'color:var(--accent); opacity:.7;';
                html += `
                    <tr class="programacao-route-heading">
                        <td colspan="10">
                            <div class="programacao-route-heading-content">
                                <span class="programacao-route-heading-label">ROTA</span>
                                <span class="programacao-route-heading-name">${infoRota.nome}</span>
                                ${infoRota.transportadora ? `<span class="programacao-route-heading-transportadora">${infoRota.transportadora}</span>` : ''}
                                <button class="icon-btn info" title="${hasObs ? 'Ver detalhes da rota (Possui observação)' : 'Ver detalhes da rota'}" style="${iconStyle} padding:2px;" onclick="event.stopPropagation(); abrirModalDetalhesRota('${rotaId}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;

                const nfsOrdenadas = ordenacao && ordenacao.coluna !== 'rota'
                    ? ordenarNfsDaRotaProgramacao(infoRota.nfs, infoRota, ordenacao.coluna, ordenacao.direcao)
                    : infoRota.nfs;

                nfsOrdenadas.forEach(nf => {
                    html += `
                        <tr>
                            <td><strong>${nf.numero}</strong></td>
                            <td>${nf.uf === 'RT' ? 'RETIRA' : (nf.cidade || nf.destino) + '/' + nf.uf}</td>
                            <td style="text-transform:capitalize; text-align:center">${nf.tipo || nf.tipo_operacao || '---'}</td>
                            <td>${nf.qtd || '---'}</td>
                            <td>${nf.marca || '---'}</td>
                            <td>${nf.potencia || '---'}</td>
                            <td>${nf.kam || '---'}</td>
                            <td><span style="background:var(--border); padding:2px 6px; border-radius:4px; font-size:11px; white-space:nowrap;">${infoRota.nome}</span></td>
                            <td>${infoRota.transportadora || '---'}</td>
                            <td style="text-align:center"><span style="color:var(--text-muted); font-size:11px;">${nf.status || '---'}</span></td>
                        </tr>
                    `;
                });
            });

            html += '</tbody></table></div>';
            section.innerHTML = html;
            container.appendChild(section);
        });
    } catch (err) {
        console.error('Erro ao carregar histórico de programação:', err);
        container.innerHTML = `<p style="text-align:center; color:#ef4444; padding:40px;">Erro ao carregar dados do servidor.</p>`;
    }
}

window.retornarRotaNovaPagina = async function(rotaId) {
    if (!usuarioPodeAcao('Histórico', 'retornar_rota')) { mostrarAviso('⛔ Você não possui permissão para retornar rota.'); return; }
      confirmarAcao("Deseja retornar esta rota para a tela principal (Ativa)?", async () => {
        await retornarRota(rotaId);
        carregarNovoHistorico();
    });
};

// Adiciona event listeners para os botões de alternância
if (newHistoryRoteirizacaoBtn) {
    newHistoryRoteirizacaoBtn.addEventListener('click', () => toggleNewHistoryViewMode('roteirizacao'));
}

if (newHistoryProgramacaoBtn) {
    newHistoryProgramacaoBtn.addEventListener('click', () => toggleNewHistoryViewMode('programacao'));
}

// FORMATAR VALOR
function formatar(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  });
}

// INICIAR
function carregarTudo() {
  console.log('carregarTudo: Iniciando carregamento de NFs e Rotas.');
  carregarNFs();
  carregarRotas();
}

// --- LÓGICA DO DASHBOARD ADMIN ---
let charts = {}; // Para armazenar as instâncias e destruir antes de recriar

async function carregarDashboard() {
    console.log("Dashboard KPI: processando indicadores...");
    try {
        const [{ data: nfs, error: errN }, { data: todasAsRotas, error: errR }] = await Promise.all([
            supabaseClient.from("nfs").select("*"),
            supabaseClient.from("rotas").select("*")
        ]);
        if (errN || errR) throw new Error("Erro ao buscar dados para o dashboard.");

        nfsDashboardCache = nfs || [];
        rotasDashboardCache = todasAsRotas || [];
        if (pesquisaNfPainel?.value) renderizarResultadoPesquisaNfPainel();

        const filtro = obterFiltroDataGlobal();
        const rotasPorId = new Map((todasAsRotas || []).map(r => [r.id, r]));
        const nfsPeriodo = (nfs || []).filter(n => dataDentroDoFiltroGlobal(obterDataReferenciaNF(n, rotasPorId), filtro));
        const rotasPeriodo = (todasAsRotas || []).filter(r => dataDentroDoFiltroGlobal(r.data, filtro));
        const rotasAtivas = rotasPeriodo.filter(r => r.status === 'ativa');
        const rotasFinalizadas = rotasPeriodo.filter(r => r.status === 'finalizada');
        const rotaAtivaIds = new Set(rotasAtivas.map(r => r.id));

        const totalNfs = nfsPeriodo.length;
        const produzidas = nfsPeriodo.filter(n => n.status === 'Produzida').length;
        const expedidas = nfsPeriodo.filter(n => n.status === 'Expedida').length;
        const finalizadas = nfsPeriodo.filter(n => n.rota_id && rotasPorId.get(n.rota_id)?.status === 'finalizada').length;
        const pendentes = nfsPeriodo.filter(n => !n.rota_id).length;
        const semStatus = nfsPeriodo.filter(n => !n.status || !String(n.status).trim()).length;
        const semTransportadora = rotasPeriodo.filter(r => !r.transportadora || !String(r.transportadora).trim()).length;
        const transporte = nfsPeriodo.filter(n => n.uf !== 'RT').length;
        const retirada = nfsPeriodo.filter(n => n.uf === 'RT').length;
        const volume = nfsPeriodo.reduce((s, n) => s + (Number(n.qtd) || 0), 0);
        const taxa = (v, total) => total ? Math.round((v / total) * 100) : 0;
        const pctConclusao = taxa(finalizadas, totalNfs);
        const pctExpedicao = taxa(expedidas, totalNfs);
        const mediaNfsRota = rotasPeriodo.length ? (totalNfs / rotasPeriodo.length).toFixed(1).replace('.', ',') : '0';

        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        const setPct = (id, barId, value) => { setText(id, `${value}%`); const bar = document.getElementById(barId); if (bar) bar.style.width = `${Math.min(100, value)}%`; };
        const pctSub = (value) => `${taxa(value, totalNfs)}% do total`;

        setText('stat-nfs-total', totalNfs);
        setText('stat-nfs-total-sub', `${transporte} transporte · ${retirada} retirada`);
        setText('stat-nfs-produzidas', produzidas); setText('stat-nfs-produzidas-sub', pctSub(produzidas));
        setText('stat-nfs-expedidas', expedidas); setText('stat-nfs-expedidas-sub', pctSub(expedidas));
        setText('stat-nfs-finalizadas', finalizadas); setText('stat-nfs-finalizadas-sub', pctSub(finalizadas));
        setText('stat-nfs-pendentes', pendentes); setText('stat-nfs-pendentes-sub', pendentes ? 'Aguardando rota' : 'Nenhuma pendência');
        setText('stat-rotas-total', rotasPeriodo.length); setText('stat-rotas-total-sub', `${rotasFinalizadas.length} finalizadas`);
        setPct('kpi-taxa-conclusao', 'kpi-taxa-conclusao-bar', pctConclusao);
        setPct('kpi-taxa-expedicao', 'kpi-taxa-expedicao-bar', pctExpedicao);
        setText('kpi-media-nfs-rota', mediaNfsRota);
        setText('kpi-volume-total', volume.toLocaleString('pt-BR'));
        setText('kpi-transporte', `${transporte} NFs`); setText('kpi-retirada', `${retirada} NFs`);
        setText('kpi-sem-transportadora', semTransportadora); setText('kpi-sem-status', semStatus);
        setText('kpi-rotas-ativas', rotasAtivas.length); setText('kpi-rotas-finalizadas', rotasFinalizadas.length);

        const light = document.body.classList.contains('light-theme');
        const gridColor = light ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.06)';
        const textColor = light ? '#64748b' : '#94a3b8';
        const green = '#22c55e', blue = '#38bdf8', purple = '#a855f7', orange = '#f59e0b';

        const hideMsg = id => document.getElementById(id)?.classList.add('hidden');
        const showMsg = id => document.getElementById(id)?.classList.remove('hidden');
        const has = arr => arr.some(v => v > 0);

        // STATUS
        const statusData = {
            'Sem status': semStatus,
            'Em produção': nfsPeriodo.filter(n => n.status === 'Em produção').length,
            'Produzida': produzidas,
            'Expedida': expedidas
        };
        if (has(Object.values(statusData))) {
            hideMsg('msg-status-nfs');
            renderChart('chart-status-nfs', 'doughnut', { labels: Object.keys(statusData), datasets: [{ data: Object.values(statusData), backgroundColor: [light ? '#cbd5e1' : '#475569', blue, green, purple], borderWidth: 0 }] }, { cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 10 } } } } });
        } else showMsg('msg-status-nfs');

        // EVOLUÇÃO DIÁRIA
        const dias = {};
        nfsPeriodo.forEach(n => {
            const d = obterDataReferenciaNF(n, rotasPorId); if (!d) return;
            if (!dias[d]) dias[d] = { produzidas: 0, expedidas: 0, finalizadas: 0 };
            if (n.status === 'Produzida') dias[d].produzidas++;
            if (n.status === 'Expedida') dias[d].expedidas++;
            if (n.rota_id && rotasPorId.get(n.rota_id)?.status === 'finalizada') dias[d].finalizadas++;
        });
        const datas = Object.keys(dias).sort();
        if (datas.length) {
            hideMsg('msg-evolucao-operacional');
            renderChart('chart-evolucao-operacional', 'line', { labels: datas.map(d => d.split('-').reverse().slice(0,2).join('/')), datasets: [
                { label: 'Produzidas', data: datas.map(d => dias[d].produzidas), borderColor: green, backgroundColor: 'rgba(34,197,94,.08)', tension: .35, fill: true, pointRadius: 3 },
                { label: 'Expedidas', data: datas.map(d => dias[d].expedidas), borderColor: blue, backgroundColor: 'transparent', tension: .35, pointRadius: 3 },
                { label: 'Finalizadas', data: datas.map(d => dias[d].finalizadas), borderColor: purple, backgroundColor: 'transparent', tension: .35, pointRadius: 3 }
            ] }, { plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 10 } } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: textColor } } } });
        } else showMsg('msg-evolucao-operacional');

        // TIPOS
        if (transporte + retirada) {
            hideMsg('msg-tipos-nf');
            renderChart('chart-tipos-nf', 'doughnut', { labels: ['Transporte', 'Retirada'], datasets: [{ data: [transporte, retirada], backgroundColor: [green, orange], borderWidth: 0 }] }, { cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 10 } } } } });
        } else showMsg('msg-tipos-nf');

        // DESTINOS
        const destinos = {};
        nfsPeriodo.filter(n => n.uf !== 'RT').forEach(n => { const d = (n.cidade || n.destino || 'SEM DESTINO').trim().toUpperCase(); destinos[d] = (destinos[d] || 0) + 1; });
        const topDestinos = Object.entries(destinos).sort((a,b)=>b[1]-a[1]).slice(0,6);
        if (topDestinos.length) {
            hideMsg('msg-destinos');
            renderChart('chart-destinos', 'bar', { labels: topDestinos.map(x=>x[0]), datasets: [{ label:'NFs', data:topDestinos.map(x=>x[1]), backgroundColor:'rgba(56,189,248,.45)', borderColor:blue, borderWidth:1, borderRadius:5 }] }, { indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor,stepSize:1}},y:{grid:{display:false},ticks:{color:textColor,font:{size:10}}}} });
        } else showMsg('msg-destinos');

        // ROTAS POR DIA
        const rotasDia = {}; rotasPeriodo.forEach(r => { if (r.data) rotasDia[r.data] = (rotasDia[r.data] || 0) + 1; });
        const datasRotas = Object.keys(rotasDia).sort();
        if (datasRotas.length) {
            hideMsg('msg-rotas-dia');
            renderChart('chart-rotas-dia','bar',{labels:datasRotas.map(d=>d.split('-').reverse().slice(0,2).join('/')),datasets:[{label:'Rotas',data:datasRotas.map(d=>rotasDia[d]),backgroundColor:'rgba(34,197,94,.42)',borderColor:green,borderWidth:1,borderRadius:5}]},{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor,stepSize:1}},x:{grid:{display:false},ticks:{color:textColor}}}});
        } else showMsg('msg-rotas-dia');

        // RANKING TRANSPORTADORAS
        const transp = {};
        rotasPeriodo.forEach(r => { const nome=(r.transportadora||'NÃO INFORMADA').trim().toUpperCase(); if(!transp[nome]) transp[nome]={rotas:0,nfs:0}; transp[nome].rotas++; transp[nome].nfs += nfsPeriodo.filter(n=>n.rota_id===r.id).length; });
        const topTransp=Object.entries(transp).sort((a,b)=>b[1].nfs-a[1].nfs).slice(0,5);
        const rt=document.getElementById('ranking-transportadoras');
        if(rt) rt.innerHTML=topTransp.length ? topTransp.map(([nome,v],i)=>`<div class="ranking-item"><span><b class="ranking-index">${i+1}</b>${nome}</span><strong>${v.nfs} NFs <em>${v.rotas} rotas</em></strong></div>`).join('') : '<p class="kpi-empty">Sem dados no período.</p>';

        // RANKING KAMS
        const kams={}; nfsPeriodo.forEach(n=>{const k=(n.kam||'SEM RESPONSÁVEL').trim().toUpperCase(); kams[k]=(kams[k]||0)+1;});
        const topKams=Object.entries(kams).sort((a,b)=>b[1]-a[1]).slice(0,5); const rk=document.getElementById('ranking-kams');
        if(rk) rk.innerHTML=topKams.length ? topKams.map(([nome,q],i)=>`<div class="ranking-item"><span><b class="ranking-index">${i+1}</b>${nome}</span><strong>${q} NFs <em>${taxa(q,totalNfs)}%</em></strong></div>`).join('') : '<p class="kpi-empty">Sem dados no período.</p>';

        // ALERTAS
        const alertas=[
            ['NFs sem rota',pendentes,'warning'],
            ['NFs sem status',semStatus,'warning'],
            ['Rotas sem transportadora',semTransportadora,'danger'],
            ['Rotas ativas',rotasAtivas.length,'info']
        ];
        const ac=document.getElementById('alerts-summary');
        if(ac) ac.innerHTML=alertas.map(([label,q,type])=>`<div class="alert-item ${type}"><span><i></i>${label}</span><strong>${q}</strong></div>`).join('');

    } catch (err) { console.error("Erro ao carregar Dashboard KPI:", err); }
}

function escaparHtmlPainel(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizarBuscaPainel(valor) {
    return String(valor ?? '').trim().toLowerCase();
}

function formatarDataPainel(data) {
    if (!data) return '—';
    const partes = String(data).slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function obterTipoNfPainel(nf) {
    return String(nf?.uf || '').toUpperCase() === 'RT' ? 'Retirada' : 'Transporte';
}

function renderizarResultadoPesquisaNfPainel() {
    if (!resultadoPesquisaNfPainel) return;
    const termo = normalizarBuscaPainel(pesquisaNfPainel?.value);
    if (!termo) {
        resultadoPesquisaNfPainel.classList.add('hidden');
        resultadoPesquisaNfPainel.innerHTML = '';
        limparPesquisaNfPainel?.classList.add('hidden');
        return;
    }

    limparPesquisaNfPainel?.classList.remove('hidden');
    const encontrados = nfsDashboardCache
        .filter(nf => normalizarBuscaPainel(nf.numero).includes(termo))
        .sort((a, b) => {
            const aExato = normalizarBuscaPainel(a.numero) === termo ? 0 : 1;
            const bExato = normalizarBuscaPainel(b.numero) === termo ? 0 : 1;
            return aExato - bExato;
        })
        .slice(0, 8);

    resultadoPesquisaNfPainel.classList.remove('hidden');

    if (!encontrados.length) {
        resultadoPesquisaNfPainel.innerHTML = `
          <div class="painel-nf-search-empty">
            <span>NF não encontrada</span>
            <small>Nenhuma nota corresponde a <strong>${escaparHtmlPainel(pesquisaNfPainel.value)}</strong>.</small>
          </div>`;
        return;
    }

    const rotasPorId = new Map(rotasDashboardCache.map(r => [r.id, r]));
    resultadoPesquisaNfPainel.innerHTML = `
      <div class="painel-nf-search-head">
        <div><strong>${encontrados.length}</strong> resultado(s) encontrado(s)</div>
        ${encontrados.length > 1 ? '<small>Mostrando até 8 resultados</small>' : ''}
      </div>
      <div class="painel-nf-search-table-wrap">
        <table class="painel-nf-search-table">
          <thead><tr>
            <th>NF</th><th>Tipo</th><th>Destino</th><th>Qtd</th><th>Marca</th><th>Potência</th><th>KAM</th><th>Rota</th><th>Transportadora</th><th>Status</th><th>Data</th>
          </tr></thead>
          <tbody>
            ${encontrados.map(nf => {
                const rota = nf.rota_id ? rotasPorId.get(nf.rota_id) : null;
                const tipo = obterTipoNfPainel(nf);
                const destino = tipo === 'Retirada' ? '—' : (nf.destino || nf.cidade || '—');
                const status = nf.status || (rota ? (rota.status === 'finalizada' ? 'Finalizada' : 'Em rota') : 'Pendente');
                return `<tr>
                  <td><strong>${escaparHtmlPainel(nf.numero || '—')}</strong></td>
                  <td><span class="painel-nf-type ${tipo === 'Retirada' ? 'retirada' : 'transporte'}">${tipo}</span></td>
                  <td>${escaparHtmlPainel(destino)}</td>
                  <td>${escaparHtmlPainel(nf.qtd ?? '—')}</td>
                  <td>${escaparHtmlPainel(nf.marca || '—')}</td>
                  <td>${escaparHtmlPainel(nf.potencia || '—')}</td>
                  <td>${escaparHtmlPainel(nf.kam || '—')}</td>
                  <td>${escaparHtmlPainel(rota?.nome || 'Sem rota')}</td>
                  <td>${escaparHtmlPainel(rota?.transportadora || '—')}</td>
                  <td><span class="painel-nf-status">${escaparHtmlPainel(status)}</span></td>
                  <td>${formatarDataPainel(obterDataReferenciaNF(nf, rotasPorId))}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
}

function configurarPesquisaNfPainel() {
    if (pesquisaNfPainel) {
        pesquisaNfPainel.addEventListener('input', () => {
            clearTimeout(timerPesquisaNfPainel);
            timerPesquisaNfPainel = setTimeout(renderizarResultadoPesquisaNfPainel, 120);
        });
        pesquisaNfPainel.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                pesquisaNfPainel.value = '';
                renderizarResultadoPesquisaNfPainel();
                pesquisaNfPainel.blur();
            }
        });
    }
    limparPesquisaNfPainel?.addEventListener('click', () => {
        if (pesquisaNfPainel) pesquisaNfPainel.value = '';
        renderizarResultadoPesquisaNfPainel();
        pesquisaNfPainel?.focus();
    });
}

function renderChart(id, type, data, options) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    if (charts[id]) charts[id].destroy(); // Limpa gráfico anterior para evitar bugs de hover
    
    charts[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options
        }
    });
}

// Adicionar event listeners para os formulários
// Verificações adicionadas para garantir que os elementos existem antes de anexar listeners
const btnSaveNf = document.getElementById('btn-save-nf');
const btnSaveCloseNf = document.getElementById('btn-save-close-nf');

if (btnSaveNf) {
  btnSaveNf.addEventListener('click', () => handleSalvarNF(false));
}
if (btnSaveCloseNf) {
  btnSaveCloseNf.addEventListener('click', () => handleSalvarNF(true));
}

// Evita que o Enter no formulário dê um refresh indesejado, ou podemos mapear para o Salvar e Fechar
if (createNfForm) {
    createNfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSalvarNF(true);
    });
}

if (createRotaForm) {
  createRotaForm.addEventListener('submit', handleCriarRota);
  console.log('Listener de submit para createRotaForm anexado.');
} else {
  console.error('Elemento createRotaForm não encontrado. O listener de submit não foi anexado.');
}

// Adicionar event listeners para os botões de fechar 'x'
if (createNfModal) {
  const closeNfBtn = createNfModal.querySelector('.close-button');
  if (closeNfBtn) {
    closeNfBtn.addEventListener('click', () => {
      // Tarefa 3: Descartar todas as alterações não salvas ao fechar no X
      closeModal(createNfModal);
      // Tarefa 1: Garantir que o formulário seja limpo para não vazar estado temporário
      if (createNfForm) createNfForm.reset();
      if (nfIdHidden) nfIdHidden.value = "";
    });
  }
}

if (createRotaModal) {
  const closeRotaBtn = createRotaModal.querySelector('.close-button');
  if (closeRotaBtn) {
    closeRotaBtn.addEventListener('click', () => closeModal(createRotaModal));
  }
}

if (genericModal) {
    const closeGenericBtn = genericModal.querySelector('.close-button');
    const cancelGenericBtn = document.getElementById('generic-modal-cancel');
    if (closeGenericBtn) closeGenericBtn.addEventListener('click', () => closeModal(genericModal));
    if (cancelGenericBtn) cancelGenericBtn.addEventListener('click', () => closeModal(genericModal));
}

if (historyModal) {
    const closeHistoryBtn = historyModal.querySelector('.close-button');
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));
    }
}

const nfInfoModal = document.getElementById('nf-info-modal');
if (nfInfoModal) {
    const closeBtn = nfInfoModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(nfInfoModal));
    }
    // Fechar ao clicar fora (no overlay)
    nfInfoModal.addEventListener('click', (e) => {
        if (e.target === nfInfoModal) closeModal(nfInfoModal);
    });
}

const leitorDocModal = document.getElementById('leitor-doc-modal');
if (leitorDocModal) {
    const closeBtn = leitorDocModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(leitorDocModal));
    }
    // Fechar ao clicar fora (no overlay)
    leitorDocModal.addEventListener('click', (e) => {
        if (e.target === leitorDocModal) closeModal(leitorDocModal);
    });
}

const btnCopiarResumoLeitorDoc = document.getElementById('btn-copiar-resumo-leitor-doc');
if (btnCopiarResumoLeitorDoc) {
    btnCopiarResumoLeitorDoc.addEventListener('click', async () => {
        if (!leitorDocUltimoResultado) return;
        const dados = leitorDocUltimoResultado;

        const linha = (label, valor) => `${label}: ${valor || ''}`;

        const resumo = [
            linha('NÚMERO DA NF', dados.numero_nf),
            linha('TIPO DE OPERAÇÃO', dados.tipo_operacao),
            linha('CEP', dados.cep),
            linha('CIDADE', dados.cidade),
            linha('UF', dados.uf),
            linha('ENDEREÇO', dados.endereco),
            linha('NÚMERO', dados.numero),
            linha('QUANTIDADE', dados.quantidade),
            linha('MARCA', dados.marca),
            linha('POTÊNCIA', dados.potencia),
            linha('KAM', dados.kam),
            linha('OBSERVAÇÃO', dados.observacao)
        ].join('\n');

        try {
            await navigator.clipboard.writeText(resumo);
            mostrarAviso('Resumo copiado para a área de transferência.');
        } catch (error) {
            console.error('Leitor DOC - erro ao copiar resumo:', error);
            mostrarAviso('Não foi possível copiar o resumo.');
        }
    });
}

const btnTranscriberLeitorDoc = document.getElementById('btn-transcriber-leitor-doc');
if (btnTranscriberLeitorDoc) {
    btnTranscriberLeitorDoc.addEventListener('click', async () => {
        if (!leitorDocUltimoResultado) return;
        const dados = leitorDocUltimoResultado;

        // 2. Fechar o modal do Leitor DOC / 3. Voltar para a Nova NF já aberta
        closeModal(leitorDocModal);
        openModal(createNfModal);

        // 4. Preencher os campos existentes com os dados reais da API
        if (nfNumeroInput) nfNumeroInput.value = dados.numero_nf || '';

        if (dados.tipo_operacao === 'Retira') {
            // Aciona o clique real do toggle: a regra já existente do sistema
            // limpa/desabilita os campos de endereço e zera o frete (R$ 0,00).
            if (btnRetira) btnRetira.click();
        } else {
            // "Transporte" (equivalente a FRETE na API) ou tipo não identificado:
            // mantém o padrão atual do modal e preenche o endereço.
            if (btnTransporte) btnTransporte.click();
            if (nfCepInput) nfCepInput.value = dados.cep || '';
            if (nfCidadeInput) nfCidadeInput.value = dados.cidade || '';
            if (nfUfInput) nfUfInput.value = dados.uf || '';
            if (nfEnderecoInput) nfEnderecoInput.value = dados.endereco || '';
            if (nfEnderecoNumeroInput) nfEnderecoNumeroInput.value = dados.numero || '';
        }

        if (nfQuantidadeInput) nfQuantidadeInput.value = dados.quantidade || '';
        if (nfMarcaInput) nfMarcaInput.value = dados.marca || '';
        if (nfPotenciaInput) nfPotenciaInput.value = dados.potencia || '';
        if (nfKamInput) nfKamInput.value = dados.kam || '';
        if (nfObsInput) nfObsInput.value = dados.observacao || '';

        // Remove SOMENTE a NF transcrita da fila temporária; as demais permanecem
        // disponíveis para clicar em LER DOC novamente enquanto a Nova NF estiver aberta.
        const itemTranscrito = leitorDocIndiceAtual !== null ? leitorDocResultados[leitorDocIndiceAtual] : null;
        if (leitorDocIndiceAtual !== null) {
            leitorDocResultados.splice(leitorDocIndiceAtual, 1);
            leitorDocIndiceAtual = null;
        }
        leitorDocUltimoResultado = null;

        // Marca a linha como concluída no Supabase para que ela deixe de aparecer
        // como pendente para todos os navegadores (não só remove localmente).
        if (itemTranscrito && itemTranscrito.id) {
            const { error: statusError } = await supabaseClient
                .from('leitor_doc_fila')
                .update({ status: 'transcrita' })
                .eq('id', itemTranscrito.id);

            if (statusError) {
                console.error('Leitor DOC: erro ao atualizar status da fila após transcrição:', statusError);
            }
        }
    });
}

if (routeDetailsModal) {
    const closeBtn = routeDetailsModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(routeDetailsModal));
    }
}

const changePasswordModal = document.getElementById('change-password-modal');
if (changePasswordModal) {
    const closeBtn = changePasswordModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(changePasswordModal));
    }
}

if (createKamModal) {
    const closeBtn = createKamModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(createKamModal));
    }
}

if (progHistoryModal) {
    const closeBtn = progHistoryModal.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(progHistoryModal));
    }
}

// Máscara visual para o campo CEP (00000-000)
if (nfCepInput) {
    nfCepInput.addEventListener('input', (e) => {
        // Tarefa 3: Remover caracteres extras e considerar apenas números
        let numValue = e.target.value.replace(/\D/g, ''); 
        if (numValue.length > 8) numValue = numValue.slice(0, 8); 
        
        // Tarefa 2: Aplicar máscara automática 00000-000
        let maskedValue = numValue;
        if (numValue.length > 5) {
            maskedValue = numValue.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        
        e.target.value = maskedValue;
        
        // Tarefa 4: Debug Temporário
        console.log("CEP formatado:", e.target.value);

        // Tarefa 1: Busca automática por CEP quando atingir 8 números
        if (numValue.length === 8) {
            // Tarefa 4: Não executa se for Retira
            if (nfTipoInput && nfTipoInput.value === 'retira') return;

            fetch(`https://viacep.com.br/ws/${numValue}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (!data.erro) {
                        // Tarefa 1: Preencher automaticamente Cidade, UF e Endereço
                        if (nfCidadeInput) nfCidadeInput.value = data.localidade;
                        if (nfUfInput) nfUfInput.value = data.uf;
                        if (nfEnderecoInput) nfEnderecoInput.value = data.logradouro;
                    }
                })
                .catch(err => console.error("Erro na busca de CEP:", err));
        }
    });
}

// Evento global para deselecionar rota ao clicar fora
document.addEventListener('click', (e) => {
  // Fecha dropdown do usuário ao clicar fora
  if (!e.target.closest('.user-display') && !e.target.closest('.export-wrapper') && !e.target.closest('.export-day-wrapper') && !e.target.closest('.maps-wrapper') && !e.target.closest('.export-powerbi-wrapper')) {
    document.querySelectorAll('.user-dropdown, .maps-dropdown').forEach(d => d.classList.add('hidden'));
  }

  // Se o clique não foi em uma rota nem em uma NF da lista lateral, limpa a seleção
  if (!e.target.closest('.rota-card') && !e.target.closest('.nf-card')) {
    rotaSelecionada = null;
    document.querySelectorAll('.rota-card').forEach(c => c.classList.remove('selected'));
  }
});

// INICIALIZAÇÃO DO MODO DE VISUALIZAÇÃO
if (viewGridBtn && viewListBtn) {
    const savedMode = localStorage.getItem('rota_view_mode') || 'grid';
    if (savedMode === 'list') {
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
    }

    viewGridBtn.addEventListener('click', () => {
        if (localStorage.getItem('rota_view_mode') === 'grid') return;
        localStorage.setItem('rota_view_mode', 'grid');
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        carregarRotas();
    });

    viewListBtn.addEventListener('click', () => {
        if (localStorage.getItem('rota_view_mode') === 'list') return;
        localStorage.setItem('rota_view_mode', 'list');
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        carregarRotas();
    });
}

// Listener visual para o novo botão de exportação Power BI
const exportPowerBiBtn = document.getElementById('export-powerbi-btn');
const exportPowerBiDropdown = document.getElementById('export-powerbi-dropdown');
if (exportPowerBiBtn && exportPowerBiDropdown) {
    exportPowerBiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Fecha outros dropdowns abertos
        document.querySelectorAll('.user-dropdown, .maps-dropdown').forEach(d => {
            if (d !== exportPowerBiDropdown) d.classList.add('hidden');
        });
        
        // Alterna o menu atual
        exportPowerBiDropdown.classList.toggle('hidden');
    });
}

// FUNÇÃO PARA EXPORTAR BASE ANALÍTICA CSV (POWER BI)
window.handleExportPowerBiCSV = async function(e) {
    if (e) e.stopPropagation();
    
    // Fecha o dropdown
    const dropdown = document.getElementById('export-powerbi-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    try {
        if (window.mostrarAviso) window.mostrarAviso("Preparando base analítica completa... O download iniciará em breve.");

        // 1. Busca todos os dados necessários (NFs e Rotas - Ativas e Finalizadas)
        const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");
        const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*");

        if (errN || errR) throw new Error("Erro ao carregar dados do Supabase.");

        // 2. Definir Colunas da Exportação (Conforme solicitado)
        const columns = [
            "data_rota", "status_rota", "finalizada_em", "nome_rota", "transportadora",
            "nf_numero", "tipo_operacao", "cidade", "uf", "cep", "endereco",
            "numero_endereco", "quantidade", "marca", "potencia", "kam",
            "frete", "status_nf", "observacao"
        ];

        // 3. Montar as linhas (Uma linha por NF)
        const csvRows = [];
        csvRows.push(columns.join(",")); // Header

        nfs.forEach(nf => {
            const rota = rotas.find(r => r.id === nf.rota_id) || {};
            
            const rowData = [
                rota.data || "",
                rota.status || (nf.rota_id ? "ativa" : "pendente"),
                rota.finalizada_em || "",
                rota.nome || "",
                rota.transportadora || "",
                nf.numero || "",
                nf.tipo || "",
                nf.cidade || "",
                nf.uf || "",
                nf.cep || "",
                nf.endereco || "",
                nf.numero_endereco || "",
                nf.qtd || "",
                nf.marca || "",
                nf.potencia || "",
                nf.kam || "",
                nf.valor_frete || 0,
                nf.status || "",
                (nf.observacao || "").replace(/\n/g, " ").replace(/\r/g, "")
            ];

            // Escapar valores para formato CSV seguro
            const escapedRow = rowData.map(val => {
                let text = (val === null || val === undefined) ? "" : String(val);
                text = text.replace(/"/g, '""'); // Escapa aspas duplas internas
                if (text.includes(",") || text.includes('"') || text.includes("\n")) {
                    text = `"${text}"`;
                }
                return text;
            });

            csvRows.push(escapedRow.join(","));
        });

        // 4. Download do Arquivo
        const csvString = "\uFEFF" + csvRows.join("\n"); // UTF-8 BOM para compatibilidade Excel/Power BI
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const dataHoje = new Date().toISOString().slice(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `base_power_bi_${dataHoje}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error("Erro na exportação CSV Power BI:", err);
        if (window.mostrarAviso) window.mostrarAviso("Erro ao exportar base CSV. Verifique sua conexão.");
    }
};

// FUNÇÃO PARA EXPORTAR BASE ANALÍTICA EXCEL (POWER BI)
window.handleExportPowerBiExcel = async function(e) {
    if (e) e.stopPropagation();
    
    // Fecha o dropdown
    const dropdown = document.getElementById('export-powerbi-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    try {
        if (window.mostrarAviso) window.mostrarAviso("Preparando base analítica completa (Excel)... O download iniciará em breve.");

        // 1. Busca todos os dados necessários (NFs e Rotas - Ativas e Finalizadas)
        const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");
        const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*");

        if (errN || errR) throw new Error("Erro ao carregar dados do Supabase.");

        // 2. Definir Colunas da Exportação (Idênticas ao CSV)
        const columns = [
            "data_rota", "status_rota", "finalizada_em", "nome_rota", "transportadora",
            "nf_numero", "tipo_operacao", "cidade", "uf", "cep", "endereco",
            "numero_endereco", "quantidade", "marca", "potencia", "kam",
            "frete", "status_nf", "observacao"
        ];

        // 3. Montar as linhas (Uma linha por NF)
        const excelData = [];
        excelData.push(columns); // Cabeçalho sutil

        nfs.forEach(nf => {
            const rota = rotas.find(r => r.id === nf.rota_id) || {};
            
            excelData.push([
                rota.data || "",
                rota.status || (nf.rota_id ? "ativa" : "pendente"),
                rota.finalizada_em || "",
                rota.nome || "",
                rota.transportadora || "",
                nf.numero || "",
                nf.tipo || "",
                nf.cidade || "",
                nf.uf || "",
                nf.cep || "",
                nf.endereco || "",
                nf.numero_endereco || "",
                nf.qtd || "",
                nf.marca || "",
                nf.potencia || "",
                nf.kam || "",
                nf.valor_frete || 0,
                nf.status || "",
                (nf.observacao || "").replace(/\n/g, " ").replace(/\r/g, "")
            ]);
        });

        // 4. Gerar o arquivo Excel usando a biblioteca XLSX
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Base Analítica Power BI");

        const dataHoje = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `base_power_bi_${dataHoje}.xlsx`);

    } catch (err) {
        console.error("Erro na exportação Excel Power BI:", err);
        if (window.mostrarAviso) window.mostrarAviso("Erro ao exportar base Excel. Verifique sua conexão.");
    }
};

document.addEventListener('DOMContentLoaded', checkAuth);
