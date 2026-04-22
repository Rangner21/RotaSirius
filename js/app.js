// --- SISTEMA DE LOGIN ---
const loginScreen = document.getElementById('login-screen');
const mainApp = document.querySelector('.app');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPass = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

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
            carregarTudo();
            exibirUsuarioLogado();
        })();
        // --- END Task 4 ---
    } else {
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

function exibirUsuarioLogado() {
    const dashElem = document.getElementById('user-display-dashboard');
    const panelElem = document.getElementById('user-display-panel');
    const programacaoElem = document.getElementById('user-display-programacao');
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuarioLogado) {
        [dashElem, panelElem, programacaoElem].forEach(el => { if (el) el.innerHTML = ""; });
        return;
    }

    const isViewer = usuarioLogado.permissao === "Visualizador";
    document.body.classList.toggle('is-viewer', isViewer);

    // Controle de visibilidade do Painel de Controle por permissão
    const isAdmin = usuarioLogado.permissao === "Administrador";
    const btnControlDash = document.getElementById('open-control-panel-btn');
    const btnControlProg = document.getElementById('open-control-panel-from-prog-btn');

    if (btnControlDash) {
        isAdmin ? btnControlDash.classList.remove('hidden') : btnControlDash.classList.add('hidden');
    }
    if (btnControlProg) {
        isAdmin ? btnControlProg.classList.remove('hidden') : btnControlProg.classList.add('hidden');
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

    [dashElem, panelElem, programacaoElem].forEach(el => {
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
            usuarioLogado = usersLocais.find(u => u.email === email && u.senha === pass);

            // 2. Se não encontrou localmente, tenta autenticar via Supabase
            if (!usuarioLogado && window.supabaseClient) {
                const { data, error } = await supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("email", email)
                    .eq("senha", pass)
                    .single();
                
                if (error) {
                    console.error("Erro detalhado do Supabase:", error.message, error.details, error.hint);
                    // Se o erro for '406' ou similar, geralmente é RLS.
                }

                if (!error && data) {
                    usuarioLogado = data;
                    // Salva no cache local para evitar ficar preso se o Supabase oscilar
                    if (!usersLocais.some(u => u.id === data.id)) {
                        usersLocais.push(data);
                        localStorage.setItem('sirios_usuarios', JSON.stringify(usersLocais));
                    }
                }
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

const openNfModalBtn = document.getElementById('open-nf-modal-btn');
const openRotaModalBtn = document.getElementById('open-rota-modal-btn');
const openHistoryBtn = document.getElementById('open-history-btn');

const createNfForm = document.getElementById('create-nf-form');
const createRotaForm = document.getElementById('create-rota-form');

const nfNumeroInput = document.getElementById('nf-numero');
const nfIdHidden = document.getElementById('nf-id-hidden');
const nfModalTitle = document.getElementById('nf-modal-title');
const nfDestinoInput = document.getElementById('nf-destino');
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
}

// --- NAVEGAÇÃO PAINEL DE CONTROLE ---
const dashboardView = document.getElementById('dashboard-view');
const controlPanelView = document.getElementById('control-panel-view');
const programacaoView = document.getElementById('programacao-view'); // Nova referência

const openControlPanelBtn = document.getElementById('open-control-panel-btn');
const openProgramacaoBtn = document.getElementById('open-programacao-btn'); // Novo botão
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const openProgHistoryBtn = document.getElementById('open-programacao-history-btn');
const progHistoryModal = document.getElementById('programacao-history-modal');
const openControlPanelFromProgBtn = document.getElementById('open-control-panel-from-prog-btn');
const exportProgramacaoBtn = document.getElementById('export-programacao-btn');
const openRotaModalFromProgBtn = document.getElementById('open-rota-modal-from-prog-btn');
const addUserBtn = document.getElementById('add-user-btn');
const createUserModal = document.getElementById('create-user-modal');
const createUserForm = document.getElementById('create-user-form');
const userModalTitle = document.getElementById('user-modal-title');
const userIdHidden = document.getElementById('user-id-hidden');

let listaUsuariosLocal = []; // Cache local para busca rápida na edição

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
        listaUsuariosLocal = data || [];
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
    if (kamModalTitle) kamModalTitle.innerText = "Editar KAM";
    if (kamIdHidden) kamIdHidden.value = id;
    if (kamNomeInput) kamNomeInput.value = nome;
    openModal(createKamModal);
};

window.excluirKam = function(id) {
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
        if (kamModalTitle) kamModalTitle.innerText = "Adicionar Novo KAM";
        if (kamIdHidden) kamIdHidden.value = "";
        if (createKamForm) createKamForm.reset();
        openModal(createKamModal);
    });
}

if (createKamForm) {
    createKamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
        if (!usuarioLogado || usuarioLogado.permissao !== "Administrador") {
            mostrarAviso("⛔ Acesso restrito. Apenas Administradores podem acessar o Painel de Controle.");
            return;
        }
        if (dashboardView && controlPanelView && programacaoView) {
            dashboardView.classList.add('hidden');
            programacaoView.classList.add('hidden'); // Esconde programação também
            controlPanelView.classList.remove('hidden');
            document.querySelector('.app').classList.add('panel-active');
            carregarDashboard();
            carregarUsuarios();
            carregarKams();
        }
    });
}

