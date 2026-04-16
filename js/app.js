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
        carregarTudo();
        exibirUsuarioLogado();
    } else {
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

function exibirUsuarioLogado() {
    const dashElem = document.getElementById('user-display-dashboard');
    const panelElem = document.getElementById('user-display-panel');
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuarioLogado) {
        if (dashElem) dashElem.innerHTML = "";
        if (panelElem) panelElem.innerHTML = "";
        return;
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
            <button onclick="handleLogout(event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sair
            </button>
        </div>
    `;

    [dashElem, panelElem].forEach(el => {
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

const btnTransporte = document.getElementById('btn-transporte');
const btnRetira = document.getElementById('btn-retira');
const rotaNomeInput = document.getElementById('rota-nome');
const rotaModalTitle = document.getElementById('rota-modal-title');
const rotaIdHidden = document.getElementById('rota-id-hidden');

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
const openControlPanelBtn = document.getElementById('open-control-panel-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const addUserBtn = document.getElementById('add-user-btn');
const createUserModal = document.getElementById('create-user-modal');
const createUserForm = document.getElementById('create-user-form');
const userModalTitle = document.getElementById('user-modal-title');
const userIdHidden = document.getElementById('user-id-hidden');

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

function renderizarUsuarios() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    const users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
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
    const users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
    const user = users.find(u => u.id == id);
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
    confirmarAcao("Tem certeza que deseja remover este usuário?", async () => {
        let users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');
        users = users.filter(u => u.id != id);
        localStorage.setItem('sirios_usuarios', JSON.stringify(users));
        renderizarUsuarios();
    });
};

function carregarUsuarios() {
    renderizarUsuarios();
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
        if (dashboardView && controlPanelView) {
            dashboardView.classList.add('hidden');
            controlPanelView.classList.remove('hidden');
            carregarUsuarios();
        }
    });
}

if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        if (dashboardView && controlPanelView) {
            controlPanelView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            carregarTudo(); // Garante que os dados estejam atualizados ao voltar
        }
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

        let users = JSON.parse(localStorage.getItem('sirios_usuarios') || '[]');

        if (users.some(u => u.email === email && u.id != id)) {
            mostrarAviso("Este e-mail já está cadastrado.");
            return;
        }

        const userData = {
            id: id || Date.now(),
            nome: nome,
            sobrenome: sobrenome,
            email: email,
            senha: senha,
            cargo: cargo,
            permissao: permissao,
            status: "Ativo"
        };

        if (id) {
            const index = users.findIndex(u => u.id == id);
            if (index !== -1) users[index] = userData;
        } else {
            users.push(userData);
        }

        localStorage.setItem('sirios_usuarios', JSON.stringify(users));

        // FIX 3: Corrigido para usar UPDATE ao editar e INSERT ao criar
        // BUG ORIGINAL: sempre usava insert, mesmo ao editar (duplicava registros no Supabase)
        try {
            let supaError;
            if (id) {
                const { error } = await supabaseClient.from("usuarios").update({
                    nome, sobrenome, email, senha, cargo, permissao
                }).eq("id", id);
                supaError = error;
            } else {
                const { error } = await supabaseClient.from("usuarios").insert([
                    { nome, sobrenome, email, senha, cargo, permissao }
                ]);
                supaError = error;
            }
            if (supaError) {
                console.error("Erro ao salvar no Supabase:", supaError);
            } else {
                console.log("Usuário salvo no Supabase com sucesso");
            }
        } catch (err) {
            console.error("Erro inesperado:", err);
        }

        closeModal(createUserModal);
        createUserForm.reset();
        if (userIdHidden) userIdHidden.value = "";
        renderizarUsuarios();
    });
}

// Event Listeners para abrir modais
if (openNfModalBtn) {
  openNfModalBtn.addEventListener('click', () => {
    if (nfModalTitle) nfModalTitle.innerText = "Adicionar Nova NF";
    if (nfIdHidden) nfIdHidden.value = "";
    if (createNfForm) createNfForm.reset();
    if (btnTransporte) btnTransporte.click();
    openModal(createNfModal);
  });
}
if (openRotaModalBtn) {
  openRotaModalBtn.addEventListener('click', () => {
    if (rotaModalTitle) rotaModalTitle.innerText = "Adicionar Nova Rota";
    if (rotaIdHidden) rotaIdHidden.value = "";
    if (rotaNomeInput) rotaNomeInput.value = "";
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

// CRIAR NF
async function handleCriarNF(event) {
  event.preventDefault(); // Previne o recarregamento da página

  console.log('handleCriarNF: Função chamada.');

  if (typeof supabaseClient === 'undefined') {
    console.error('handleCriarNF: Cliente supabaseClient não está definido. Verifique se supabaseClient.js foi carregado.');
    mostrarAviso('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  // Adicionado verificação para nfNumeroInput etc. para evitar erro se forem nulos
  const nfId = nfIdHidden ? nfIdHidden.value : '';
  const numero = nfNumeroInput ? nfNumeroInput.value.trim() : '';
  const destino = nfDestinoInput ? nfDestinoInput.value.trim() : '';
  const uf = nfUfInput ? nfUfInput.value.trim().toUpperCase() : '';
  const tipo = nfTipoInput ? nfTipoInput.value : 'transporte';
  const valor = nfValorInput ? parseFloat(nfValorInput.value) : 0;
  const observacao = nfObsInput ? nfObsInput.value.trim() : '';

  console.log('handleCriarNF: Dados coletados:', { numero, destino, uf, tipo, valor, observacao });

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
      valor_frete: tipo === 'retira' ? 0 : valor, 
      observacao: observacao,
      rota_id: null
    };

    let result;
    if (nfId) {
      // Modo Edição
      result = await supabaseClient.from("nfs").update(nfData).eq("id", nfId).select();
    } else {
      // Modo Criação
      result = await supabaseClient.from("nfs").insert([nfData]).select();
    }
    const { data, error } = result;

    if (error) {
      console.error('handleCriarNF: Erro ao inserir NF no supabaseClient:', error);
      mostrarAviso('Erro ao salvar NF: ' + error.message);
      return;
    }

    console.log('handleCriarNF: NF salva com sucesso:', data);
    
    if (createNfForm) { 
      createNfForm.reset();
      if (btnTransporte) btnTransporte.click();
    }
    closeModal(createNfModal);// closeModal(createNfModal);
    await carregarTudo(); // await carregarTudo();
  } catch (e) {
    console.error('handleCriarNF: Erro inesperado durante a criação da NF:', e);
    mostrarAviso('Ocorreu um erro inesperado ao criar a NF.');
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
  const rotaId = rotaIdHidden ? rotaIdHidden.value : '';
  console.log('handleCriarRota: Nome da rota coletado:', nome);

  if (!nome) {
    mostrarAviso("Por favor, insira um nome para a rota.");
    console.warn('handleCriarRota: Validação falhou. Nome da rota vazio.');
    return;
  }

  try {
    let result;
    if (rotaId) {
      // Modo Edição
      result = await supabaseClient.from("rotas").update({ nome }).eq("id", rotaId).select();
    } else {
      // Modo Criação
      result = await supabaseClient.from("rotas").insert([{ nome }]).select();
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
    
    if (data.uf === 'RT') {
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

// CARREGAR ROTAS (COM 3 COLUNAS)
async function carregarRotas() {
  if (typeof supabaseClient === 'undefined') {
    console.error('carregarRotas: Cliente supabaseClient não está definido.');
    return;
  }
  const { data: rotas, error: errR } = await supabaseClient.from("rotas").select("*");
  const { data: nfs, error: errN } = await supabaseClient.from("nfs").select("*");

  if (errR || errN || !rotas || !nfs) return;

  const container = document.querySelector(".rotas");
  if (!container) return;
  container.innerHTML = "";

  rotas.forEach(rota => {
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

    card.innerHTML = `
      <div class="rota-header">
        <div>
          <div class="rota-title-group">
            <h3>${rota.nome}</h3>
            <div class="rota-actions">
              <button class="icon-btn edit" title="Editar nome" onclick="event.stopPropagation(); editarRota('${rota.id}', '${rota.nome}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
              <button class="icon-btn delete" title="Excluir rota" onclick="event.stopPropagation(); deletarRota('${rota.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
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
window.editarRota = async function(rotaId, nomeAtual) {
  if (rotaModalTitle) rotaModalTitle.innerText = "Editar Rota";
  if (rotaIdHidden) rotaIdHidden.value = rotaId;
  if (rotaNomeInput) rotaNomeInput.value = nomeAtual;
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

function renderizarHistorico() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    const historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    container.innerHTML = "";

    if (historico.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:var(--text-muted); padding:20px;'>Nenhuma rota finalizada no histórico.</p>";
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
                <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:var(--accent); color:var(--accent);" onclick="retornarRota('${item.id}')">Retornar</button>
                <button class="btn btn-outline" style="flex:1; font-size:11px; padding:5px; border-color:#ef4444; color:#ef4444;" onclick="excluirHistorico('${item.id}')">Excluir</button>
            </div>
        `;
        container.appendChild(card);
    });
}

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
window.retornarRota = async function(historicoId) {
    const historico = JSON.parse(localStorage.getItem('rota_historico') || '[]');
    const item = historico.find(h => h.id == historicoId);
    
    if (!item) {
        mostrarAviso("Erro: Rota não encontrada no histórico.");
        return;
    }

    try {
        // 1. Criar a nova rota no banco de dados
        const { data: novaRota, error: errorRota } = await supabaseClient.from("rotas").insert([{ nome: item.nome }]).select();
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
if (createNfForm) {
  createNfForm.addEventListener('submit', handleCriarNF);
  console.log('Listener de submit para createNfForm anexado.');
} else {
  console.error('Elemento createNfForm não encontrado. O listener de submit não foi anexado.');
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
