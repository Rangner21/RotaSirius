// --- SISTEMA DE PERMISSÕES (TAREFA 6) ---
const checkPerm = {
    getUsuario: () => JSON.parse(localStorage.getItem("usuarioLogado")),
    isAdmin: () => checkPerm.getUsuario()?.permissao === "Administrador",
    isOperador: () => checkPerm.getUsuario()?.permissao === "Operador",
    isVisualizador: () => checkPerm.getUsuario()?.permissao === "Visualizador",
    
    // Bloqueio centralizado para ações de escrita (TAREFA 3)
    podeAlterar: function(mostrarMensagem = true) {
        if (this.isVisualizador()) {
            if (mostrarMensagem) window.mostrarAviso("⛔ Acesso Negado: Usuários com perfil 'Visualizador' não podem realizar alterações.");
            return false;
        }
        return true;
    },
    
    // Bloqueio centralizado para o Painel de Controle
    podeAcessarPainel: function() {
        if (!this.isAdmin()) {
            window.mostrarAviso("⛔ Acesso Restrito: Apenas Administradores podem acessar o Painel de Controle.");
            return false;
        }
        return true;
    }
};

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

    // --- TAREFA 2: ESCONDER BOTÕES CONFORME A PERMISSÃO ---
    const isAdmin = checkPerm.isAdmin();
    const isVisualizador = checkPerm.isVisualizador();
    
    const btnControlDash = document.getElementById('open-control-panel-btn');
    const btnControlProg = document.getElementById('open-control-panel-from-prog-btn');
    const btnNovaNf = document.getElementById('open-nf-modal-btn');
    const btnNovaRota = document.getElementById('open-rota-modal-btn');

    // Esconder Painel para quem não é Admin
    if (btnControlDash) isAdmin ? btnControlDash.classList.remove('hidden') : btnControlDash.classList.add('hidden');
    if (btnControlProg) isAdmin ? btnControlProg.classList.remove('hidden') : btnControlProg.classList.add('hidden');

    // Esconder botões de criação para Visualizador
    if (btnNovaNf) isVisualizador ? btnNovaNf.classList.add('hidden') : btnNovaNf.classList.remove('hidden');
    if (btnNovaRota) isVisualizador ? btnNovaRota.classList.add('hidden') : btnNovaRota.classList.remove('hidden');

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
            <button onclick="handleLogout(event)">
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
const rotaModalTitle = document.getElementById('rota-modal-title');
const rotaIdHidden = document.getElementById('rota-id-hidden');

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
        if (!checkPerm.podeAcessarPainel()) return;
        
        if (dashboardView && controlPanelView && programacaoView) {
            dashboardView.classList.add('hidden');
            programacaoView.classList.add('hidden'); // Esconde programação também
            controlPanelView.classList.remove('hidden');
            carregarUsuarios();
            carregarKams();
        }
    });
}

if (openControlPanelFromProgBtn) {
    openControlPanelFromProgBtn.addEventListener('click', () => {
        if (!checkPerm.podeAcessarPainel()) return;
        programacaoView.classList.add('hidden');
        controlPanelView.classList.remove('hidden');
        carregarUsuarios();
        carregarKams();
    });
}

