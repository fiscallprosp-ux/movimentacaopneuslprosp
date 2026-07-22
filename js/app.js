// ====================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ====================================================
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForTemplatePurposes123456",
    authDomain: "premiacao-lprosp-default-rtdb.firebaseapp.com",
    databaseURL: "https://premiacao-lprosp-default-rtdb.firebaseio.com",
    projectId: "premiacao-lprosp-default-rtdb",
    storageBucket: "premiacao-lprosp-default-rtdb.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
window.rtdb = firebase.database();
window.auth = firebase.auth();

// ====================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ====================================================
const state = {
    user: null,
    carretas: [],
    pneus: [],
    currentTab: 'carretas',
    searchTerm: ''
};

// ====================================================
// INICIALIZAÇÃO E MONITORAMENTO DE AUTENTICAÇÃO
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    window.auth.onAuthStateChanged(user => {
        if (user) {
            state.user = user;
            document.getElementById('app-header').classList.remove('hidden');
            document.getElementById('app-subheader').classList.remove('hidden');
            initRealtimeListeners();
        } else {
            state.user = null;
            document.getElementById('app-header').classList.add('hidden');
            document.getElementById('app-subheader').classList.add('hidden');
            renderLoginView();
        }
    });
});

// Listener do Realtime Database (Disparado somente após autenticado)
function initRealtimeListeners() {
    // Listener de Carretas
    window.rtdb.ref('carretas').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.carretas = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        renderApp();
    }, error => {
        showToast("Erro de permissão no banco: " + error.message, "error");
    });

    // Listener de Pneus
    window.rtdb.ref('pneus').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.pneus = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        updateQuickStats();
        renderApp();
    }, error => {
        showToast("Erro de permissão no banco: " + error.message, "error");
    });
}

// ====================================================
// FLUXO DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ====================================================
function renderLoginView() {
    const container = document.getElementById('main-container');
    container.innerHTML = `
        <div class="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-xl my-10">
            <div class="text-center mb-8">
                <!-- LOGO DA EMPRESA -->
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                    <img src="logo.png" alt="L-Prosp Logística" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentNode.innerHTML='<i class=\"fas fa-truck-moving text-2xl\"></i>';">
                </div>
                <h2 class="text-2xl font-black font-heading text-slate-800 tracking-tight">L-Prosp Logística</h2>
                <p class="text-xs text-slate-500 mt-1 font-medium">Painel de Gestão e Controle de Pneus</p>
            </div>

            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">USUÁRIO</label>
                    <div class="relative">
                        <i class="fas fa-user absolute left-3 top-3.5 text-slate-400 text-xs"></i>
                        <input type="text" id="login-username" placeholder="lprosp" required 
                               class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 transition">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SENHA</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-3 top-3.5 text-slate-400 text-xs"></i>
                        <input type="password" id="login-password" placeholder="••••••••" required 
                               class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 transition">
                    </div>
                </div>

                <button type="submit" id="btn-login" class="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold font-heading shadow-md transition flex items-center justify-center gap-2 mt-2">
                    <span>ENTRAR NO SISTEMA</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </form>
        </div>
    `;
}

