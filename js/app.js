// ====================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ====================================================
const firebaseConfig = {
    apiKey: "AIzaSyCZgTUEIJFu9CcXI9-ppRmS0z-P3pQfscQ",
    authDomain: "controle-de-pneus-87e2e.firebaseapp.com",
    databaseURL: "https://controle-de-pneus-87e2e-default-rtdb.firebaseio.com",
    projectId: "controle-de-pneus-87e2e",
    storageBucket: "controle-de-pneus-87e2e.firebasestorage.app",
    messagingSenderId: "623395771332",
    appId: "1:623395771332:web:97f0a9c7959278e61fca91",
    measurementId: "G-JXGYQQ8S0E"
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
    veiculos: [],
    pneus: [],
    currentTab: 'carretas',
    searchTerm: ''
};

// Função auxiliar segura para tratar falha de carregamento da logo
function handleImageError(img) {
    img.style.display = 'none';
    const fallback = img.nextElementSibling;
    if (fallback) {
        fallback.classList.remove('hidden');
    }
}

// ====================================================
// INICIALIZAÇÃO E MONITORAMENTO
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    window.auth.onAuthStateChanged(user => {
        if (user) {
            state.user = user;
            const appHeader = document.getElementById('app-header');
            const appSubheader = document.getElementById('app-subheader');
            if (appHeader) appHeader.classList.remove('hidden');
            if (appSubheader) appSubheader.classList.remove('hidden');
            initRealtimeListeners();
        } else {
            state.user = null;
            const appHeader = document.getElementById('app-header');
            const appSubheader = document.getElementById('app-subheader');
            if (appHeader) appHeader.classList.add('hidden');
            if (appSubheader) appSubheader.classList.add('hidden');
            renderLoginView();
        }
    });
});

function initRealtimeListeners() {
    window.rtdb.ref('veiculos').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.veiculos = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        renderApp();
    });

    window.rtdb.ref('pneus').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.pneus = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        updateQuickStats();
        renderApp();
    });
}

// ====================================================
// LOGIN & LOGOUT
// ====================================================
function renderLoginView() {
    const container = document.getElementById('main-container');
    if (!container) return;

    container.innerHTML = `
        <div class="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-xl my-10 text-slate-800">
            <div class="text-center mb-6">
                <div class="h-24 flex items-center justify-center mx-auto mb-3 relative">
                    <img src="logo.jpg" alt="L-Prosp" class="max-h-full max-w-full object-contain" onerror="handleImageError(this)">
                    <i class="fas fa-truck text-4xl text-[#1e3a8a] hidden fallback-icon"></i>
                </div>
                <h2 class="text-2xl font-black tracking-tight text-slate-900">L-Prosp Logística</h2>
                <p class="text-xs text-slate-500 mt-1">Gestão Inteligente de Pneus e Frota</p>
            </div>

            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">USUÁRIO</label>
                    <input type="text" id="login-username" placeholder="Digite seu usuário ou e-mail" required 
                           class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SENHA</label>
                    <input type="password" id="login-password" placeholder="••••••••" required 
                           class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]">
                </div>
                <button type="submit" class="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white py-3 rounded-xl text-xs font-bold tracking-wider transition shadow-sm">
                    ENTRAR NO SISTEMA
                </button>
            </form>
        </div>
    `;
}

function handleLogin(e) {
    e.preventDefault();
    let userInput = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    let emailFinal = userInput.includes('@') ? userInput : `${userInput}@lprosp.com`;

    window.auth.signInWithEmailAndPassword(emailFinal, password)
        .then(() => showToast("Acesso liberado!", "success"))
        .catch(err => showToast("Erro de acesso: " + err.message, "error"));
}

function handleLogout() {
    window.auth.signOut();
}

