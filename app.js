// Referências aos elementos do DOM para os modais
const createNfModal = document.getElementById('create-nf-modal');
const createRotaModal = document.getElementById('create-rota-modal');

const openNfModalBtn = document.getElementById('open-nf-modal-btn');
const openRotaModalBtn = document.getElementById('open-rota-modal-btn');

const createNfForm = document.getElementById('create-nf-form');
const createRotaForm = document.getElementById('create-rota-form');

const nfNumeroInput = document.getElementById('nf-numero');
const nfDestinoInput = document.getElementById('nf-destino');
const nfUfInput = document.getElementById('nf-uf');
const nfTipoInput = document.getElementById('nf-tipo');
const nfObsInput = document.getElementById('nf-obs');
const nfValorInput = document.getElementById('nf-valor');

const btnTransporte = document.getElementById('btn-transporte');
const btnRetira = document.getElementById('btn-retira');
const rotaNomeInput = document.getElementById('rota-nome');

const searchInput = document.querySelector('.search');
let filtroAtual = "todos";
let rotaSelecionada = null;

// Funções para abrir e fechar modais
function openModal(modalElement) {
  modalElement.classList.add('active');
  if (!modalElement) {
    console.error('openModal: Elemento modal é nulo.');
  }
}

function closeModal(modalElement) {
  modalElement.classList.remove('active');
  if (!modalElement) {
    console.error('closeModal: Elemento modal é nulo.');
  }
}


// Event Listeners para abrir modais
if (openNfModalBtn) {
  openNfModalBtn.addEventListener('click', () => openModal(createNfModal));
}
if (openRotaModalBtn) {
  openRotaModalBtn.addEventListener('click', () => openModal(createRotaModal));
} else {
  console.warn('openRotaModalBtn não encontrado.');
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
    alert('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  // Adicionado verificação para nfNumeroInput etc. para evitar erro se forem nulos
  const numero = nfNumeroInput ? nfNumeroInput.value.trim() : '';
  const destino = nfDestinoInput ? nfDestinoInput.value.trim() : '';
  const uf = nfUfInput ? nfUfInput.value.trim().toUpperCase() : '';
  const tipo = nfTipoInput ? nfTipoInput.value : 'transporte';
  const valor = nfValorInput ? parseFloat(nfValorInput.value) : 0;
  const observacao = nfObsInput ? nfObsInput.value.trim() : '';

  console.log('handleCriarNF: Dados coletados:', { numero, destino, uf, tipo, valor, observacao });

  // Validação básica
  if (!numero) {
    alert("Por favor, preencha o número da NF.");
    return;
  }

  // Validação condicional baseada no tipo
  if (tipo === 'transporte' && (!destino || !uf || isNaN(valor))) {
    alert("Por favor, preencha todos os campos (Destino, UF e Valor) para NFs de Transporte.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("nfs").insert([{
      numero,
      destino: tipo === 'retira' ? 'RETIRA' : destino,
      uf: tipo === 'retira' ? 'RT' : uf,
      valor_frete: tipo === 'retira' ? 0 : valor, 
      observacao: observacao,
      rota_id: null
    }]).select();

    if (error) {
      console.error('handleCriarNF: Erro ao inserir NF no supabaseClient:', error);
      alert('Erro ao salvar NF: ' + error.message);
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
    alert('Ocorreu um erro inesperado ao criar a NF.');
  }
}

// CRIAR ROTA
async function handleCriarRota(event) {
  event.preventDefault(); // Previne o recarregamento da página

  console.log('handleCriarRota: Função chamada.');

  if (typeof supabaseClient === 'undefined') {
    console.error('handleCriarRota: Cliente supabaseClient não está definido. Verifique se supabaseClient.js foi carregado.');
    alert('Erro: O serviço de banco de dados não está disponível. Verifique a conexão.');
    return;
  }

  const nome = rotaNomeInput ? rotaNomeInput.value.trim() : '';
  console.log('handleCriarRota: Nome da rota coletado:', nome);

  if (!nome) {
    alert("Por favor, insira um nome para a rota.");
    console.warn('handleCriarRota: Validação falhou. Nome da rota vazio.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("rotas").insert([{ nome }]).select();

    if (error) {
      console.error('handleCriarRota: Erro ao inserir Rota no supabaseClient:', error);
      alert('Erro ao salvar Rota: ' + error.message);
      return;
    }

    console.log('handleCriarRota: Rota salva com sucesso:', data);
    carregarTudo();
    closeModal(createRotaModal);
    if (createRotaForm) { // Verifica se o formulário existe antes de resetar
      createRotaForm.reset();
    }
  } catch (e) {
    console.error('handleCriarRota: Erro inesperado durante a criação da Rota:', e);
    alert('Ocorreu um erro inesperado ao criar a Rota.');
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

// Listener para a busca
if (searchInput) {
  searchInput.addEventListener('input', carregarNFs);
}

// ENVIAR PARA ROTA
async function enviarParaRota(nfId) {
  if (typeof supabaseClient === 'undefined') {
    console.error('enviarParaRota: Cliente supabaseClient não está definido.');
    alert('Erro: O serviço de banco de dados não está disponível.');
    return;
  }
  
  if (!rotaSelecionada) {
    alert("Selecione uma rota primeiro clicando nela!");
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
          <h3>${rota.nome}</h3>
          <span>${nfsDaRota.length} NFs</span>
        </div>
        <div class="valor">R$ ${formatar(total)}</div>
      </div>

      <div class="rota-body">

        <div class="nf-header">
          <span>NF</span>
          <span>Destino</span>
          <span>Frete</span>
        </div>

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

// Evento global para deselecionar rota ao clicar fora
document.addEventListener('click', (e) => {
  // Se o clique não foi em uma rota nem em uma NF da lista lateral, limpa a seleção
  if (!e.target.closest('.rota-card') && !e.target.closest('.nf-card')) {
    rotaSelecionada = null;
    document.querySelectorAll('.rota-card').forEach(c => c.classList.remove('selected'));
  }
});

// Iniciar o carregamento inicial após o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', carregarTudo);