function handleLogin(e) {
    e.preventDefault();
    let username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    // Se o usuário digitar sem @ (ex: 'lprosp'), converte para e-mail padrão do Firebase
    if (!username.includes('@')) {
        username = `${username}@lprosp.com`;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Autenticando...`;

    window.auth.signInWithEmailAndPassword(username, password)
        .then(() => {
            showToast("Acesso concedido com sucesso!", "success");
        })
        .catch(error => {
            btn.disabled = false;
            btn.innerHTML = `<span>ENTRAR NO SISTEMA</span> <i class="fas fa-arrow-right"></i>`;
            showToast("Usuário ou senha incorretos.", "error");
        });
}

function handleLogout() {
    window.auth.signOut().then(() => {
        showToast("Sessão encerrada.", "info");
    });
}

// ====================================================
// NAVEGAÇÃO E REGRAS DE INTERFACE
// ====================================================
function updateQuickStats() {
    const emUso = state.pneus.filter(p => p.status === 'Em Uso').length;
    const estoque = state.pneus.filter(p => p.status === 'Estoque').length;
    const reforma = state.pneus.filter(p => p.status === 'Reforma').length;

    document.getElementById('stat-em-uso').innerText = emUso;
    document.getElementById('stat-estoque').innerText = estoque;
    document.getElementById('stat-reforma').innerText = reforma;
}

function switchTab(tab) {
    state.currentTab = tab;
    
    const btnCarretas = document.getElementById('tab-carretas');
    const btnPneus = document.getElementById('tab-pneus');

    if (tab === 'carretas') {
        btnCarretas.className = "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all duration-150 flex items-center gap-2 bg-blue-600 text-white shadow-sm";
        btnPneus.className = "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all duration-150 flex items-center gap-2 text-slate-400 hover:text-white";
    } else {
        btnPneus.className = "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all duration-150 flex items-center gap-2 bg-blue-600 text-white shadow-sm";
        btnCarretas.className = "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all duration-150 flex items-center gap-2 text-slate-400 hover:text-white";
    }

    renderApp();
}

function handleSearch(term) {
    state.searchTerm = term;
    renderApp();
}

function renderApp() {
    if (!state.user) return;
    
    const container = document.getElementById('main-container');
    if (!container) return;

    if (state.currentTab === 'carretas') {
        renderCarretasView(container);
    } else {
        renderPneusView(container);
    }
}

// ====================================================
// 1. VISÃO DE CARRETAS / PÁTIO (DRAG & DROP VISUAL)
// ====================================================
function renderCarretasView(container) {
    const carretasFiltradas = state.carretas.filter(c => 
        (c.placa && c.placa.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (c.modelo && c.modelo.toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    const pneusEstoque = state.pneus.filter(p => p.status === 'Estoque');

    container.innerHTML = `
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            <!-- COLUNA DA ESQUERDA: DIAGRAMA DAS CARRETAS (8 Colunas) -->
            <div class="xl:col-span-8 space-y-6">
                <!-- Zonas de Desmontagem Rápida -->
                <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div id="zone-Estoque" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Estoque')" 
                         class="tire-action-zone border-2 border-dashed border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 transition">
                        <i class="fas fa-boxes-stacked text-slate-500 mb-1"></i>
                        <span class="text-[11px] font-bold font-heading text-slate-700">Retornar p/ Estoque</span>
                    </div>
                    <div id="zone-Reforma" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Reforma')" 
                         class="tire-action-zone border-2 border-dashed border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-orange-50 transition">
                        <i class="fas fa-wrench text-amber-500 mb-1"></i>
                        <span class="text-[11px] font-bold font-heading text-slate-700">Enviar p/ Reforma</span>
                    </div>
                    <div id="zone-Descartado" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Descartado')" 
                         class="tire-action-zone border-2 border-dashed border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-red-50 transition col-span-2 md:col-span-1">
                        <i class="fas fa-trash-can text-red-500 mb-1"></i>
                        <span class="text-[11px] font-bold font-heading text-slate-700">Sucata / Descarte</span>
                    </div>
                </div>

                <!-- Lista de Carretas -->
                ${carretasFiltradas.length === 0 ? `
                    <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                        <i class="fas fa-truck-front text-4xl mb-3 text-slate-300"></i>
                        <p class="font-bold font-heading text-slate-600">NENHUMA CARRETA ENCONTRADA</p>
                    </div>
                ` : carretasFiltradas.map(carreta => {
                    const pneusDaCarreta = state.pneus.filter(p => p.carretaId === carreta.id);
                    return `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
                            <div class="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded font-black font-heading text-sm uppercase">${escapeHtml(carreta.placa)}</span>
                                        ${carreta.cavaloEngatado ? `<span class="text-xs text-blue-400 font-bold"><i class="fas fa-truck"></i> ${escapeHtml(carreta.cavaloEngatado)}</span>` : ''}
                                    </div>
                                    <p class="text-xs text-slate-400 mt-1">${escapeHtml(carreta.modelo || 'Sem Modelo')} • ${carreta.kmAtual ? carreta.kmAtual.toLocaleString() : 0} KM</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="showEditCarretaModal('${carreta.id}')" class="text-slate-400 hover:text-white p-1.5"><i class="fas fa-pen-to-square"></i></button>
                                    <button onclick="deletarCarreta('${carreta.id}', '${carreta.placa}')" class="text-slate-400 hover:text-red-400 p-1.5"><i class="fas fa-trash-can"></i></button>
                                </div>
                            </div>

                            <!-- Diagrama do Veículo -->
                            <div class="flex flex-col items-center gap-6 py-2">
                                <div class="text-[10px] text-slate-500 font-bold font-heading uppercase tracking-widest">FRENTE DA CARRETA</div>
                                
                                ${Array.from({ length: carreta.eixos || 3 }, (_, index) => index + 1).map(eixo => {
                                    const posEsquerda = `E${eixo}E`;
                                    const posDireita = `E${eixo}D`;
                                    const pneuE = pneusDaCarreta.find(p => p.posicao === posEsquerda);
                                    const pneuD = pneusDaCarreta.find(p => p.posicao === posDireita);

                                    return `
                                        <div class="flex items-center justify-center gap-4 w-full max-w-md">
                                            <!-- SLOT ESQUERDO -->
                                            <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSlot(event, '${carreta.id}', '${posEsquerda}')"
                                                 class="w-36 h-16 rounded-xl border-2 ${pneuE ? (pneuE.sulcoAtual <= 3 ? 'border-red-500 bg-red-950/40' : 'border-blue-500 bg-blue-950/40') : 'border-dashed border-slate-700 bg-slate-800/50'} 
                                                 flex items-center justify-between px-3 transition-all">
                                                ${pneuE ? `
                                                    <div draggable="true" ondragstart="handleDragStart(event, '${pneuE.id}', 'installed')" class="draggable-tire flex items-center gap-2 w-full">
                                                        <i class="fas fa-circle-notch text-2xl ${pneuE.sulcoAtual <= 3 ? 'text-red-400' : 'text-blue-400'}"></i>
                                                        <div class="overflow-hidden">
                                                            <div class="font-black text-xs text-white leading-tight">${escapeHtml(pneuE.fuego)}</div>
                                                            <div class="text-[10px] text-slate-400">${pneuE.sulcoAtual}mm</div>
                                                        </div>
                                                    </div>
                                                ` : `
                                                    <div class="text-center w-full text-slate-600 font-bold text-[10px] uppercase">${posEsquerda}<br><span class="text-[8px] font-normal">Solte o pneu</span></div>
                                                `}
                                            </div>

                                            <!-- EIXO -->
                                            <div class="h-2.5 flex-1 bg-slate-700 rounded-full border border-slate-600"></div>

                                            <!-- SLOT DIREITO -->
                                            <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSlot(event, '${carreta.id}', '${posDireita}')"
                                                 class="w-36 h-16 rounded-xl border-2 ${pneuD ? (pneuD.sulcoAtual <= 3 ? 'border-red-500 bg-red-950/40' : 'border-blue-500 bg-blue-950/40') : 'border-dashed border-slate-700 bg-slate-800/50'} 
                                                 flex items-center justify-between px-3 transition-all">
                                                ${pneuD ? `
                                                    <div draggable="true" ondragstart="handleDragStart(event, '${pneuD.id}', 'installed')" class="draggable-tire flex items-center gap-2 w-full">
                                                        <i class="fas fa-circle-notch text-2xl ${pneuD.sulcoAtual <= 3 ? 'text-red-400' : 'text-blue-400'}"></i>
                                                        <div class="overflow-hidden">
                                                            <div class="font-black text-xs text-white leading-tight">${escapeHtml(pneuD.fuego)}</div>
                                                            <div class="text-[10px] text-slate-400">${pneuD.sulcoAtual}mm</div>
                                                        </div>
                                                    </div>
                                                ` : `
                                                    <div class="text-center w-full text-slate-600 font-bold text-[10px] uppercase">${posDireita}<br><span class="text-[8px] font-normal">Solte o pneu</span></div>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- COLUNA DA DIREITA: ESTOQUE VISUAL (4 Colunas) -->
            <div class="xl:col-span-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-20">
                    <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 class="font-bold font-heading text-slate-800 text-sm">ESTOQUE (${pneusEstoque.length})</h3>
                        <span class="text-[10px] text-slate-400 font-semibold">Arraste para a posição</span>
                    </div>

                    <!-- Busca Rápida de Pneus no Estoque -->
                    <div class="relative mb-4">
                        <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                        <input type="text" placeholder="Filtrar nº de fogo..." 
                               oninput="filterEstoqueVisual(this.value)" 
                               class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-600">
                    </div>

                    <!-- Grid de Cards do Estoque -->
                    <div id="visual-estoque-grid" class="grid grid-cols-3 gap-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                        ${pneusEstoque.length === 0 ? '<p class="col-span-3 text-center text-slate-400 text-xs py-8">Nenhum pneu no estoque.</p>' : 
                            pneusEstoque.map(pneu => `
                                <div draggable="true" 
                                     ondragstart="handleDragStart(event, '${pneu.id}', 'stock')"
                                     class="draggable-tire estoque-item bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-500 rounded-xl p-2.5 flex flex-col items-center justify-center transition shadow-sm group">
                                    <i class="fas fa-circle-notch text-2xl text-slate-700 group-hover:text-blue-600 mb-1 transition"></i>
                                    <span class="font-black text-xs text-slate-800 font-heading">${escapeHtml(pneu.fuego)}</span>
                                    <span class="text-[9px] text-slate-500">${pneu.sulcoAtual}mm</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>

        </div>
    `;
}

// ====================================================
// LÓGICA DE DRAG & DROP
// ====================================================
function handleDragStart(e, pneuId, sourceType) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ pneuId, sourceType }));
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drop-zone-active', 'drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-zone-active', 'drag-over');
}

function handleDropToSlot(e, carretaId, posicao) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-zone-active', 'drag-over');

    const dataRaw = e.dataTransfer.getData('text/plain');
    if (!dataRaw) return;

    const { pneuId } = JSON.parse(dataRaw);

    window.rtdb.ref(`pneus/${pneuId}`).update({
        status: 'Em Uso',
        carretaId: carretaId,
        posicao: posicao
    }).then(() => showToast(`Pneu instalado na posição ${posicao}!`, "success"))
      .catch((err) => showToast("Erro de gravação: Sem permissão (" + err.message + ")", "error"));
}

function handleDropToZone(e, destinoStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-zone-active', 'drag-over');

    const dataRaw = e.dataTransfer.getData('text/plain');
    if (!dataRaw) return;

    const { pneuId } = JSON.parse(dataRaw);
    const pneu = state.pneus.find(p => p.id === pneuId);

    if (pneu) {
        showDesmontarModalComDestino(pneu, destinoStatus);
    }
}

function showDesmontarModalComDestino(pneu, destino) {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Mover Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">Destino selecionado: <b class="text-blue-600">${destino}</b>. Atualize a medição do sulco.</p>

            <form onsubmit="confirmarMovimentacaoDrag(event, '${pneu.id}', '${destino}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO ATUAL MEDIDO (MM)</label>
                    <input type="number" step="0.1" id="drag-sulco" value="${pneu.sulcoAtual || 10}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading hover:bg-slate-200 transition">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold font-heading hover:bg-blue-500 transition">CONFIRMAR</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarMovimentacaoDrag(e, pneuId, destino) {
    e.preventDefault();
    const sulco = parseFloat(document.getElementById('drag-sulco').value);

    window.rtdb.ref(`pneus/${pneuId}`).update({
        sulcoAtual: sulco,
        status: destino,
        carretaId: null,
        posicao: null
    }).then(() => {
        closeModal();
        showToast(`Pneu movido para ${destino}!`, "success");
    }).catch((err) => showToast("Erro: " + err.message, "error"));
}

function filterEstoqueVisual(term) {
    const items = document.querySelectorAll('.estoque-item');
    items.forEach(item => {
        const fuego = item.querySelector('.font-black').innerText.toLowerCase();
        if (fuego.includes(term.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ====================================================
// 2. VISÃO DE TABELA DE PNEUS (ESTOQUE E HISTÓRICO)
// ====================================================
function renderPneusView(container) {
    const pneusFiltrados = state.pneus.filter(p => 
        (p.fuego && p.fuego.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (p.status && p.status.toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 class="font-bold font-heading text-slate-800 text-sm">TODOS OS PNEUS (${pneusFiltrados.length})</h3>
                <button onclick="showAddPneuModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold font-heading transition">
                    + Cadastrar em Lote
                </button>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th class="p-3.5">Nº de Fogo</th>
                            <th class="p-3.5">Marca / Modelo</th>
                            <th class="p-3.5">Medida</th>
                            <th class="p-3.5">Sulco Atual</th>
                            <th class="p-3.5">Status</th>
                            <th class="p-3.5">Localização</th>
                            <th class="p-3.5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${pneusFiltrados.length === 0 ? `
                            <tr>
                                <td colspan="7" class="p-8 text-center text-slate-400">Nenhum pneu encontrado.</td>
                            </tr>
                        ` : pneusFiltrados.map(pneu => {
                            const carreta = state.carretas.find(c => c.id === pneu.carretaId);
                            return `
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="p-3.5 font-black text-slate-800 font-heading">${escapeHtml(pneu.fuego)}</td>
                                    <td class="p-3.5 text-slate-600">${escapeHtml(pneu.marca || '-')} ${pneu.modelo ? '/ ' + escapeHtml(pneu.modelo) : ''}</td>
                                    <td class="p-3.5 text-slate-600">${escapeHtml(pneu.medida || '-')}</td>
                                    <td class="p-3.5 font-semibold ${pneu.sulcoAtual <= 3 ? 'text-red-600' : 'text-slate-800'}">${pneu.sulcoAtual} mm</td>
                                    <td class="p-3.5">
                                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                            pneu.status === 'Em Uso' ? 'bg-emerald-100 text-emerald-700' :
                                            pneu.status === 'Estoque' ? 'bg-blue-100 text-blue-700' :
                                            pneu.status === 'Reforma' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        }">
                                            ${pneu.status}
                                        </span>
                                    </td>
                                    <td class="p-3.5 text-slate-600">
                                        ${carreta ? `<span class="font-bold text-slate-700">${escapeHtml(carreta.placa)}</span> (${pneu.posicao})` : 'Estoque'}
                                    </td>
                                    <td class="p-3.5 text-right space-x-1">
                                        <button onclick="deletarPneu('${pneu.id}', '${pneu.fuego}')" class="text-slate-400 hover:text-red-500 p-1"><i class="fas fa-trash-can"></i></button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ====================================================
// MODAIS DE CADASTRO E EDIÇÃO
// ====================================================
function showAddPneuModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">Cadastrar Pneus</h3>
            <form onsubmit="salvarPneusEmLote(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">NÚMEROS DE FOGO (Um por linha ou separados por vírgula)</label>
                    <textarea id="pneu-fuegos" rows="3" placeholder="Ex: 227, 228, 229" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600" required></textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" placeholder="Ex: 295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO INICIAL (MM)</label>
                    <input type="number" step="0.1" id="pneu-sulco" value="15.0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold font-heading">SALVAR PNEUS</button>
                </div>
            </form>
        </div>
    `);
}

function salvarPneusEmLote(e) {
    e.preventDefault();
    const fuegosRaw = document.getElementById('pneu-fuegos').value;
    const marca = document.getElementById('pneu-marca').value;
    const medida = document.getElementById('pneu-medida').value;
    const sulco = parseFloat(document.getElementById('pneu-sulco').value);

    const fuegos = fuegosRaw.split(/[\n,]+/).map(f => f.trim()).filter(f => f.length > 0);

    if (fuegos.length === 0) {
        showToast("Digite ao menos um número de fogo.", "error");
        return;
    }

    const updates = {};
    fuegos.forEach(fuego => {
        const newRef = window.rtdb.ref('pneus').push();
        updates[`pneus/${newRef.key}`] = {
            fuego: fuego,
            marca: marca,
            medida: medida,
            sulcoAtual: sulco,
            status: 'Estoque',
            carretaId: null,
            posicao: null
        };
    });

    window.rtdb.ref().update(updates).then(() => {
        closeModal();
        showToast(`${fuegos.length} pneu(s) cadastrado(s) no estoque!`, "success");
    }).catch((err) => showToast("Sem permissão para criar registros: " + err.message, "error"));
}

function showAddCarretaModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">Nova Carreta</h3>
            <form onsubmit="salvarCarreta(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA</label>
                    <input type="text" id="carreta-placa" placeholder="ABC1D23" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs uppercase" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="carreta-modelo" placeholder="Ex: Randon 3 Eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="carreta-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                            <option value="2">2 Eixos (4 Rodas)</option>
                            <option value="3" selected>3 Eixos (6 Rodas)</option>
                            <option value="4">4 Eixos (8 Rodas)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">CAVALO ENGATADO (OPCIONAL)</label>
                    <input type="text" id="carreta-cavalo" placeholder="Ex: Scania R450" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold font-heading">SALVAR CARRETA</button>
                </div>
            </form>
        </div>
    `);
}

function salvarCarreta(e) {
    e.preventDefault();
    const placa = document.getElementById('carreta-placa').value.toUpperCase().trim();
    const modelo = document.getElementById('carreta-modelo').value.trim();
    const eixos = parseInt(document.getElementById('carreta-eixos').value);
    const cavalo = document.getElementById('carreta-cavalo').value.trim();

    window.rtdb.ref('carretas').push({
        placa: placa,
        modelo: modelo,
        eixos: eixos,
        cavaloEngatado: cavalo,
        kmAtual: 0
    }).then(() => {
        closeModal();
        showToast("Carreta adicionada com sucesso!", "success");
    }).catch((err) => showToast("Erro: " + err.message, "error"));
}

function deletarCarreta(id, placa) {
    if (confirm(`Tem certeza que deseja excluir a carreta ${placa}?`)) {
        window.rtdb.ref(`carretas/${id}`).remove()
            .then(() => showToast("Carreta removida!", "success"))
            .catch((err) => showToast("Erro de permissão: " + err.message, "error"));
    }
}

function deletarPneu(id, fuego) {
    if (confirm(`Tem certeza que deseja excluir o pneu nº ${fuego}?`)) {
        window.rtdb.ref(`pneus/${id}`).remove()
            .then(() => showToast("Pneu removido!", "success"))
            .catch((err) => showToast("Erro de permissão: " + err.message, "error"));
    }
}

// ====================================================
// UTILITÁRIOS (MODAIS, TOASTS E SEGURANÇA)
// ====================================================
function openModal(htmlContent) {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    content.innerHTML = htmlContent;
    container.classList.remove('hidden');
}

function closeModal() {
    const container = document.getElementById('modal-container');
    container.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800';
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold font-heading flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> ${escapeHtml(message)}`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