if (openControlPanelFromProgBtn) {
    openControlPanelFromProgBtn.addEventListener('click', () => {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || usuarioLogado.permissao !== "Administrador") {
            mostrarAviso("⛔ Acesso restrito. Apenas Administradores podem acessar o Painel de Controle.");
            return;
        }
        programacaoView.classList.add('hidden');
        controlPanelView.classList.remove('hidden');
        document.querySelector('.app').classList.add('panel-active');
        carregarDashboard();
        carregarUsuarios();
        carregarKams();
    });
}

if (openProgramacaoBtn) {
    openProgramacaoBtn.addEventListener('click', () => {
        // Não há verificação de permissão específica para "Programação" por enquanto,
        // mas pode ser adicionada aqui se necessário.
        if (dashboardView && controlPanelView && programacaoView) {
            dashboardView.classList.add('hidden');
            controlPanelView.classList.add('hidden'); // Esconde painel de controle
            programacaoView.classList.remove('hidden');
            document.querySelector('.app').classList.remove('panel-active');
            carregarProgramacao();
        }
    });
}

if (openProgHistoryBtn) {
    openProgHistoryBtn.addEventListener('click', () => {
        const progHistorySearch = document.getElementById('programacao-history-search');
        if (progHistorySearch) progHistorySearch.value = "";
        renderizarHistoricoProgramacao();
        openModal(progHistoryModal);
    });
}

const backToDashboardFromProgramacaoBtn = document.getElementById('back-to-dashboard-from-programacao-btn');