// ====================================================
// NAVEGAÇÃO & PAINEL SUPERIOR
// ====================================================
function updateQuickStats() {
    const elUso = document.getElementById('stat-em-uso');
    const elEstoque = document.getElementById('stat-estoque');
    const elReforma = document.getElementById('stat-reforma');

    if (elUso) elUso.innerText = state.pneus.filter(p => p.status === 'Em Uso').length;
    if (elEstoque) elEstoque.innerText = state.pneus.filter(p => p.status === 'Estoque').length;
    if (elReforma) elReforma.innerText = state.pneus.filter(p => p.status === 'Reforma').length;
}

function switchTab(tab) {
    state.currentTab = tab;
    
    const btnCarretas = document.getElementById('tab-carretas');
    const btnPneus = document.getElementById('tab-pneus');

    if (btnCarretas && btnPneus) {
        if (tab === 'carretas') {
            btnCarretas.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 bg-[#1e3a8a] text-white shadow-sm";
            btnPneus.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 text-slate-600 hover:bg-white";
        } else {
            btnPneus.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 bg-[#1e3a8a] text-white shadow-sm";
            btnCarretas.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 text-slate-600 hover:bg-white";
        }
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
        renderVeiculosView(container);
    } else {
        renderPneusView(container);
    }
}

// ====================================================
// MAPEAMENTO DAS POSIÇÕES DOS EIXOS
// ====================================================
function getPosicoesEixo(tipoVeiculo, numeroEixo) {
    if (tipoVeiculo === 'cavalo' && numeroEixo === 1) {
        return [
            { pos: `E${numeroEixo}R1`, label: `E${numeroEixo}R1`, lado: 'esquerda' },
            { pos: `E${numeroEixo}R4`, label: `E${numeroEixo}R4`, lado: 'direita' }
        ];
    }
    
    return [
        { pos: `E${numeroEixo}R1`, label: `E${numeroEixo}R1`, lado: 'esquerda_fora' },
        { pos: `E${numeroEixo}R2`, label: `E${numeroEixo}R2`, lado: 'esquerda_dentro' },
        { pos: `E${numeroEixo}R3`, label: `E${numeroEixo}R3`, lado: 'direita_dentro' },
        { pos: `E${numeroEixo}R4`, label: `E${numeroEixo}R4`, lado: 'direita_fora' }
    ];
}

// ====================================================
// VISÃO DE VEÍCULOS / CARRETAS
// ====================================================
function renderVeiculosView(container) {
    const veiculosFiltrados = state.veiculos.filter(v => 
        (v.placa && v.placa.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (v.modelo && v.modelo.toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    const pneusEstoque = state.pneus.filter(p => p.status === 'Estoque');

    container.innerHTML = `
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div class="xl:col-span-8 space-y-6">
                
                <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-3 gap-3">
                    <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Estoque')" 
                         class="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 transition cursor-pointer">
                        <i class="fas fa-boxes-stacked text-slate-600 mb-1"></i>
                        <span class="text-xs font-bold text-slate-700">Retornar p/ Estoque</span>
                    </div>
                    <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Reforma')" 
                         class="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-amber-50 transition cursor-pointer">
                        <i class="fas fa-wrench text-amber-500 mb-1"></i>
                        <span class="text-xs font-bold text-slate-700">Enviar p/ Reforma</span>
                    </div>
                    <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToZone(event, 'Descartado')" 
                         class="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-red-50 transition cursor-pointer">
                        <i class="fas fa-trash-can text-red-500 mb-1"></i>
                        <span class="text-xs font-bold text-slate-700">Sucata / Descarte</span>
                    </div>
                </div>

                <div class="flex justify-between items-center">
                    <h2 class="text-lg font-black text-slate-800">FROTA DE VEÍCULOS</h2>
                    <button onclick="showAddVeiculoModal()" class="bg-[#1e3a8a] hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                        + Novo Veículo
                    </button>
                </div>

                ${veiculosFiltrados.length === 0 ? `
                    <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold shadow-sm">
                        NENHUM VEÍCULO CADASTRADO
                    </div>
                ` : veiculosFiltrados.map(veiculo => {
                    const pneusDoVeiculo = state.pneus.filter(p => p.veiculoId === veiculo.id);
                    const tipo = veiculo.tipo || 'carreta';
                    const qtdEixos = veiculo.eixos || 3;

                    return `
                        <div class="bg-white border border-slate-200 rounded-2xl p-6 text-slate-800 shadow-sm relative">
                            <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <div class="flex items-center gap-3">
                                    <span class="bg-[#1e3a8a] text-white font-black px-3 py-1 rounded-lg text-sm tracking-wider uppercase shadow-sm">
                                        ${escapeHtml(veiculo.placa)}
                                    </span>
                                    <div>
                                        <span class="text-xs font-bold uppercase text-slate-500">[${tipo.toUpperCase()}]</span>
                                        <span class="text-xs text-slate-500 ml-2">${escapeHtml(veiculo.modelo || '')} • ${veiculo.kmAtual || 0} KM</span>
                                    </div>
                                </div>
                                <button onclick="deletarVeiculo('${veiculo.id}', '${veiculo.placa}')" class="text-slate-400 hover:text-red-600 p-2 transition">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>

                            <div class="relative max-w-lg mx-auto py-4">
                                <div class="flex justify-center mb-6">
                                    <div class="bg-white text-slate-900 border-2 border-[#1e3a8a] rounded-md px-4 py-0.5 text-xs font-black tracking-widest shadow-sm flex items-center gap-1">
                                        <span class="text-[9px] bg-[#1e3a8a] text-white px-1 rounded-sm">BR</span>
                                        ${escapeHtml(veiculo.placa)}
                                    </div>
                                </div>

                                <div class="absolute left-1/2 top-14 bottom-14 -translate-x-1/2 w-10 border-x-2 border-slate-200 bg-slate-50 z-0"></div>

                                <div class="space-y-12 relative z-10">
                                    ${Array.from({ length: qtdEixos }, (_, index) => index + 1).map(eixoNum => {
                                        const posicoes = getPosicoesEixo(tipo, eixoNum);
                                        const ehSimples = posicoes.length === 2;

                                        return `
                                            <div class="relative flex items-center justify-between px-2">
                                                <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 -z-10"></div>
                                                ${ehSimples ? `
                                                    ${renderSlotPneu(veiculo.id, posicoes[0].pos, pneusDoVeiculo)}
                                                    <div class="text-[10px] font-bold text-slate-500 bg-white px-2 font-mono border border-slate-200 rounded">EIXO ${eixoNum}</div>
                                                    ${renderSlotPneu(veiculo.id, posicoes[1].pos, pneusDoVeiculo)}
                                                ` : `
                                                    <div class="flex gap-1.5">
                                                        ${renderSlotPneu(veiculo.id, posicoes[0].pos, pneusDoVeiculo)}
                                                        ${renderSlotPneu(veiculo.id, posicoes[1].pos, pneusDoVeiculo)}
                                                    </div>
                                                    <div class="text-[10px] font-bold text-slate-500 bg-white px-2 font-mono border border-slate-200 rounded">EIXO ${eixoNum}</div>
                                                    <div class="flex gap-1.5">
                                                        ${renderSlotPneu(veiculo.id, posicoes[2].pos, pneusDoVeiculo)}
                                                        ${renderSlotPneu(veiculo.id, posicoes[3].pos, pneusDoVeiculo)}
                                                    </div>
                                                `}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>

                                <div class="flex justify-center mt-8">
                                    <div class="bg-white text-slate-900 border-2 border-[#1e3a8a] rounded-md px-4 py-0.5 text-xs font-black tracking-widest shadow-sm flex items-center gap-1">
                                        <span class="text-[9px] bg-[#1e3a8a] text-white px-1 rounded-sm">BR</span>
                                        ${escapeHtml(veiculo.placa)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="xl:col-span-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-6">
                    <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 class="font-bold text-slate-800 text-sm">ESTOQUE DE PNEUS (${pneusEstoque.length})</h3>
                        <span class="text-[10px] text-slate-400 font-medium">Arraste para o eixo</span>
                    </div>

                    <input type="text" placeholder="Buscar por nº de fogo..." oninput="filterEstoqueVisual(this.value)" 
                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs mb-4 focus:outline-none focus:border-[#1e3a8a]">

                    <div id="visual-estoque-grid" class="grid grid-cols-2 gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                        ${pneusEstoque.length === 0 ? '<p class="col-span-2 text-center text-slate-400 text-xs py-8">Nenhum pneu em estoque.</p>' :
                        pneusEstoque.map(pneu => `
                            <div draggable="true" ondragstart="handleDragStart(event, '${pneu.id}')"
                                 class="draggable-tire estoque-item bg-slate-50 border border-slate-200 hover:border-[#1e3a8a] rounded-xl p-3 flex flex-col items-center justify-center transition shadow-sm cursor-grab">
                                <i class="fas fa-circle-notch text-2xl text-[#1e3a8a] mb-1"></i>
                                <span class="font-black text-xs text-slate-800 font-mono">${escapeHtml(pneu.fuego)}</span>
                                <span class="text-[10px] text-slate-500">${pneu.sulcoAtual} mm</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ====================================================
// SLOT DO PNEU
// ====================================================
function renderSlotPneu(veiculoId, pos, pneusDoVeiculo) {
    const pneu = pneusDoVeiculo.find(p => p.posicao === pos);
    return `
        <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSlot(event, '${veiculoId}', '${pos}')"
             class="w-12 h-20 rounded-lg border-2 ${pneu ? (pneu.sulcoAtual <= 3 ? 'border-red-500 bg-red-50' : 'border-[#1e3a8a] bg-blue-50/60') : 'border-dashed border-slate-300 bg-slate-50'} 
             flex flex-col items-center justify-center p-1 transition-all relative group cursor-pointer shadow-sm">
            ${pneu ? `
                <div draggable="true" ondragstart="handleDragStart(event, '${pneu.id}')" class="text-center w-full">
                    <span class="block font-black text-[11px] text-slate-900 leading-tight font-mono">${escapeHtml(pneu.fuego)}</span>
                    <span class="block text-[9px] ${pneu.sulcoAtual <= 3 ? 'text-red-600 font-bold' : 'text-slate-600'}">${pneu.sulcoAtual}mm</span>
                </div>
                <div class="absolute -bottom-4 text-[8px] font-bold text-slate-500 font-mono">${pos}</div>
            ` : `
                <span class="text-[8px] font-bold text-slate-400 text-center uppercase leading-none font-mono">${pos}</span>
            `}
        </div>
    `;
}

// ====================================================
// DRAG & DROP
// ====================================================
function handleDragStart(e, pneuId) {
    e.dataTransfer.setData('text/plain', pneuId);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'scale-105');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('border-blue-500', 'scale-105');
}

function handleDropToSlot(e, veiculoId, posicao) {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'scale-105');
    const pneuId = e.dataTransfer.getData('text/plain');
    if (!pneuId) return;

    const pneuExistenteNoSlot = state.pneus.find(p => p.veiculoId === veiculoId && p.posicao === posicao);
    const updates = {};
    
    if (pneuExistenteNoSlot && pneuExistenteNoSlot.id !== pneuId) {
        updates[`pneus/${pneuExistenteNoSlot.id}/status`] = 'Estoque';
        updates[`pneus/${pneuExistenteNoSlot.id}/veiculoId`] = null;
        updates[`pneus/${pneuExistenteNoSlot.id}/posicao`] = null;
    }

    updates[`pneus/${pneuId}/status`] = 'Em Uso';
    updates[`pneus/${pneuId}/veiculoId`] = veiculoId;
    updates[`pneus/${pneuId}/posicao`] = posicao;

    window.rtdb.ref().update(updates)
        .then(() => showToast(`Pneu alocado na posição ${posicao}!`, "success"))
        .catch(err => showToast("Erro ao alocar pneu: " + err.message, "error"));
}

function handleDropToZone(e, destinoStatus) {
    e.preventDefault();
    const pneuId = e.dataTransfer.getData('text/plain');
    const pneu = state.pneus.find(p => p.id === pneuId);
    if (pneu) showDesmontarModal(pneu, destinoStatus);
}

function showDesmontarModal(pneu, destino) {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-1">Mover Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">Destino selecionado: <b class="text-[#1e3a8a]">${destino}</b>. Atualize o sulco atual.</p>
            <form onsubmit="confirmarMovimentacao(event, '${pneu.id}', '${destino}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO MEDIDO (MM)</label>
                    <input type="number" step="0.1" id="drag-sulco" value="${pneu.sulcoAtual || 10}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold transition">CONFIRMAR</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarMovimentacao(e, pneuId, destino) {
    e.preventDefault();
    const sulco = parseFloat(document.getElementById('drag-sulco').value);
    window.rtdb.ref(`pneus/${pneuId}`).update({
        sulcoAtual: sulco,
        status: destino,
        veiculoId: null,
        posicao: null
    }).then(() => {
        closeModal();
        showToast(`Pneu movido para ${destino}!`, "success");
    });
}

function filterEstoqueVisual(term) {
    const items = document.querySelectorAll('.estoque-item');
    items.forEach(item => {
        const fuego = item.querySelector('.font-mono').innerText.toLowerCase();
        item.style.display = fuego.includes(term.toLowerCase()) ? 'flex' : 'none';
    });
}

// ====================================================
// MODAL DE VEÍCULO
// ====================================================
function showAddVeiculoModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Cadastrar Novo Veículo</h3>
            <form onsubmit="salvarVeiculo(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO DE VEÍCULO</label>
                    <select id="veiculo-tipo" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1e3a8a]">
                        <option value="carreta">Carreta / Semirreboque (Eixos duplos)</option>
                        <option value="cavalo">Cavalo Trator (1º eixo simples / Tração dupla)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA</label>
                    <input type="text" id="veiculo-placa" placeholder="ABC1D23" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs uppercase text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="veiculo-modelo" placeholder="Ex: Scania R450" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="veiculo-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]">
                            <option value="2">2 Eixos</option>
                            <option value="3" selected>3 Eixos</option>
                            <option value="4">4 Eixos</option>
                            <option value="5">5 Eixos</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold transition">SALVAR VEÍCULO</button>
                </div>
            </form>
        </div>
    `);
}

function salvarVeiculo(e) {
    e.preventDefault();
    const tipo = document.getElementById('veiculo-tipo').value;
    const placa = document.getElementById('veiculo-placa').value.toUpperCase().trim();
    const modelo = document.getElementById('veiculo-modelo').value.trim();
    const eixos = parseInt(document.getElementById('veiculo-eixos').value);

    window.rtdb.ref('veiculos').push({
        tipo: tipo,
        placa: placa,
        modelo: modelo,
        eixos: eixos,
        kmAtual: 0
    }).then(() => {
        closeModal();
        showToast("Veículo cadastrado!", "success");
    });
}

function deletarVeiculo(id, placa) {
    if (confirm(`Confirma a exclusão do veículo ${placa}? Todos os pneus alocados nele serão retornados ao estoque.`)) {
        const updates = {};
        state.pneus.filter(p => p.veiculoId === id).forEach(p => {
            updates[`pneus/${p.id}/status`] = 'Estoque';
            updates[`pneus/${p.id}/veiculoId`] = null;
            updates[`pneus/${p.id}/posicao`] = null;
        });
        updates[`veiculos/${id}`] = null;

        window.rtdb.ref().update(updates)
            .then(() => showToast("Veículo removido e pneus retornados ao estoque!", "success"));
    }
}

// ====================================================
// VISÃO DE TABELA DE PNEUS
// ====================================================
function renderPneusView(container) {
    const pneusFiltrados = state.pneus.filter(p => 
        (p.fuego && p.fuego.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 class="font-bold text-slate-800 text-sm">LISTA DE PNEUS (${pneusFiltrados.length})</h3>
                <button onclick="showAddPneuModal()" class="bg-[#1e3a8a] hover:bg-blue-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm">
                    + Cadastrar Pneus em Lote
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th class="p-3.5">Nº Fogo</th>
                            <th class="p-3.5">Marca / Medida</th>
                            <th class="p-3.5">Sulco</th>
                            <th class="p-3.5">Status</th>
                            <th class="p-3.5">Veículo / Pos.</th>
                            <th class="p-3.5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${pneusFiltrados.length === 0 ? `
                            <tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum pneu encontrado.</td></tr>
                        ` : pneusFiltrados.map(pneu => {
                            const veiculo = state.veiculos.find(v => v.id === pneu.veiculoId);
                            return `
                                <tr>
                                    <td class="p-3.5 font-black text-slate-800 font-mono">${escapeHtml(pneu.fuego)}</td>
                                    <td class="p-3.5 text-slate-600">${escapeHtml(pneu.marca || '-')} (${escapeHtml(pneu.medida || '-')})</td>
                                    <td class="p-3.5 font-semibold ${pneu.sulcoAtual <= 3 ? 'text-red-600' : 'text-slate-800'}">${pneu.sulcoAtual} mm</td>
                                    <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-100">${pneu.status}</span></td>
                                    <td class="p-3.5 text-slate-600">${veiculo ? `${escapeHtml(veiculo.placa)} (${pneu.posicao})` : 'Estoque'}</td>
                                    <td class="p-3.5 text-right"><button onclick="deletarPneu('${pneu.id}')" class="text-slate-400 hover:text-red-600 transition"><i class="fas fa-trash-can"></i></button></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showAddPneuModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Cadastrar Pneus em Lote</h3>
            <form onsubmit="salvarPneusEmLote(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">NÚMEROS DE FOGO (Separados por vírgula ou linha)</label>
                    <textarea id="pneu-fuegos" rows="3" placeholder="Ex: 85, 257, 323, 325" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required></textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" placeholder="Ex: 295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO INICIAL (MM)</label>
                    <input type="number" step="0.1" id="pneu-sulco" value="15.0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a8a]" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold transition">SALVAR</button>
                </div>
            </form>
        </div>
    `);
}

function salvarPneusEmLote(e) {
    e.preventDefault();
    const fuegosRaw = document.getElementById('pneu-fuegos').value;
    const marca = document.getElementById('pneu-marca').value.trim();
    const medida = document.getElementById('pneu-medida').value.trim();
    const sulco = parseFloat(document.getElementById('pneu-sulco').value);

    const fuegos = fuegosRaw.split(/[\n,]+/).map(f => f.trim()).filter(f => f.length > 0);
    const fuegosExistentes = new Set(state.pneus.map(p => p.fuego));
    const fuegosDuplicados = fuegos.filter(f => fuegosExistentes.has(f));

    if (fuegosDuplicados.length > 0) {
        showToast(`Erro: Os seguintes números de fogo já existem: ${fuegosDuplicados.join(', ')}`, "error");
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
            veiculoId: null,
            posicao: null
        };
    });

    window.rtdb.ref().update(updates).then(() => {
        closeModal();
        showToast(`${fuegos.length} pneu(s) cadastrado(s)!`, "success");
    });
}

function deletarPneu(id) {
    if (confirm(`Confirma excluir este pneu?`)) {
        window.rtdb.ref(`pneus/${id}`).remove()
            .then(() => showToast("Pneu excluído com sucesso!", "success"));
    }
}

// ====================================================
// UTILITÁRIOS DA INTERFACE (MODAL & TOAST)
// ====================================================
function openModal(htmlContent) {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (container && content) {
        content.innerHTML = htmlContent;
        container.classList.remove('hidden');
    }
}

function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) container.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
    toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 mb-2`;
    toast.innerHTML = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