if (openProgramacaoBtn) {
    openProgramacaoBtn.addEventListener('click', () => {
        // Visualizador pode acessar a programação normalmente (Tarefa 5)
        // Não há verificação de permissão específica para "Programação" por enquanto,
        // mas pode ser adicionada aqui se necessário.
        if (dashboardView && controlPanelView && programacaoView) {
            dashboardView.classList.add('hidden');
            controlPanelView.classList.add('hidden'); // Esconde painel de controle
            programacaoView.classList.remove('hidden');
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

  // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
  if (!checkPerm.podeAlterar()) return;

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

  // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
  if (!checkPerm.podeAlterar()) return;

  console.log('handleCriarRota: Função chamada.');

  if (typeof supabaseClient === 'undefined') {
    console.error('handleCriarRota: Cliente supabaseClient não está definido. Verifique se supabaseClient.js foi carregado.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  const nome = rotaNomeInput ? rotaNomeInput.value.trim() : '';
  const dataRota = rotaDataInput ? rotaDataInput.value : '';
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
      result = await supabaseClient.from("rotas").update({ nome, data: dataRota }).eq("id", rotaId).select();
    } else {
      // Modo Criação
      result = await supabaseClient.from("rotas").insert([{ nome, data: dataRota }]).select();
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

    const canEdit = checkPerm.podeAlterar(false); // Verifica permissão sem alertar no loop

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
        ${canEdit ? `
          <div class="nf-actions-top">
          <button class="icon-btn edit" title="Editar" onclick="event.stopPropagation(); editarNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
          <button class="icon-btn delete" title="Excluir" onclick="event.stopPropagation(); excluirNF('${nf.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
        ` : ''}
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
    // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
    // Operadores podem editar, Visualizadores não.
    if (!checkPerm.podeAlterar()) return;

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
    // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
    if (!checkPerm.podeAlterar()) return;

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

  // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
  // Visualizador não pode operar roteirização
  if (!checkPerm.podeAlterar()) return;
  
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
  
  let query = supabaseClient.from("rotas").select("*");
  
  const { data: rotas, error: errR } = await query;
  const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");

  if (errR || errN || !rotas || !nfs) return;

  const container = document.querySelector(".rotas");
  if (!container) return;
  container.innerHTML = "";

  const canEdit = checkPerm.podeAlterar(false);

  // Lógica de Filtragem Local para resposta instantânea
  const termoNome = filtroNomeRota ? filtroNomeRota.value.toLowerCase() : "";
  const termoData = filtroDataRota ? filtroDataRota.value : "";

  const rotasFiltradas = rotas.filter(rota => {
    const nomeMatch = rota.nome.toLowerCase().includes(termoNome);
    const dataMatch = termoData ? rota.data === termoData : true;
    return nomeMatch && dataMatch;
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
            ${canEdit ? `
              <div class="rota-actions">
              <button class="icon-btn edit" title="Editar nome" onclick="event.stopPropagation(); editarRota('${rota.id}', '${rota.nome}', '${rota.data || ''}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
              <button class="icon-btn delete" title="Excluir rota" onclick="event.stopPropagation(); deletarRota('${rota.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
            ` : ''}
          </div>
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
        ${canEdit ? `
          <button class="btn" onclick="event.stopPropagation(); finalizarRota('${rota.id}')">Finalizar Rota</button>
        ` : ''}
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

  // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
  if (!checkPerm.podeAlterar()) return;

  await supabaseClient
    .from("nfs")
    .update({ rota_id: null })
    .eq("id", nfId);

  carregarTudo();
}

// EDITAR NOME DA ROTA
window.editarRota = async function(rotaId, nomeAtual, dataAtual) {
  if (!checkPerm.podeAlterar()) return;

  if (rotaModalTitle) rotaModalTitle.innerText = "Editar Rota";
  if (rotaIdHidden) rotaIdHidden.value = rotaId;
  if (rotaNomeInput) rotaNomeInput.value = nomeAtual;
  if (rotaDataInput) rotaDataInput.value = dataAtual || "";
  openModal(createRotaModal);
}

// COPIAR RESUMO DA ROTA
window.copiarResumo = async function(rotaId, rotaNome, totalFrete) {
  try {
    const { data: nfs, error } = await supabaseClient
      .from("nfs")
      .select("*")
      .eq("rota_id", rotaId);

    if (error) throw error;

    let resumo = `ROTA: ${rotaNome}\n`;
    resumo += `QTD NFs: ${nfs.length}\n`;
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
  confirmarAcao("Deseja finalizar esta rota? Ela será removida permanentemente do sistema.", async () => {
    // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
    if (!checkPerm.podeAlterar()) return;

    try {
      // Buscar dados para o histórico antes de excluir
      const { data: rotas } = await supabaseClient.from("rotas").select("*").eq("id", rotaId);
      const { data: nfs } = await supabaseClient.from("nfs").select("*").eq("rota_id", rotaId);

      if (rotas && rotas[0]) {
          let total = 0;
          nfs.forEach(n => total += Number(n.valor_frete));
          salvarRotaNoHistorico(rotas[0], nfs || [], total);
      }

      const { error } = await supabaseClient.from("rotas").delete().eq("id", rotaId);
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
        data: new Date().toLocaleString('pt-BR'),
        qtdNfs: nfs.length,
        totalFrete: totalFrete,
        nfs: nfs.map(n => ({
            numero: n.numero,
            destino: n.destino,
            uf: n.uf,
            valor_frete: n.valor_frete
        }))
    };

    historico.unshift(novaEntrada); // Adiciona no início (mais recente primeiro)
    localStorage.setItem('rota_historico', JSON.stringify(historico));
}

function renderizarHistorico(termoBusca = "") {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    let historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    container.innerHTML = "";

    const canEdit = checkPerm.podeAlterar(false);

    const termo = termoBusca.toLowerCase();

    if (termo) {
        historico = historico.filter(item => {
            const nomeMatch = (item.nome || "").toLowerCase().includes(termo);
            const dataFinalizacaoMatch = (item.data || "").toLowerCase().includes(termo);
            
            let dataRotaMatch = false;
            if (item.dataRota) {
                // Verifica formato ISO (YYYY-MM-DD)
                if (item.dataRota.toLowerCase().includes(termo)) dataRotaMatch = true;
                
                // Verifica formato BR (DD/MM/YYYY) para facilitar busca
                const [y, m, d] = item.dataRota.split('-');
                const dataBR = `${d}/${m}/${y}`;
                if (dataBR.includes(termo)) dataRotaMatch = true;
            }
            
            return nomeMatch || dataFinalizacaoMatch || dataRotaMatch;
        });
    }

    if (historico.length === 0) {
        const msg = termo ? "Nenhum resultado encontrado." : "Nenhuma rota finalizada no histórico.";
        container.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>${msg}</p>`;
        return;
    }

    historico.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                    <strong style="font-size:16px;">${item.nome}</strong><br>
                    <small style="color:var(--text-muted)">${item.data}</small>
                </div>
                <div style="text-align:right">
                    <span style="color:var(--primary); font-weight:bold;">R$ ${formatar(item.totalFrete)}</span><br>
                    <small style="color:var(--text-muted)">${item.qtdNfs} NFs</small>
                </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px;" onclick="copiarResumoHistorico('${item.id}')">Resumo</button>
                ${canEdit ? `
                  <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:var(--accent); color:var(--accent);" onclick="retornarRota('${item.id}')">Retornar</button>
                  <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:#ef4444; color:#ef4444;" onclick="excluirHistorico('${item.id}')">Excluir</button>
                ` : ''}
                </div>
        `;
        container.appendChild(card);
    });
}

// EXCLUIR ROTA DO HISTÓRICO
window.excluirHistorico = function(historicoId) {
    confirmarAcao("Tem certeza que deseja excluir esta rota permanentemente do histórico?", () => {
        // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
        if (!checkPerm.podeAlterar()) return;

        let historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
        historico = historico.filter(h => h.id !== historicoId);
        localStorage.setItem('rota_historico', JSON.stringify(historico));
        
        renderizarHistorico();
    });
};

// RETORNAR ROTA PARA ATIVA
window.retornarRota = async function(historicoId) {
    const historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    
    if (!checkPerm.podeAlterar()) return;

    const item = historico.find(h => h.id == historicoId);
    
    if (!item) {
        mostrarAviso("Erro: Rota não encontrada no histórico.");
        return;
    }

    try {
        // 1. Criar a nova rota no banco de dados
        const { data: novaRota, error: errorRota } = await supabaseClient.from("rotas").insert([{ 
            nome: item.nome, 
            data: item.dataRota || null 
        }]).select();
        if (errorRota) throw errorRota;
        if (!novaRota || novaRota.length === 0) throw new Error("Falha ao recriar rota.");

        const novaRotaId = novaRota[0].id;

        // 2. Vincular as NFs de volta (atualização em lote por número da NF)
        if (item.nfs && item.nfs.length > 0) {
            const numeros = item.nfs.map(nf => nf.numero);
            const { error: errorNfs } = await supabaseClient.from("nfs").update({ rota_id: novaRotaId }).in("numero", numeros);
            if (errorNfs) throw errorNfs;
        }

        // 3. Remover do histórico do localStorage
        const novoHistorico = historico.filter(h => h.id != historicoId);
        localStorage.setItem('rota_historico', JSON.stringify(novoHistorico));

        // 4. Atualizar UI
        renderizarHistorico();
        carregarTudo();
        
        mostrarAviso(`Rota "${item.nome}" retornada para o painel ativo!`);
    } catch (err) {
        console.error("Erro ao retornar rota:", err);
        mostrarAviso("Erro ao tentar retornar a rota para o painel ativo. Verifique a conexão.");
    }
};

window.copiarResumoHistorico = async function(historicoId) {
    const historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    const item = historico.find(h => h.id == historicoId);
    
    if (!item) return;

    let resumo = `ROTA: ${item.nome} - ${item.data}\n`;
    resumo += `QTD NFs: ${item.qtdNfs}\n`;
    resumo += `TOTAL FRETE: R$ ${formatar(item.totalFrete)}\n\n`;

    item.nfs.forEach(nf => {
        resumo += `NF ${nf.numero} | ${nf.destino}/${nf.uf} | R$ ${formatar(nf.valor_frete)}\n`;
    });

    try {
        await navigator.clipboard.writeText(resumo);
        mostrarAviso("Resumo da rota copiado para a área de transferência!");
    } catch (e) {
        mostrarAviso("Erro ao copiar.");
    }
};

// EXCLUIR ROTA
window.deletarRota = async function(rotaId) {
  confirmarAcao("Tem certeza que deseja excluir esta rota? As Notas Fiscais vinculadas retornarão para a lista de pendentes.", async () => {
    // TAREFA 3: BLOQUEAR AÇÕES NA LÓGICA
    if (!checkPerm.podeAlterar()) return;

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

    const isVisualizador = checkPerm.isVisualizador();

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
            <h3 style="margin-bottom: 20px; color: var(--primary); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; font-size: 16px;">
                ${formatarDataComDiaSemana(dataKey)}
            </h3>
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
                        <th>Frete</th>
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
                        <td style="color: var(--primary); font-weight: 600;">R$ ${formatar(nf.valor_frete)}</td>
                        <td><span style="color: var(--text-muted); font-size: 11px;">Preparado</span></td>
                    </tr>
                `;
            });
        });

        html += `</tbody></table>`;
        cardData.innerHTML = html;
        container.appendChild(cardData);
    });
}

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

if (exportProgramacaoBtn) {
    exportProgramacaoBtn.addEventListener('click', () => {
        mostrarAviso("A funcionalidade de exportação da programação será implementada aqui.");
    });
}

// --- HISTÓRICO ESPECÍFICO DA PROGRAMAÇÃO ---

function renderizarHistoricoProgramacao(termoBusca = "") {
    const container = document.getElementById('programacao-history-container');
    if (!container) return;

    let historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    container.innerHTML = "";

    const canEdit = checkPerm.podeAlterar(false);

    const termo = termoBusca.toLowerCase();

    if (termo) {
        historico = historico.filter(item => {
            const nomeMatch = (item.nome || "").toLowerCase().includes(termo);
            const dataFinalizacaoMatch = (item.data || "").toLowerCase().includes(termo);
            
            let dataRotaMatch = false;
            if (item.dataRota) {
                // Verifica formato ISO (YYYY-MM-DD)
                if (item.dataRota.toLowerCase().includes(termo)) dataRotaMatch = true;
                
                // Verifica formato BR (DD/MM/YYYY)
                const [y, m, d] = item.dataRota.split('-');
                const dataBR = `${d}/${m}/${y}`;
                if (dataBR.includes(termo)) dataRotaMatch = true;
            }
            
            return nomeMatch || dataFinalizacaoMatch || dataRotaMatch;
        });
    }

    if (historico.length === 0) {
        const msg = termo ? "Nenhum resultado encontrado." : "Nenhuma rota finalizada no histórico da programação.";
        container.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>${msg}</p>`;
        return;
    }

    // Agrupar histórico por data da rota
    const agrupado = {};
    historico.forEach(item => {
        const dataKey = item.dataRota || "sem-data";
        if (!agrupado[dataKey]) agrupado[dataKey] = [];
        agrupado[dataKey].push(item);
    });

    const datas = Object.keys(agrupado).sort((a, b) => {
        if (a === "sem-data") return 1;
        if (b === "sem-data") return -1;
        return b.localeCompare(a); // Mais recentes primeiro no histórico
    });

    datas.forEach(dataKey => {
        const section = document.createElement('div');
        section.style.marginBottom = "30px";
        
        let html = `
            <h4 style="color: var(--primary); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 18px; font-size: 14px;">
                ${formatarDataComDiaSemana(dataKey)}
            </h4>
        `;

        agrupado[dataKey].forEach(rota => {
            html += `
                <div class="panel-container" style="margin-bottom: 15px; padding: 20px; background: rgba(30, 41, 59, 0.2); border-color: rgba(255,255,255,0.03);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <strong style="font-size: 14px;">Rota: ${rota.nome}</strong><br>
                            <small style="color:var(--text-muted); font-size: 11px;">Finalizada em: ${rota.data}</small>
                        </div>
                        <div style="text-align:right">
                            <span style="color:var(--primary); font-weight:bold;">R$ ${formatar(rota.totalFrete)}</span><br>
                            <small style="color:var(--text-muted)">${rota.qtdNfs} NFs</small>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px;" onclick="copiarResumoHistorico('${rota.id}')">Copiar Resumo</button>
                        ${canEdit ? `
                            <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:var(--accent); color:var(--accent);" onclick="retornarRotaProgramacao('${rota.id}')">Retornar para Ativa</button>
                        ` : ''}
                        </div>
                </div>
            `;
        });

        section.innerHTML = html;
        container.appendChild(section);
    });
}

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
  if (!e.target.closest('.user-display')) {
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.add('hidden'));
  }

  // Se o clique não foi em uma rota nem em uma NF da lista lateral, limpa a seleção
  if (!e.target.closest('.rota-card') && !e.target.closest('.nf-card')) {
    rotaSelecionada = null;
    document.querySelectorAll('.rota-card').forEach(c => c.classList.remove('selected'));
  }
});

// Iniciar o carregamento inicial após o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', checkAuth);