if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        // Este botão é do Painel de Controle
        // Garante que o dashboard seja exibido e o painel de controle oculto
        if (dashboardView && controlPanelView) {
            controlPanelView.classList.add('hidden');
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
    if (nfModalTitle) nfModalTitle.innerText = "Adicionar Nova NF";
    if (nfIdHidden) nfIdHidden.value = "";
    if (createNfForm) createNfForm.reset();
    if (nfQuantidadeInput) nfQuantidadeInput.value = "";
    if (nfMarcaInput) nfMarcaInput.value = "";
    if (nfPotenciaInput) nfPotenciaInput.value = "";
    if (nfKamInput) nfKamInput.value = "";
    carregarKams(); // Atualiza dropdown ao abrir
    if (btnTransporte) btnTransporte.click();
    openModal(createNfModal);
  });
}
if (openRotaModalBtn) {
  openRotaModalBtn.addEventListener('click', () => {
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
  openHistoryBtn.addEventListener('click', () => { renderizarHistorico(); openModal(historyModal); });
}


// Lógica de alternância do tipo de NF (Transporte/Retira)
if (btnTransporte && btnRetira && nfTipoInput) {
  btnTransporte.addEventListener('click', () => {
    nfTipoInput.value = 'transporte';
    btnTransporte.classList.add('active');
    btnRetira.classList.remove('active');
    
    if (nfDestinoInput) nfDestinoInput.disabled = false;
    if (nfUfInput) nfUfInput.disabled = false;
    if (nfDestinoInput) nfDestinoInput.required = true;
    if (nfUfInput) nfUfInput.required = true;
    if (nfValorInput) { nfValorInput.disabled = false; nfValorInput.required = true; }
  });

  btnRetira.addEventListener('click', () => {
    nfTipoInput.value = 'retira';
    btnRetira.classList.add('active');
    btnTransporte.classList.remove('active');
    
    if (nfDestinoInput) { nfDestinoInput.disabled = true; nfDestinoInput.value = ''; nfDestinoInput.required = false; }
    if (nfUfInput) { nfUfInput.disabled = true; nfUfInput.value = ''; nfUfInput.required = false; }
    if (nfValorInput) { nfValorInput.disabled = true; nfValorInput.value = '0'; nfValorInput.required = false; }
  });
}

// SALVAR NF (UNIFICADO)
async function handleSalvarNF(fecharAoSalvar = true) {
  console.log('handleSalvarNF: Função chamada. Fechar:', fecharAoSalvar);

  if (typeof supabaseClient === 'undefined') {
    console.error('handleSalvarNF: Cliente supabaseClient não está definido.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  // Adicionado verificação para nfNumeroInput etc. para evitar erro se forem nulos
  const nfId = nfIdHidden ? nfIdHidden.value : '';
  const numero = nfNumeroInput ? nfNumeroInput.value.trim() : '';
  const destino = nfDestinoInput ? nfDestinoInput.value.trim() : '';
  const uf = nfUfInput ? nfUfInput.value.trim().toUpperCase() : '';
  const tipo = nfTipoInput ? nfTipoInput.value : 'transporte';
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
  if (tipo === 'transporte' && (!destino || !uf || isNaN(valor))) {
    mostrarAviso("Por favor, preencha todos os campos (Destino, UF e Valor) para NFs de Transporte.");
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
      destino: tipo === 'retira' ? 'RETIRA' : destino,
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
      // Modo Edição
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
      const destinoStr = String(nf.destino || "").toLowerCase();
      const correspondeBusca = numeroStr.includes(termoBusca) || destinoStr.includes(termoBusca);
      
      if (filtroAtual === 'transporte') return correspondeBusca && nf.uf !== 'RT';
      if (filtroAtual === 'retira') return correspondeBusca && nf.uf === 'RT';
      return correspondeBusca;
    });

    nfsFiltradas.forEach(nf => {
      const div = document.createElement("div");
      div.className = "nf-card";

      const badge = nf.uf === 'RT' ? '<small style="color: #f87171;">[RETIRA]</small>' : '';

      div.innerHTML = `
        <div class="nf-actions-top">
          <button class="icon-btn edit" title="Editar" onclick="event.stopPropagation(); editarNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
          <button class="icon-btn delete" title="Excluir" onclick="event.stopPropagation(); excluirNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
        <strong>NF ${nf.numero} ${badge}</strong>
        <span>${nf.destino}/${nf.uf}</span>
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

// EDITAR NF
window.editarNF = async function(nfId) {
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
        if (nfDestinoInput) nfDestinoInput.value = data.destino;
        if (nfUfInput) nfUfInput.value = data.uf;
        if (nfValorInput) nfValorInput.value = data.valor_frete;
    }

    openModal(createNfModal);
  } catch (err) {
    console.error("Erro ao buscar NF para edição:", err);
  }
};

// EXCLUIR NF
window.excluirNF = async function(nfId) {
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
  if (typeof supabaseClient === 'undefined') {
    console.error('enviarParaRota: Cliente supabaseClient não está definido.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível.');
    return;
  }
  
  if (!rotaSelecionada) {
    mostrarAviso("Selecione uma rota primeiro clicando nela!");
    return;
  }

  await supabaseClient
    .from("nfs")
    .update({ rota_id: rotaSelecionada })
    .eq("id", nfId);

  carregarTudo();
}

// Referências dos filtros de rota
const filtroNomeRota = document.getElementById('filtro-nome-rota');
const filtroDataRota = document.getElementById('filtro-data-rota');

if (filtroNomeRota) filtroNomeRota.addEventListener('input', carregarRotas);
if (filtroDataRota) filtroDataRota.addEventListener('change', carregarRotas);

// Referências dos filtros de programação
const filtroNomeProg = document.getElementById('filtro-nome-programacao');
const filtroDataProg = document.getElementById('filtro-data-programacao');

if (filtroNomeProg) filtroNomeProg.addEventListener('input', carregarProgramacao);
if (filtroDataProg) filtroDataProg.addEventListener('change', carregarProgramacao);

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
  const termoData = filtroDataRota ? filtroDataRota.value : "";

  const rotasFiltradas = rotas.filter(rota => {
    const nomeMatch = rota.nome.toLowerCase().includes(termoNome);
    const transportadoraMatch = (rota.transportadora || "").toLowerCase().includes(termoNome);
    const dataMatch = termoData ? rota.data === termoData : true;
    return (nomeMatch || transportadoraMatch) && dataMatch;
  });

  if (rotasFiltradas.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma rota encontrada para os filtros aplicados.</p>`;
    return;
  }

  rotasFiltradas.forEach(rota => {
    const card = document.createElement("div");
    card.className = "rota-card";
    
    // Mantém o destaque se a rota já estiver selecionada
    if (rotaSelecionada === rota.id) {
      card.classList.add("selected");
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
            <div class="rota-actions">
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
        </div>

      </div>

      <div class="rota-footer">
        <button class="btn btn-outline" onclick="event.stopPropagation(); copiarResumo('${rota.id}', '${rota.nome}', ${total})">Copiar Resumo</button>
        <button class="btn" onclick="event.stopPropagation(); finalizarRota('${rota.id}')">Finalizar Rota</button>
      </div>
    `;

    const body = card.querySelector(".rota-body");

    nfsDaRota.forEach(nf => {
      const linha = document.createElement("div");
      linha.className = "nf-row";

      linha.innerHTML = `
        <span>NF ${nf.numero}</span>
        <span>${nf.destino}/${nf.uf}</span>
        <span>R$ ${formatar(nf.valor_frete)}</span>
      `;

      linha.onclick = () => removerDaRota(nf.id);

      body.appendChild(linha);
    });

    container.appendChild(card);
  });
}

// REMOVER DA ROTA
async function removerDaRota(nfId) {
  if (typeof supabaseClient === 'undefined') {
    console.error('removerDaRota: Cliente supabaseClient não está definido.');
    alert('Erro: O serviço de banco de dados não está disponível.');
    return;
  }
  await supabaseClient
    .from("nfs")
    .update({ rota_id: null })
    .eq("id", nfId);

  carregarTudo();
}

// EDITAR NOME DA ROTA
window.editarRota = async function(rotaId, nomeAtual, dataAtual, transportadoraAtual) {
  if (rotaModalTitle) rotaModalTitle.innerText = "Editar Rota";
  if (rotaIdHidden) rotaIdHidden.value = rotaId;
  if (rotaNomeInput) rotaNomeInput.value = nomeAtual;
  if (rotaDataInput) rotaDataInput.value = dataAtual || "";
  if (rotaTransportadoraInput) rotaTransportadoraInput.value = transportadoraAtual || "";
  openModal(createRotaModal);
}

// COPIAR RESUMO DA ROTA
window.copiarResumo = async function(rotaId, rotaNome, totalFrete) {
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
      resumo += `NF ${nf.numero} | ${nf.destino}/${nf.uf} | R$ ${formatar(nf.valor_frete)}\n`;
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
  confirmarAcao("Deseja finalizar esta rota? Ela será movida para o histórico.", async () => {
    try {
      // TAREFA 2: Garantir que os dados sejam capturados antes da exclusão
      const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*").eq("id", rotaId);
      const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*").eq("rota_id", rotaId);

      if (errR || errN) throw new Error("Erro ao buscar dados para o histórico.");

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
            destino: n.destino,
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
            const dataFinalizacao = rota.finalizada_em ? new Date(rota.finalizada_em).toLocaleString('pt-BR') : '---';

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
    confirmarAcao("Tem certeza que deseja excluir esta rota permanentemente do histórico?", () => {
        let historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
        historico = historico.filter(h => h.id !== historicoId);
        localStorage.setItem('rota_historico', JSON.stringify(historico));
        
        renderizarHistorico();
    });
};

// RETORNAR ROTA PARA ATIVA
window.retornarRota = async function(rotaId) {
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
    try {
        const { data: rota, error: errR } = await supabaseClient.from("rotas").select("*").eq("id", rotaId).single();
        const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*").eq("rota_id", rotaId);

        if (errR || errN || !rota) return;

        const totalFrete = nfs.reduce((acc, n) => acc + Number(n.valor_frete), 0);
        const dataFin = rota.finalizada_em ? new Date(rota.finalizada_em).toLocaleString('pt-BR') : '---';

        let resumo = `ROTA: ${rota.nome} - ${dataFin}\n`;
        resumo += `QTD NFs: ${nfs.length}\n`;
        resumo += `TOTAL FRETE: R$ ${formatar(totalFrete)}\n\n`;

        nfs.forEach(nf => {
            resumo += `NF ${nf.numero} | ${nf.destino}/${nf.uf} | R$ ${formatar(nf.valor_frete)}\n`;
        });

        await navigator.clipboard.writeText(resumo);
        mostrarAviso("Resumo da rota copiado para a área de transferência!");
    } catch (e) {
        console.error("Erro ao copiar resumo do histórico:", e);
        mostrarAviso("Erro ao copiar.");
    }
};
window.deletarRota = async function(rotaId) {
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
    const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*");
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
            const matchNF = String(nf.numero).toLowerCase().includes(termo);
            const matchKam = String(nf.kam || "").toLowerCase().includes(termo);
            const matchDestino = String(nf.destino || "").toLowerCase().includes(termo) || 
                               String(nf.uf || "").toLowerCase().includes(termo);

            // Se nenhum dos campos bater, ignora esta NF
            if (!matchRota && !matchNF && !matchKam && !matchDestino) return;
        }

        const dataKey = rota.data || "sem-data";
        if (!agrupado[dataKey]) agrupado[dataKey] = {};
        
        if (!agrupado[dataKey][rota.id]) {
            agrupado[dataKey][rota.id] = {
                nome: rota.nome,
                transportadora: rota.transportadora,
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

function renderizarProgramacaoAutomatica(agrupado) {
    const container = document.getElementById('programacao-dinamica-container');
    if (!container) return;
    container.innerHTML = "";

    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    const canEdit = usuarioLogado && usuarioLogado.permissao !== "Visualizador";

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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #22c55e;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                            Excel
                        </button>
                        <button type="button" onclick="handleExportPDF(event, '${dataKey}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            PDF
                        </button>
                    </div>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>NF</th>
                        <th>Destino</th>
                        <th>Tipo</th>
                        <th>Qtd</th>
                        <th>Marca</th>
                        <th>Potência</th>
                        <th>KAM</th>
                        <th>Rota</th>
                        <th>Transportadora</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const rotasIds = Object.keys(agrupado[dataKey]).sort((a, b) => 
            agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome)
        );

        rotasIds.forEach(rotaId => {
            const infoRota = agrupado[dataKey][rotaId];
            infoRota.nfs.forEach(nf => {
                const statusAtual = nf.status || "";
                const statusDisplay = statusAtual || "---";
                // Atributo de clique apenas se tiver permissão
                const editAttr = canEdit ? `onclick="window.abrirEdicaoStatus(event, '${nf.id}', '${statusAtual}')" title="Clique para editar status" style="cursor: pointer;"` : "";

                html += `
                    <tr>
                        <td><strong>${nf.numero}</strong></td>
                        <td>${nf.destino}/${nf.uf}</td>
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
        const termoData = filtroDataProg ? filtroDataProg.value : "";

        // Filtramos as rotas apenas por data inicialmente
        const rotasPorData = rotas.filter(rota => {
            return termoData ? rota.data === termoData : true;
        });

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

    // 1. Fechar todos os menus de exportação (principal e individuais)
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));

    try {
        // 2. Mostrar aviso de processamento
        const msg = specificDate ? "Gerando planilha do dia..." : "Gerando relatório da programação... O download iniciará em instantes.";
        mostrarAviso(msg);

        // 3. Buscar dados atuais (respeitando filtros da tela)
        const { rotas, nfs } = await buscarDadosParaProgramacao();
        const termoTexto = filtroNomeProg ? filtroNomeProg.value : "";
        
        // Se houver uma data específica (clique no card), ela ignora o filtro global de data
        const termoData = specificDate || (filtroDataProg ? filtroDataProg.value : "");

        // Filtrar rotas conforme filtros de data da tela de programação
        const rotasFiltradas = rotas.filter(rota => {
            if (!termoData) return true;
            if (termoData === "sem-data") return !rota.data;
            return rota.data === termoData;
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
                        `${nf.destino}/${nf.uf}`,
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

    // 1. Fechar todos os menus de exportação
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));

    try {
        // 2. Buscar e filtrar dados
        const { rotas, nfs } = await buscarDadosParaProgramacao();
        const termoTexto = filtroNomeProg ? filtroNomeProg.value : "";
        
        // Se houver uma data específica, ela ignora o filtro global
        const termoData = specificDate || (filtroDataProg ? filtroDataProg.value : "");

        const rotasFiltradas = rotas.filter(rota => {
            if (!termoData) return true;
            if (termoData === "sem-data") return !rota.data;
            return rota.data === termoData;
        });

        const agrupado = agruparDadosProgramacao(rotasFiltradas, nfs, termoTexto);

        if (Object.keys(agrupado).length === 0) {
            mostrarAviso("Nenhum dado disponível para exportação.");
            return;
        }

        const msg = specificDate ? "Gerando PDF do dia..." : "Gerando PDF da programação... O download iniciará em instantes.";
        mostrarAviso(msg);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Paisagem para melhor aproveitamento das colunas
        const agora = new Date();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Configurações de Identidade Visual
        const verdeSirius = [34, 197, 94];
        const slate800 = [30, 41, 59];
        const slate500 = [100, 116, 139];
        const borderSlate = [226, 232, 240];
        let currentY = 25;

        // TAREFA 1 — CABEÇALHO PREMIUM
        doc.setFontSize(22);
        doc.setTextColor(slate800[0], slate800[1], slate800[2]);
        doc.setFont("helvetica", "bold");
        doc.text("RELATÓRIO DE PROGRAMAÇÃO ATIVA", 14, currentY);
        
        doc.setFontSize(14);
        doc.setTextColor(verdeSirius[0], verdeSirius[1], verdeSirius[2]);
        doc.text("SISTEMA ROTA SIRIUS", 14, currentY + 8);

        doc.setFontSize(9);
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${agora.toLocaleString('pt-BR')}`, 14, currentY + 15);
        
        // Linha divisória sutil
        doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        doc.line(14, currentY + 18, pageWidth - 14, currentY + 18);
        
        currentY += 30;

        const datas = Object.keys(agrupado).sort((a, b) => {
            if (a === "sem-data") return 1;
            if (b === "sem-data") return -1;
            return a.localeCompare(b);
        });

        datas.forEach((dataKey, index) => {
            // TAREFA 2 — BLOCOS POR DATA ELEGANTES
            const dataTitulo = formatarDataComDiaSemana(dataKey).toUpperCase();
            
            doc.setFontSize(11);
            doc.setTextColor(verdeSirius[0], verdeSirius[1], verdeSirius[2]);
            doc.setFont("helvetica", "bold");
            doc.text(dataTitulo, 14, currentY);
            currentY += 6;

            // Preparar dados da tabela
            const tableBody = [];
            const rotasIds = Object.keys(agrupado[dataKey]).sort((a, b) => 
                agrupado[dataKey][a].nome.localeCompare(agrupado[dataKey][b].nome)
            );

            rotasIds.forEach(rotaId => {
                const infoRota = agrupado[dataKey][rotaId];
                infoRota.nfs.forEach(nf => {
                    tableBody.push([
                        nf.numero,
                        `${nf.destino}/${nf.uf}`,
                        (nf.status || "").toUpperCase(),
                        nf.qtd || 0,
                        (nf.marca || "---").toUpperCase(), // TAREFA 6: Padronização
                        nf.potencia || "---",
                        (nf.kam || "---").toUpperCase(),   // TAREFA 6: Padronização
                        infoRota.nome,
                        (infoRota.transportadora || "---").toUpperCase()
                    ]);
                });
            });

            // TAREFA 3 e 4 — REFINAMENTO DA TABELA
            doc.autoTable({
                startY: currentY,
                head: [["NF", "DESTINO", "STATUS", "QTD", "MARCA", "POTÊNCIA", "KAM", "ROTA", "TRANSPORTADORA"]],
                body: tableBody,
                theme: 'grid',
                headStyles: { 
                    fillColor: verdeSirius, 
                    textColor: [255, 255, 255],
                    fontSize: 8, 
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: { 
                    fontSize: 8, 
                    cellPadding: 3,
                    lineColor: borderSlate,
                    lineWidth: 0.1,
                    valign: 'middle'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12 }, // NF (Mais compacta)
                    1: { halign: 'left' },                 // DESTINO (Restante - reduzido pela expansão das outras)
                    2: { halign: 'center', cellWidth: 28 }, // STATUS (Aumentado para evitar quebra de "PREPARADO")
                    3: { halign: 'center', cellWidth: 15 }, // QTD (Aumentado para evitar quebra de "QTD" e "220")
                    4: { halign: 'center', cellWidth: 27 }, // MARCA (Leve aumento para equilíbrio)
                    5: { halign: 'center', cellWidth: 27 }, // POTÊNCIA (Leve aumento para equilíbrio)
                    6: { halign: 'left', cellWidth: 42 },   // KAM (Aumentado para nomes longos)
                    7: { halign: 'left', cellWidth: 45 },   // ROTA
                    8: { halign: 'left', cellWidth: 35 }    // TRANSPORTADORA
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // Slate 50 sutil
                },
                margin: { left: 14, right: 14 },
                // TAREFA 7: Evitar quebras de página desajeitadas
                pageBreak: 'auto',
                rowPageBreak: 'avoid'
            });

            // TAREFA 8: ESPAÇAMENTO E RESPIRO (Gap entre tabelas)
            currentY = doc.lastAutoTable.finalY + 18;
            
            // Verifica se precisa de nova página antes do próximo título de data
            if (currentY > 180 && index < datas.length - 1) {
                doc.addPage();
                currentY = 25;
            }
        });

        // 4. Download automático
        const filename = specificDate ? `programacao-${specificDate}.pdf` : `programacao-completa-${agora.toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);

    } catch (err) {
        console.error("Erro na exportação PDF:", err);
        mostrarAviso("Ocorreu um erro ao gerar o PDF. Verifique o console.");
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
                const dataFin = rota.finalizada_em ? new Date(rota.finalizada_em).toLocaleString('pt-BR') : '---';

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
    console.log("Dashboard: Iniciando processamento de indicadores...");
    try {
        const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");
        const { data: todasAsRotas, error: errR } = await supabaseClient.from("rotas").select("*");

        if (errN || errR) throw new Error("Erro ao buscar dados para o dashboard.");

        const rotasAtivas = todasAsRotas.filter(r => r.status === 'ativa');
        const rotasFinalizadas = todasAsRotas.filter(r => r.status === 'finalizada');

        // FILTRO DE DADOS ATIVOS (Ignorar NFs de rotas já finalizadas)
        const activeRotaIds = new Set(rotasAtivas.map(r => r.id));
        const nfsAtivas = nfs.filter(n => !n.rota_id || activeRotaIds.has(n.rota_id));
        const nfsEmRotaAtiva = nfs.filter(n => n.rota_id && activeRotaIds.has(n.rota_id));

        // 1. ATUALIZAR CARDS DE RESUMO
        const setStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setStat('stat-nfs-pendentes', nfs.filter(n => !n.rota_id).length); // NFs sem rota_id são sempre pendentes
        setStat('stat-nfs-em-rota', nfsEmRotaAtiva.length);
        setStat('stat-rotas-ativas', rotasAtivas.length);
        setStat('stat-rotas-finalizadas', rotasFinalizadas.length);
        setStat('stat-nfs-producao', nfsAtivas.filter(n => n.status === "Em produção").length);
        setStat('stat-nfs-produzidas', nfsAtivas.filter(n => n.status === "Produzida").length);

        // 2. GRÁFICO 1: STATUS DAS NFs (ROSCA)
        const statusData = {
            "Vazio": nfsAtivas.filter(n => !n.status || n.status === "").length,
            "Produção": nfsAtivas.filter(n => n.status === "Em produção").length,
            "Produzida": nfsAtivas.filter(n => n.status === "Produzida").length,
            "Expedida": nfsAtivas.filter(n => n.status === "Expedida").length
        };

        const hasStatusData = Object.values(statusData).some(v => v > 0);
        if (hasStatusData) {
            document.getElementById('msg-status-nfs')?.classList.add('hidden');
            renderChart('chart-status-nfs', 'doughnut', {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#1e293b', '#38bdf8', '#22c55e', '#a855f7'],
                    borderWidth: 0
                }]
            }, { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 10 } } } } });
        } else {
            document.getElementById('msg-status-nfs')?.classList.remove('hidden');
        }

        // 3. GRÁFICO 2: NFs POR DIA (BARRAS)
        const nfsPorDia = {};
        nfsEmRotaAtiva.forEach(nf => {
            const rota = rotasAtivas.find(r => r.id === nf.rota_id);
            if (rota && rota.data) {
                const dataBR = rota.data.split('-').reverse().slice(0, 2).join('/');
                nfsPorDia[dataBR] = (nfsPorDia[dataBR] || 0) + 1;
            }
        });

        const sortedNfDates = Object.keys(nfsPorDia).sort();
        if (sortedNfDates.length > 0) {
            document.getElementById('msg-nfs-dia')?.classList.add('hidden');
            renderChart('chart-nfs-dia', 'bar', {
                labels: sortedNfDates,
                datasets: [{
                    label: 'Quantidade de NFs',
                    data: sortedNfDates.map(d => nfsPorDia[d]),
                    backgroundColor: 'rgba(34, 197, 94, 0.4)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            }, { 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                } 
            });
        } else {
            document.getElementById('msg-nfs-dia')?.classList.remove('hidden');
        }

        // 4. GRÁFICO 3: ROTAS POR DIA (BARRAS)
        const rotasPorDia = {};
        rotasAtivas.forEach(r => {
            if (r.data) {
                const dataBR = r.data.split('-').reverse().slice(0, 2).join('/');
                rotasPorDia[dataBR] = (rotasPorDia[dataBR] || 0) + 1;
            }
        });

        const sortedRotaDates = Object.keys(rotasPorDia).sort();
        if (sortedRotaDates.length > 0) {
            document.getElementById('msg-rotas-dia')?.classList.add('hidden');
            renderChart('chart-rotas-dia', 'bar', {
                labels: sortedRotaDates,
                datasets: [{
                    label: 'Quantidade de Rotas',
                    data: sortedRotaDates.map(d => rotasPorDia[d]),
                    backgroundColor: 'rgba(56, 189, 248, 0.4)',
                    borderColor: '#38bdf8',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            }, { 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                } 
            });
        } else {
            document.getElementById('msg-rotas-dia')?.classList.remove('hidden');
        }

        // 5. RANKING TRANSPORTADORAS (Top 5)
        const transpCounts = {};
        rotasAtivas.forEach(r => {
            const t = (r.transportadora || "").trim() || "NÃO INFORMADA";
            transpCounts[t] = (transpCounts[t] || 0) + 1;
        });
        const sortedTransp = Object.entries(transpCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const rankingTranspElem = document.getElementById('ranking-transportadoras');
        if (rankingTranspElem) {
            rankingTranspElem.innerHTML = sortedTransp.length > 0 
                ? sortedTransp.map(([nome, qtd]) => `<div class="ranking-item"><span>${nome}</span><strong>${qtd} rotas</strong></div>`).join('')
                : `<p style="text-align:center; color:var(--text-muted); font-size:12px; padding: 20px;">Sem dados suficientes.</p>`;
        }

        // 6. RANKING KAMS (Top 5 por NFs)
        const kamCounts = {};
        nfsAtivas.forEach(n => {
            const k = (n.kam || "").trim() || "SEM RESPONSÁVEL";
            kamCounts[k] = (kamCounts[k] || 0) + 1;
        });
        const sortedKams = Object.entries(kamCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const rankingKamsElem = document.getElementById('ranking-kams');
        if (rankingKamsElem) {
            rankingKamsElem.innerHTML = sortedKams.length > 0
                ? sortedKams.map(([nome, qtd]) => `<div class="ranking-item"><span>${nome}</span><strong>${qtd} NFs</strong></div>`).join('')
                : `<p style="text-align:center; color:var(--text-muted); font-size:12px; padding: 20px;">Sem dados suficientes.</p>`;
        }

        // 7. ALERTAS DE PREENCHIMENTO
        const alertRotas = rotasAtivas.filter(r => !r.transportadora || r.transportadora.trim() === "").length;
        const alertNfs = nfsAtivas.filter(n => !n.status || n.status.trim() === "").length;
        
        const alertsContainer = document.getElementById('alerts-summary');
        if (alertsContainer) {
            alertsContainer.innerHTML = `
                <div class="alert-item">
                    <span class="alert-label">Rotas sem transportadora</span>
                    <span class="alert-count">${alertRotas}</span>
                </div>
                <div class="alert-item">
                    <span class="alert-label">NFs sem status (vazias)</span>
                    <span class="alert-count">${alertNfs}</span>
                </div>
            `;
        }

    } catch (err) {
        console.error("Erro ao carregar Dashboard:", err);
    }
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
    closeNfBtn.addEventListener('click', () => closeModal(createNfModal));
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

// Evento global para deselecionar rota ao clicar fora
document.addEventListener('click', (e) => {
  // Fecha dropdown do usuário ao clicar fora
  if (!e.target.closest('.user-display') && !e.target.closest('.export-wrapper') && !e.target.closest('.export-day-wrapper')) {
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));
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

document.addEventListener('DOMContentLoaded', checkAuth);
