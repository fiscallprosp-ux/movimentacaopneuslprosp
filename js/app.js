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
// Limite recomendado de reformas por pneu (ajuste conforme a política da empresa/fabricante)
const LIMITE_REFORMAS_RECOMENDADO = 2;

const state = {
    user: null,
    veiculos: [],
    pneus: [],
    historico: [],
    currentTab: 'carretas',
    searchTerm: ''
};

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

    // Vincula automaticamente eventos de clique caso os botões existam na interface
    vincularEventosNavegacao();
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

    window.rtdb.ref('historico').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.historico = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        if (state.currentTab === 'analise') renderApp();
    });
}

// ====================================================
// LOGIN & LOGOUT
// ====================================================
function renderLoginView() {
    const container = document.getElementById('main-container');
    if (!container) return;

    container.innerHTML = `
        <div class="max-w-md w-full mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl my-10 text-white">
            <div class="text-center mb-6">
                <div class="h-24 flex items-center justify-center mx-auto mb-3">
                    <img src="logo.jpg" alt="L-Prosp" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.parentNode.innerHTML='<i class=\"fas fa-truck text-4xl text-blue-500\"></i>';">
                </div>
                <h2 class="text-2xl font-black tracking-tight font-heading">L-Prosp Logística</h2>
                <p class="text-xs text-slate-400 mt-1">Gestão Inteligente de Pneus e Frota</p>
            </div>

            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">USUÁRIO</label>
                    <input type="text" id="login-username" placeholder="lprosp ou lurian" required 
                           class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">SENHA</label>
                    <input type="password" id="login-password" placeholder="••••••••" required 
                           class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                </div>
                <button type="submit" id="btn-login" class="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold tracking-wider transition">
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
        .catch(err => showToast("Erro de acesso: " + traduzirErroAuth(err), "error"));
}

// Traduz os códigos de erro mais comuns do Firebase Auth para mensagens em português
function traduzirErroAuth(err) {
    const mensagens = {
        'auth/invalid-credential': 'usuário ou senha incorretos.',
        'auth/invalid-email': 'usuário inválido.',
        'auth/user-not-found': 'usuário não encontrado.',
        'auth/wrong-password': 'senha incorreta.',
        'auth/too-many-requests': 'muitas tentativas. Aguarde um momento e tente novamente.',
        'auth/network-request-failed': 'falha de conexão. Verifique sua internet.',
        'auth/user-disabled': 'este usuário foi desativado.'
    };
    return mensagens[err.code] || err.message;
}

function handleLogout() {
    window.auth.signOut();
}

// Extrai um nome de usuário legível a partir do e-mail logado (ex: lprosp@lprosp.com -> lprosp)
function getUsuarioAtual() {
    if (!state.user || !state.user.email) return 'desconhecido';
    return state.user.email.split('@')[0];
}

// ====================================================
// NAVEGAÇÃO & PAINEL SUPERIOR (CORRIGIDO E ROBUSTO)
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
    
    // Procura por ID ou por texto/conteúdo nos botões do cabeçalho superior para garantir o destaque visual
    const botoes = document.querySelectorAll('button, div[onclick*="switchTab"]');
    botoes.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(tab)) {
            btn.classList.remove('bg-slate-800', 'text-slate-400');
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
        } else if (onclickAttr.includes('switchTab')) {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
            btn.classList.add('bg-slate-800', 'text-slate-400');
        }
    });

    renderApp();
}

function vincularEventosNavegacao() {
    // Garante que o botão "Nova Carreta" / "+ Novo Veículo" funcione globalmente
    document.querySelectorAll('button').forEach(btn => {
        const texto = btn.innerText.toLowerCase();
        if (texto.includes('nova carreta') || texto.includes('novo veículo') || texto.includes('novo veiculo')) {
            btn.onclick = () => showAddVeiculoModal();
        }
    });
}

let searchDebounceTimer = null;
function handleSearch(term) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        state.searchTerm = term;
        renderApp();
    }, 250);
}

function renderApp() {
    if (!state.user) return;
    const container = document.getElementById('main-container');
    if (!container) return;

    if (state.currentTab === 'carretas') {
        renderVeiculosView(container);
    } else if (state.currentTab === 'pneus') {
        renderPneusView(container);
    } else {
        renderAnaliseView(container);
    }
    vincularEventosNavegacao();
}

// ====================================================
// MÉTRICAS DE VIDA ÚTIL / CUSTO POR PNEU
// ====================================================
function calcularMetricasPneu(pneu) {
    let kmEmAndamento = 0;
    if (pneu.status === 'Em Uso' && pneu.kmInstalacaoAtual != null) {
        const veiculo = state.veiculos.find(v => v.id === pneu.veiculoId);
        if (veiculo) kmEmAndamento = Math.max(0, (veiculo.kmAtual || 0) - pneu.kmInstalacaoAtual);
    }
    const kmTotal = (pneu.kmRodadoTotal || 0) + kmEmAndamento;

    // Se não sabemos o valor pago E não houve custo de reforma registrado, o custo é
    // DESCONHECIDO (null) — não pode ser tratado como zero, senão o pneu pareceria
    // "de graça" e distorceria o ranking de custo por km.
    const custoConhecido = pneu.valorPago != null || (pneu.custoReformasTotal || 0) > 0;
    const custoTotal = custoConhecido ? (pneu.valorPago || 0) + (pneu.custoReformasTotal || 0) : null;
    const custoPorKm = (custoTotal !== null && kmTotal > 0) ? custoTotal / kmTotal : null;
    return { kmTotal, custoTotal, custoPorKm };
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
// VISÃO DE VEÍCULOS
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
                
                <!-- BARRA DRAG & DROP -->
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
                    <h2 class="text-lg font-black font-heading text-slate-800">FROTA DE VEÍCULOS</h2>
                    <button onclick="showAddVeiculoModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition">
                        + Novo Veículo
                    </button>
                </div>

                ${veiculosFiltrados.length === 0 ? `
                    <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
                        NENHUM VEÍCULO CADASTRADO
                    </div>
                ` : veiculosFiltrados.map(veiculo => {
                    const pneusDoVeiculo = state.pneus.filter(p => p.veiculoId === veiculo.id);
                    const tipo = veiculo.tipo || 'carreta';
                    const qtdEixos = veiculo.eixos || 3;

                    return `
                        <div class="bg-[#12161f] border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative">
                            <div class="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                                <div class="flex items-center gap-3">
                                    <span class="bg-blue-600 text-white font-black px-3 py-1 rounded-lg text-sm tracking-wider uppercase">
                                        ${escapeHtml(veiculo.placa)}
                                    </span>
                                    <div>
                                        <span class="text-xs font-bold uppercase text-slate-400">[${tipo.toUpperCase()}]</span>
                                        <span class="text-xs text-slate-400 ml-2">${escapeHtml(veiculo.modelo || '')} • ${veiculo.kmAtual || 0} KM</span>
                                    </div>
                                </div>
                                <button onclick="deletarVeiculo('${veiculo.id}', '${veiculo.placa}')" class="text-slate-500 hover:text-red-400 p-2">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>

                            <div class="relative max-w-lg mx-auto py-4">
                                <div class="flex justify-center mb-6">
                                    <div class="bg-white text-slate-900 border-2 border-blue-600 rounded-md px-4 py-0.5 text-xs font-black tracking-widest shadow flex items-center gap-1">
                                        <span class="text-[9px] bg-blue-700 text-white px-1 rounded-sm">BR</span>
                                        ${escapeHtml(veiculo.placa)}
                                    </div>
                                </div>

                                <div class="absolute left-1/2 top-14 bottom-14 -translate-x-1/2 w-10 border-x-2 border-slate-700 bg-slate-900/60 z-0"></div>

                                <div class="space-y-12 relative z-10">
                                    ${Array.from({ length: qtdEixos }, (_, index) => index + 1).map(eixoNum => {
                                        const posicoes = getPosicoesEixo(tipo, eixoNum);
                                        const ehSimples = posicoes.length === 2;

                                        return `
                                            <div class="relative flex items-center justify-between px-2">
                                                <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-700 -z-10"></div>
                                                ${ehSimples ? `
                                                    ${renderSlotPneu(veiculo.id, posicoes[0].pos, pneusDoVeiculo)}
                                                    <div class="text-[10px] font-bold text-slate-500 bg-[#12161f] px-2 font-mono">EIXO ${eixoNum}</div>
                                                    ${renderSlotPneu(veiculo.id, posicoes[1].pos, pneusDoVeiculo)}
                                                ` : `
                                                    <div class="flex gap-1.5">
                                                        ${renderSlotPneu(veiculo.id, posicoes[0].pos, pneusDoVeiculo)}
                                                        ${renderSlotPneu(veiculo.id, posicoes[1].pos, pneusDoVeiculo)}
                                                    </div>
                                                    <div class="text-[10px] font-bold text-slate-500 bg-[#12161f] px-2 font-mono">EIXO ${eixoNum}</div>
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
                                    <div class="bg-white text-slate-900 border-2 border-blue-600 rounded-md px-4 py-0.5 text-xs font-black tracking-widest shadow flex items-center gap-1">
                                        <span class="text-[9px] bg-blue-700 text-white px-1 rounded-sm">BR</span>
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
                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs mb-4 focus:outline-none focus:border-blue-600">

                    <div id="visual-estoque-grid" class="grid grid-cols-2 gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                        ${pneusEstoque.length === 0 ? '<p class="col-span-2 text-center text-slate-400 text-xs py-8">Nenhum pneu em estoque.</p>' :
                        pneusEstoque.map(pneu => {
                            const noLimite = (pneu.qtdReformas || 0) >= LIMITE_REFORMAS_RECOMENDADO;
                            return `
                            <div draggable="true" ondragstart="handleDragStart(event, '${pneu.id}')"
                                 class="draggable-tire estoque-item ${noLimite ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center transition shadow-sm cursor-grab relative">
                                ${noLimite ? `<i class="fas fa-triangle-exclamation text-red-500 text-[10px] absolute top-1.5 right-1.5" title="Atingiu o limite recomendado de ${LIMITE_REFORMAS_RECOMENDADO} reformas"></i>` : ''}
                                <i class="fas fa-circle-notch text-2xl text-blue-600 mb-1"></i>
                                <span class="font-black text-xs text-slate-800 font-mono">${escapeHtml(pneu.fuego)}</span>
                                <span class="text-[10px] text-slate-500">${pneu.sulcoAtual ?? '-'} mm</span>
                            </div>
                        `;}).join('')}
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
             class="w-12 h-20 rounded-lg border-2 ${pneu ? ((pneu.sulcoAtual ?? 99) <= 3 ? 'border-red-500 bg-red-950/60' : 'border-blue-500 bg-blue-950/60') : 'border-dashed border-slate-700 bg-slate-800/40'} 
             flex flex-col items-center justify-center p-1 transition-all relative group cursor-pointer">
            ${pneu ? `
                <div draggable="true" ondragstart="handleDragStart(event, '${pneu.id}')" class="text-center w-full">
                    <span class="block font-black text-[11px] text-white leading-tight font-mono">${escapeHtml(pneu.fuego)}</span>
                    <span class="block text-[9px] ${(pneu.sulcoAtual ?? 99) <= 3 ? 'text-red-400 font-bold' : 'text-slate-300'}">${pneu.sulcoAtual ?? '-'}mm</span>
                </div>
                <div class="absolute -bottom-4 text-[8px] font-bold text-slate-400 font-mono">${pos}</div>
            ` : `
                <span class="text-[8px] font-bold text-slate-500 text-center uppercase leading-none font-mono">${pos}</span>
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
    e.currentTarget.classList.add('border-blue-400', 'scale-105');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('border-blue-400', 'scale-105');
}

function handleDropToSlot(e, veiculoId, posicao) {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'scale-105');
    const pneuId = e.dataTransfer.getData('text/plain');
    if (!pneuId) return;

    const pneu = state.pneus.find(p => p.id === pneuId);
    const veiculo = state.veiculos.find(v => v.id === veiculoId);
    if (!pneu || !veiculo) return;

    showMontarModal(pneu, veiculo, posicao);
}

function showMontarModal(pneu, veiculo, posicao) {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-1">Montar Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">Veículo <b class="text-blue-600">${escapeHtml(veiculo.placa)}</b> • Posição <b class="text-blue-600">${posicao}</b>. Informe o KM atual do veículo neste momento.</p>
            <form onsubmit="confirmarMontagem(event, '${pneu.id}', '${veiculo.id}', '${posicao}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL DO VEÍCULO</label>
                    <input type="number" id="montar-km" value="${veiculo.kmAtual || 0}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">CONFIRMAR MONTAGEM</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarMontagem(e, pneuId, veiculoId, posicao) {
    e.preventDefault();
    const km = parseInt(document.getElementById('montar-km').value);
    const pneu = state.pneus.find(p => p.id === pneuId);
    const veiculo = state.veiculos.find(v => v.id === veiculoId);
    if (!pneu || !veiculo) { closeModal(); return; }

    if (km < (veiculo.kmAtual || 0)) {
        showToast(`Atenção: KM informado (${km}) é menor que o KM atual do veículo (${veiculo.kmAtual || 0}). Verifique antes de confirmar.`, "error");
        return;
    }

    const updates = {};
    updates[`pneus/${pneuId}/status`] = 'Em Uso';
    updates[`pneus/${pneuId}/veiculoId`] = veiculoId;
    updates[`pneus/${pneuId}/posicao`] = posicao;
    updates[`pneus/${pneuId}/kmInstalacaoAtual`] = km;
    updates[`veiculos/${veiculoId}/kmAtual`] = km;

    const histRef = window.rtdb.ref('historico').push();
    updates[`historico/${histRef.key}`] = {
        pneuId: pneuId,
        fuego: pneu.fuego,
        tipo: 'Montagem',
        data: Date.now(),
        veiculoId: veiculoId,
        placa: veiculo.placa,
        posicao: posicao,
        kmVeiculo: km,
        sulco: pneu.sulcoAtual ?? null,
        usuario: getUsuarioAtual()
    };

    window.rtdb.ref().update(updates).then(() => {
        closeModal();
        showToast(`Pneu montado na posição ${posicao}!`, "success");
    });
}

function handleDropToZone(e, destinoStatus) {
    e.preventDefault();
    const pneuId = e.dataTransfer.getData('text/plain');
    const pneu = state.pneus.find(p => p.id === pneuId);
    if (pneu) showDesmontarModal(pneu, destinoStatus);
}

function showDesmontarModal(pneu, destino) {
    const veiculo = state.veiculos.find(v => v.id === pneu.veiculoId);
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-1">Mover Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">Destino selecionado: <b class="text-blue-600">${destino}</b>. Atualize o sulco e o KM do veículo neste momento.</p>
            <form onsubmit="confirmarMovimentacao(event, '${pneu.id}', '${destino}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO MEDIDO (MM)</label>
                    <input type="number" step="0.1" id="drag-sulco" value="${pneu.sulcoAtual || 10}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL DO VEÍCULO</label>
                    <input type="number" id="drag-km" value="${veiculo ? (veiculo.kmAtual || 0) : ''}" placeholder="${veiculo ? '' : 'Pneu já estava fora de veículo'}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" ${veiculo ? 'required' : ''}>
                </div>
                ${destino === 'Reforma' ? `
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">CUSTO DA REFORMA (R$)</label>
                    <input type="number" step="0.01" id="drag-custo-reforma" value="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800">
                </div>
                ` : ''}
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">CONFIRMAR</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarMovimentacao(e, pneuId, destino) {
    e.preventDefault();
    const sulco = parseFloat(document.getElementById('drag-sulco').value);
    const kmInput = document.getElementById('drag-km');
    const kmInformado = kmInput.value ? parseInt(kmInput.value) : null;
    const custoReformaInput = document.getElementById('drag-custo-reforma');
    const custoReforma = custoReformaInput ? (parseFloat(custoReformaInput.value) || 0) : 0;

    const pneu = state.pneus.find(p => p.id === pneuId);
    if (!pneu) { closeModal(); return; }

    const veiculo = state.veiculos.find(v => v.id === pneu.veiculoId);

    let cicloKm = 0;
    if (veiculo && kmInformado !== null && pneu.kmInstalacaoAtual != null) {
        cicloKm = kmInformado - pneu.kmInstalacaoAtual;
        if (cicloKm < 0) {
            showToast(`Atenção: KM informado é menor que o KM de instalação (${pneu.kmInstalacaoAtual}). Verifique antes de confirmar.`, "error");
            return;
        }
    }
    const kmRodadoTotalNovo = (pneu.kmRodadoTotal || 0) + cicloKm;
    const qtdReformasNova = destino === 'Reforma' ? (pneu.qtdReformas || 0) + 1 : (pneu.qtdReformas || 0);

    const updates = {};
    updates[`pneus/${pneuId}/sulcoAtual`] = sulco;
    updates[`pneus/${pneuId}/status`] = destino;
    updates[`pneus/${pneuId}/veiculoId`] = null;
    updates[`pneus/${pneuId}/posicao`] = null;
    updates[`pneus/${pneuId}/kmInstalacaoAtual`] = null;
    updates[`pneus/${pneuId}/kmRodadoTotal`] = kmRodadoTotalNovo;
    if (destino === 'Reforma') {
        updates[`pneus/${pneuId}/qtdReformas`] = qtdReformasNova;
    }
    if (custoReforma > 0) {
        updates[`pneus/${pneuId}/custoReformasTotal`] = (pneu.custoReformasTotal || 0) + custoReforma;
    }
    if (veiculo && kmInformado !== null) {
        updates[`veiculos/${veiculo.id}/kmAtual`] = kmInformado;
    }

    const histRef = window.rtdb.ref('historico').push();
    updates[`historico/${histRef.key}`] = {
        pneuId: pneuId,
        fuego: pneu.fuego,
        tipo: destino === 'Estoque' ? 'Desmontagem' : (destino === 'Reforma' ? 'Reforma' : 'Descarte'),
        data: Date.now(),
        veiculoId: pneu.veiculoId || null,
        placa: veiculo ? veiculo.placa : null,
        posicao: pneu.posicao || null,
        kmVeiculo: kmInformado,
        kmRodadoCiclo: cicloKm,
        sulco: sulco,
        custo: custoReforma > 0 ? custoReforma : null,
        qtdReformas: destino === 'Reforma' ? qtdReformasNova : null,
        usuario: getUsuarioAtual()
    };

    window.rtdb.ref().update(updates).then(() => {
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
// MODAL DE VEÍCULO / NOVA CARRETA
// ====================================================
// Alias: o botão global "Nova Carreta" no header (index.html) chama showAddCarretaModal(),
// que não existia antes e dependia apenas do hack de correspondência de texto em vincularEventosNavegacao().
function showAddCarretaModal() {
    showAddVeiculoModal();
}

function showAddVeiculoModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Cadastrar Veículo / Carreta</h3>
            <form onsubmit="salvarVeiculo(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO DE VEÍCULO</label>
                    <select id="veiculo-tipo" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800">
                        <option value="carreta">Carreta / Semirreboque (Eixos duplos)</option>
                        <option value="cavalo">Cavalo Trator (1º eixo simples / Tração dupla)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA</label>
                    <input type="text" id="veiculo-placa" placeholder="ABC1D23" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs uppercase" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="veiculo-modelo" placeholder="Ex: Scania R450 / Randon" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="veiculo-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                            <option value="2">2 Eixos</option>
                            <option value="3" selected>3 Eixos</option>
                            <option value="4">4 Eixos</option>
                            <option value="5">5 Eixos</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL DO VEÍCULO (opcional)</label>
                    <input type="number" id="veiculo-km" placeholder="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">SALVAR VEÍCULO</button>
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
    const kmAtual = parseInt(document.getElementById('veiculo-km').value) || 0;

    const jaExiste = state.veiculos.some(v => v.placa === placa);
    if (jaExiste) {
        showToast(`Já existe um veículo cadastrado com a placa ${placa}!`, "error");
        return;
    }

    window.rtdb.ref('veiculos').push({
        tipo: tipo,
        placa: placa,
        modelo: modelo,
        eixos: eixos,
        kmAtual: kmAtual
    }).then(() => {
        closeModal();
        showToast("Veículo cadastrado!", "success");
    });
}

function deletarVeiculo(id, placa) {
    if (confirm(`Confirma a exclusão do veículo ${placa}? Os pneus montados nele voltarão para o estoque.`)) {
        const veiculo = state.veiculos.find(v => v.id === id);
        const kmFinal = veiculo ? (veiculo.kmAtual || 0) : 0;

        // Devolve para o estoque todos os pneus que estavam montados neste veículo,
        // fechando o km rodado do ciclo com o último km conhecido do veículo,
        // evitando que fiquem "órfãos" (Em Uso apontando para um veiculoId inexistente)
        const pneusDoVeiculo = state.pneus.filter(p => p.veiculoId === id);
        const updates = {};
        pneusDoVeiculo.forEach(p => {
            const cicloKm = p.kmInstalacaoAtual != null ? Math.max(0, kmFinal - p.kmInstalacaoAtual) : 0;
            updates[`pneus/${p.id}/status`] = 'Estoque';
            updates[`pneus/${p.id}/veiculoId`] = null;
            updates[`pneus/${p.id}/posicao`] = null;
            updates[`pneus/${p.id}/kmInstalacaoAtual`] = null;
            updates[`pneus/${p.id}/kmRodadoTotal`] = (p.kmRodadoTotal || 0) + cicloKm;

            const histRef = window.rtdb.ref('historico').push();
            updates[`historico/${histRef.key}`] = {
                pneuId: p.id,
                fuego: p.fuego,
                tipo: 'Desmontagem (veículo excluído)',
                data: Date.now(),
                veiculoId: id,
                placa: placa,
                posicao: p.posicao || null,
                kmVeiculo: kmFinal,
                kmRodadoCiclo: cicloKm,
                sulco: p.sulcoAtual ?? null,
                custo: null,
                usuario: getUsuarioAtual()
            };
        });
        updates[`veiculos/${id}`] = null;

        window.rtdb.ref().update(updates)
            .then(() => showToast("Veículo removido! Pneus retornaram ao estoque.", "success"));
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
                <div class="flex gap-2">
                    <button onclick="showAddPneuHistoricoModal()" class="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <i class="fas fa-clock-rotate-left"></i> Pneu Existente (com Histórico)
                    </button>
                    <button onclick="showAddPneuModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold">
                        + Cadastrar Pneus Novos em Lote
                    </button>
                </div>
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
                            <th class="p-3.5">Km Rodado</th>
                            <th class="p-3.5">Custo/Km</th>
                            <th class="p-3.5">Reformas</th>
                            <th class="p-3.5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${pneusFiltrados.length === 0 ? `
                            <tr><td colspan="9" class="p-8 text-center text-slate-400">Nenhum pneu encontrado.</td></tr>
                        ` : pneusFiltrados.map(pneu => {
                            const veiculo = state.veiculos.find(v => v.id === pneu.veiculoId);
                            const { kmTotal, custoPorKm } = calcularMetricasPneu(pneu);
                            const qtdReformas = pneu.qtdReformas || 0;
                            const noLimite = qtdReformas >= LIMITE_REFORMAS_RECOMENDADO;
                            return `
                                <tr>
                                    <td class="p-3.5 font-black text-slate-800 font-mono">${escapeHtml(pneu.fuego)}</td>
                                    <td class="p-3.5 text-slate-600">${escapeHtml(pneu.marca || '-')} (${escapeHtml(pneu.medida || '-')})</td>
                                    <td class="p-3.5 font-semibold ${(pneu.sulcoAtual ?? 99) <= 3 ? 'text-red-600' : 'text-slate-800'}">${pneu.sulcoAtual ?? '-'} mm</td>
                                    <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">${pneu.status}</span></td>
                                    <td class="p-3.5 text-slate-600">${veiculo ? `${escapeHtml(veiculo.placa)} (${pneu.posicao})` : 'Estoque'}</td>
                                    <td class="p-3.5 text-slate-600">${kmTotal.toLocaleString('pt-BR')} km</td>
                                    <td class="p-3.5 text-slate-600">${custoPorKm !== null ? 'R$ ' + custoPorKm.toFixed(3) : '-'}</td>
                                    <td class="p-3.5">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${noLimite ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}" ${noLimite ? `title="Atingiu o limite recomendado de ${LIMITE_REFORMAS_RECOMENDADO} reformas"` : ''}>
                                            ${qtdReformas}${noLimite ? ' <i class="fas fa-triangle-exclamation"></i>' : ''}
                                        </span>
                                    </td>
                                    <td class="p-3.5 text-right">
                                        <button onclick="showHistoricoPneu('${pneu.id}')" title="Ver histórico" class="text-slate-400 hover:text-blue-600 mr-2"><i class="fas fa-clock-rotate-left"></i></button>
                                        <button onclick="deletarPneu('${pneu.id}')" title="Excluir" class="text-slate-400 hover:text-red-500"><i class="fas fa-trash-can"></i></button>
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

function showHistoricoPneu(pneuId) {
    const pneu = state.pneus.find(p => p.id === pneuId);
    if (!pneu) return;

    const eventos = state.historico
        .filter(h => h.pneuId === pneuId)
        .sort((a, b) => b.data - a.data);

    const { kmTotal, custoTotal, custoPorKm } = calcularMetricasPneu(pneu);

    openModal(`
        <div class="p-6 max-h-[80vh] overflow-y-auto">
            <h3 class="text-lg font-bold text-slate-800 mb-1">Histórico do Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">${escapeHtml(pneu.marca || '-')} • ${escapeHtml(pneu.medida || '-')}</p>

            <div class="grid grid-cols-4 gap-2 mb-4">
                <div class="bg-slate-50 rounded-xl p-3 text-center">
                    <div class="text-[10px] text-slate-400 font-bold uppercase">Km Rodado</div>
                    <div class="text-sm font-black text-slate-800">${kmTotal.toLocaleString('pt-BR')}</div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 text-center">
                    <div class="text-[10px] text-slate-400 font-bold uppercase">Custo Total</div>
                    <div class="text-sm font-black text-slate-800">R$ ${custoTotal.toFixed(2)}</div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 text-center">
                    <div class="text-[10px] text-slate-400 font-bold uppercase">Custo/Km</div>
                    <div class="text-sm font-black text-slate-800">${custoPorKm !== null ? 'R$ ' + custoPorKm.toFixed(3) : '-'}</div>
                </div>
                <div class="rounded-xl p-3 text-center ${(pneu.qtdReformas || 0) >= LIMITE_REFORMAS_RECOMENDADO ? 'bg-red-50' : 'bg-slate-50'}">
                    <div class="text-[10px] text-slate-400 font-bold uppercase">Reformas</div>
                    <div class="text-sm font-black ${(pneu.qtdReformas || 0) >= LIMITE_REFORMAS_RECOMENDADO ? 'text-red-600' : 'text-slate-800'}">${pneu.qtdReformas || 0}</div>
                </div>
            </div>
            ${(pneu.qtdReformas || 0) >= LIMITE_REFORMAS_RECOMENDADO ? `
                <div class="bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-xl p-3 mb-4 flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation"></i>
                    Este pneu já atingiu o limite recomendado de ${LIMITE_REFORMAS_RECOMENDADO} reformas. Avalie se ainda é seguro utilizar.
                </div>
            ` : ''}

            <div class="space-y-2">
                ${eventos.length === 0 ? `
                    <p class="text-center text-slate-400 text-xs py-6">Nenhum evento registrado ainda.</p>
                ` : eventos.map(ev => `
                    <div class="border border-slate-200 rounded-xl p-3 text-xs">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-slate-800">${escapeHtml(ev.tipo)}</span>
                            <span class="text-slate-400">${new Date(ev.data).toLocaleString('pt-BR')}</span>
                        </div>
                        ${ev.usuario ? `<div class="text-[10px] text-blue-600 font-bold mb-1"><i class="fas fa-user"></i> ${escapeHtml(ev.usuario)}</div>` : ''}
                        <div class="text-slate-500 flex flex-wrap gap-x-4">
                            ${ev.placa ? `<span>Veículo: ${escapeHtml(ev.placa)}</span>` : ''}
                            ${ev.posicao ? `<span>Posição: ${ev.posicao}</span>` : ''}
                            ${ev.kmVeiculo != null ? `<span>Km: ${ev.kmVeiculo.toLocaleString('pt-BR')}</span>` : ''}
                            ${ev.kmRodadoCiclo ? `<span>Rodou neste ciclo: ${ev.kmRodadoCiclo.toLocaleString('pt-BR')} km</span>` : ''}
                            ${ev.sulco != null ? `<span>Sulco: ${ev.sulco} mm</span>` : ''}
                            ${ev.custo ? `<span>Custo: R$ ${ev.custo.toFixed(2)}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="flex justify-end mt-6">
                <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">FECHAR</button>
            </div>
        </div>
    `);
}

// ====================================================
// DASHBOARD DE ANÁLISE (VIDA ÚTIL / CUSTO / MARCAS)
// ====================================================
function renderAnaliseView(container) {
    const porMarca = {};
    state.pneus.forEach(pneu => {
        const marca = pneu.marca || 'Sem marca';
        const { kmTotal, custoTotal } = calcularMetricasPneu(pneu);
        if (!porMarca[marca]) {
            porMarca[marca] = {
                marca, qtdPneus: 0, qtdSemCusto: 0,
                custoTotalConhecido: 0, kmTotalComCustoConhecido: 0,
                kmTotalGeral: 0, qtdDescartados: 0, kmTotalDescartados: 0
            };
        }
        porMarca[marca].qtdPneus++;
        porMarca[marca].kmTotalGeral += kmTotal;
        if (custoTotal !== null) {
            porMarca[marca].custoTotalConhecido += custoTotal;
            porMarca[marca].kmTotalComCustoConhecido += kmTotal;
        } else {
            porMarca[marca].qtdSemCusto++;
        }
        if (pneu.status === 'Descartado') {
            porMarca[marca].qtdDescartados++;
            porMarca[marca].kmTotalDescartados += kmTotal;
        }
    });

    const ranking = Object.values(porMarca).map(m => ({
        ...m,
        custoPorKm: m.kmTotalComCustoConhecido > 0 ? m.custoTotalConhecido / m.kmTotalComCustoConhecido : null,
        kmMedioAteDescarte: m.qtdDescartados > 0 ? m.kmTotalDescartados / m.qtdDescartados : null
    })).sort((a, b) => {
        if (a.custoPorKm === null) return 1;
        if (b.custoPorKm === null) return -1;
        return a.custoPorKm - b.custoPorKm;
    });

    let totalInvestido = 0, totalKmRodado = 0, totalKmComCustoConhecido = 0, totalSemCusto = 0;
    state.pneus.forEach(p => {
        const { kmTotal, custoTotal } = calcularMetricasPneu(p);
        totalKmRodado += kmTotal;
        if (custoTotal !== null) {
            totalInvestido += custoTotal;
            totalKmComCustoConhecido += kmTotal;
        } else {
            totalSemCusto++;
        }
    });
    const custoMedioGeral = totalKmComCustoConhecido > 0 ? totalInvestido / totalKmComCustoConhecido : null;

    container.innerHTML = `
        <div class="space-y-6">
            ${totalSemCusto > 0 ? `
                <div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl p-3 flex items-center gap-2">
                    <i class="fas fa-circle-info"></i>
                    ${totalSemCusto} pneu(s) sem valor de compra informado — eles contam para o km rodado, mas ficam de fora dos cálculos de custo/km até você informar o valor.
                </div>
            ` : ''}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Investido (custo conhecido)</div>
                    <div class="text-xl font-black text-slate-800">R$ ${totalInvestido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Km Total Rodado (frota de pneus)</div>
                    <div class="text-xl font-black text-slate-800">${totalKmRodado.toLocaleString('pt-BR')} km</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Custo Médio Geral / Km</div>
                    <div class="text-xl font-black text-slate-800">${custoMedioGeral !== null ? 'R$ ' + custoMedioGeral.toFixed(3) : '-'}</div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-5 border-b border-slate-100">
                    <h3 class="font-bold text-slate-800 text-sm">RANKING DE MARCAS (menor custo/km primeiro)</h3>
                    <p class="text-[10px] text-slate-400 mt-1">Custo/km considera apenas pneus com valor de compra conhecido, dividido pelo km rodado por eles.</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                            <tr>
                                <th class="p-3.5">Marca</th>
                                <th class="p-3.5">Qtd Pneus</th>
                                <th class="p-3.5">Km Total Rodado</th>
                                <th class="p-3.5">Investido (conhecido)</th>
                                <th class="p-3.5">Custo/Km</th>
                                <th class="p-3.5">Km Médio até Descarte</th>
                                <th class="p-3.5">Sem Custo</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${ranking.length === 0 ? `
                                <tr><td colspan="7" class="p-8 text-center text-slate-400">Nenhum pneu cadastrado ainda.</td></tr>
                            ` : ranking.map((m, i) => `
                                <tr class="${i === 0 && m.custoPorKm !== null ? 'bg-emerald-50' : ''}">
                                    <td class="p-3.5 font-black text-slate-800">${escapeHtml(m.marca)} ${i === 0 && m.custoPorKm !== null ? '<i class="fas fa-trophy text-amber-500 ml-1" title="Melhor custo-benefício"></i>' : ''}</td>
                                    <td class="p-3.5 text-slate-600">${m.qtdPneus}</td>
                                    <td class="p-3.5 text-slate-600">${m.kmTotalGeral.toLocaleString('pt-BR')} km</td>
                                    <td class="p-3.5 text-slate-600">R$ ${m.custoTotalConhecido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                    <td class="p-3.5 font-semibold text-slate-800">${m.custoPorKm !== null ? 'R$ ' + m.custoPorKm.toFixed(3) : '-'}</td>
                                    <td class="p-3.5 text-slate-600">${m.kmMedioAteDescarte !== null ? Math.round(m.kmMedioAteDescarte).toLocaleString('pt-BR') + ' km' : '- (nenhum descartado ainda)'}</td>
                                    <td class="p-3.5 text-slate-500">${m.qtdSemCusto > 0 ? m.qtdSemCusto : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ====================================================
// CADASTRO DE PNEU EXISTENTE (JÁ RODADO / JÁ RECAPADO)
// ====================================================
function showAddPneuHistoricoModal() {
    const veiculosOptions = state.veiculos.map(v => `<option value="${v.id}">${escapeHtml(v.placa)} (${escapeHtml(v.modelo || '')})</option>`).join('');

    openModal(`
        <div class="p-6 max-h-[85vh] overflow-y-auto">
            <h3 class="text-lg font-bold text-slate-800 mb-1">Cadastrar Pneu Existente</h3>
            <p class="text-xs text-slate-500 mb-4">Para pneus que já estão em uso há tempo, já rodaram km ou já foram recapados. Informe o que ele já acumulou até agora — o sistema vai continuar contando a partir daí.</p>
            <form onsubmit="salvarPneuHistorico(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO</label>
                    <input type="text" id="ph-fuego" placeholder="Ex: 85" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="ph-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="ph-medida" placeholder="Ex: 295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO ATUAL (MM)</label>
                    <input type="number" step="0.1" id="ph-sulco" placeholder="Ex: 8.0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                </div>

                <div class="border-t border-slate-100 pt-3">
                    <p class="text-[11px] font-bold text-slate-500 uppercase mb-2">Histórico anterior (o que ele já acumulou)</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">KM JÁ RODADO ATÉ HOJE</label>
                            <input type="number" id="ph-km-anterior" placeholder="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                            <p class="text-[10px] text-slate-400 mt-1">Se não souber precisamente, deixe uma estimativa. Pode zerar se não souber.</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE REFORMAS JÁ FEITAS</label>
                            <input type="number" id="ph-qtd-reformas" placeholder="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3">
                    <p class="text-[11px] font-bold text-slate-500 uppercase mb-2">Financeiro (opcional, se souber)</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">VALOR PAGO NA COMPRA (R$)</label>
                            <input type="number" step="0.01" id="ph-valor" placeholder="Deixe em branco se não souber" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">GASTO TOTAL COM REFORMAS (R$)</label>
                            <input type="number" step="0.01" id="ph-custo-reformas" placeholder="Deixe em branco se não souber" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-600 mb-1">SITUAÇÃO ATUAL DO PNEU</label>
                    <select id="ph-status" onchange="document.getElementById('ph-em-uso-bloco').classList.toggle('hidden', this.value !== 'Em Uso')" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold">
                        <option value="Estoque">Em estoque (sobressalente)</option>
                        <option value="Reforma">Em reforma agora</option>
                        <option value="Em Uso">Já montado em um veículo</option>
                    </select>
                </div>

                <div id="ph-em-uso-bloco" class="hidden space-y-3 bg-slate-50 rounded-xl p-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">VEÍCULO</label>
                        <select id="ph-veiculo" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs">
                            <option value="">${state.veiculos.length === 0 ? 'Nenhum veículo cadastrado ainda' : 'Selecione...'}</option>
                            ${veiculosOptions}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">POSIÇÃO (Ex: E1R1)</label>
                            <input type="text" id="ph-posicao" placeholder="Ex: E1R1" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs uppercase">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL DO VEÍCULO</label>
                            <input type="number" id="ph-km-veiculo" placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">SALVAR PNEU</button>
                </div>
            </form>
        </div>
    `);
}

function salvarPneuHistorico(e) {
    e.preventDefault();
    const fuego = document.getElementById('ph-fuego').value.trim();
    const marca = document.getElementById('ph-marca').value.trim();
    const medida = document.getElementById('ph-medida').value.trim();
    const sulco = parseFloat(document.getElementById('ph-sulco').value);
    const kmAnterior = parseInt(document.getElementById('ph-km-anterior').value) || 0;
    const qtdReformas = parseInt(document.getElementById('ph-qtd-reformas').value) || 0;
    const valorPagoRaw = document.getElementById('ph-valor').value;
    const custoReformasRaw = document.getElementById('ph-custo-reformas').value;
    const valorPago = valorPagoRaw === '' ? null : parseFloat(valorPagoRaw);
    const custoReformas = custoReformasRaw === '' ? 0 : parseFloat(custoReformasRaw);
    const status = document.getElementById('ph-status').value;

    if (state.pneus.some(p => p.fuego === fuego)) {
        showToast(`Já existe um pneu cadastrado com o número de fogo ${fuego}!`, "error");
        return;
    }

    let veiculoId = null, posicao = null, kmVeiculoAtual = null, veiculo = null;
    if (status === 'Em Uso') {
        veiculoId = document.getElementById('ph-veiculo').value;
        posicao = document.getElementById('ph-posicao').value.trim().toUpperCase();
        kmVeiculoAtual = parseInt(document.getElementById('ph-km-veiculo').value) || 0;
        veiculo = state.veiculos.find(v => v.id === veiculoId);

        if (!veiculoId || !veiculo) {
            showToast("Selecione o veículo em que este pneu está montado.", "error");
            return;
        }
        if (!posicao) {
            showToast("Informe a posição do pneu no veículo (ex: E1R1).", "error");
            return;
        }
        const ocupado = state.pneus.some(p => p.veiculoId === veiculoId && p.posicao === posicao);
        if (ocupado) {
            showToast(`A posição ${posicao} no veículo ${veiculo.placa} já está ocupada por outro pneu.`, "error");
            return;
        }
    }

    const newRef = window.rtdb.ref('pneus').push();
    const updates = {};
    updates[`pneus/${newRef.key}`] = {
        fuego: fuego,
        marca: marca,
        medida: medida,
        sulcoAtual: sulco,
        sulcoInicial: sulco, // desconhecido para pneus retroativos; usamos o sulco atual como referência
        status: status,
        veiculoId: veiculoId,
        posicao: posicao,
        valorPago: valorPago,
        dataCompra: null,
        kmInstalacaoAtual: status === 'Em Uso' ? kmVeiculoAtual : null,
        kmRodadoTotal: kmAnterior,
        custoReformasTotal: custoReformas,
        qtdReformas: qtdReformas
    };

    if (status === 'Em Uso') {
        updates[`veiculos/${veiculoId}/kmAtual`] = Math.max(kmVeiculoAtual, veiculo.kmAtual || 0);
    }

    const histRef = window.rtdb.ref('historico').push();
    updates[`historico/${histRef.key}`] = {
        pneuId: newRef.key,
        fuego: fuego,
        tipo: 'Cadastro Retroativo',
        data: Date.now(),
        veiculoId: veiculoId,
        placa: veiculo ? veiculo.placa : null,
        posicao: posicao,
        kmVeiculo: status === 'Em Uso' ? kmVeiculoAtual : null,
        kmRodadoCiclo: kmAnterior > 0 ? kmAnterior : null,
        sulco: sulco,
        qtdReformas: qtdReformas > 0 ? qtdReformas : null,
        usuario: getUsuarioAtual()
    };

    window.rtdb.ref().update(updates).then(() => {
        closeModal();
        showToast(`Pneu ${fuego} cadastrado com histórico (${kmAnterior.toLocaleString('pt-BR')} km e ${qtdReformas} reforma(s) já registrados)!`, "success");
    });
}

function showAddPneuModal() {
    const hoje = new Date().toISOString().split('T')[0];
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Cadastrar Pneus em Lote</h3>
            <form onsubmit="salvarPneusEmLote(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">NÚMEROS DE FOGO (Separados por vírgula ou linha)</label>
                    <textarea id="pneu-fuegos" rows="3" placeholder="Ex: 85, 257, 323, 325" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" required></textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" placeholder="Ex: 295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">SULCO ATUAL (MEDIDO AGORA, EM MM)</label>
                    <input type="number" step="0.1" id="pneu-sulco" value="15.0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="pneu-usado" onchange="toggleCampoUsado()" class="w-4 h-4">
                        <span class="text-xs font-bold text-amber-800">Este(s) pneu(s) já é(são) usado(s) / já foi(ram) recapado(s) antes (não é novo de fábrica)</span>
                    </label>
                    <div id="campo-recapagens" class="hidden mt-3">
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE RECAPAGENS QUE ELE(S) JÁ SOFREU(RAM)</label>
                        <input type="number" step="1" min="0" id="pneu-recapagens-existentes" value="0" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs">
                        <p class="text-[10px] text-amber-700 mt-1">O km rodado e o histórico de reformas anteriores a hoje não existem no sistema — a contagem de km e custo/km começa a partir de agora.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">VALOR PAGO POR UNIDADE (R$)</label>
                        <input type="number" step="0.01" id="pneu-valor" placeholder="Deixe em branco se não souber" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                        <p class="text-[10px] text-slate-400 mt-1">Deixe vazio para compras antigas sem valor conhecido — não entrará como custo zero.</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">DATA DA COMPRA (OU DE HOJE, SE NÃO SOUBER)</label>
                        <input type="date" id="pneu-data-compra" value="${hoje}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">SALVAR</button>
                </div>
            </form>
        </div>
    `);
}

// Mostra/esconde o campo de nº de recapagens conforme o checkbox "pneu usado"
function toggleCampoUsado() {
    const campo = document.getElementById('campo-recapagens');
    const checkbox = document.getElementById('pneu-usado');
    if (campo && checkbox) {
        campo.classList.toggle('hidden', !checkbox.checked);
    }
}

function salvarPneusEmLote(e) {
    e.preventDefault();
    const fuegosRaw = document.getElementById('pneu-fuegos').value;
    const marca = document.getElementById('pneu-marca').value;
    const medida = document.getElementById('pneu-medida').value;
    const sulco = parseFloat(document.getElementById('pneu-sulco').value);
    const valorPagoRaw = document.getElementById('pneu-valor').value;
    const valorPago = valorPagoRaw === '' ? null : parseFloat(valorPagoRaw);
    const dataCompra = document.getElementById('pneu-data-compra').value;
    const usado = document.getElementById('pneu-usado').checked;
    const recapagensExistentes = usado ? (parseInt(document.getElementById('pneu-recapagens-existentes').value) || 0) : 0;

    const fuegosDigitados = fuegosRaw.split(/[\n,]+/).map(f => f.trim()).filter(f => f.length > 0);
    const fuegosExistentes = new Set(state.pneus.map(p => p.fuego));

    const fuegos = fuegosDigitados.filter(f => !fuegosExistentes.has(f));
    const duplicados = fuegosDigitados.filter(f => fuegosExistentes.has(f));

    if (fuegos.length === 0) {
        showToast(`Todos os números de fogo informados já existem: ${duplicados.join(', ')}`, "error");
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
            // Só grava sulco "inicial" (de pneu novo) quando realmente for novo de fábrica.
            // Para pneu usado, não sabemos o sulco original de fábrica.
            sulcoInicial: usado ? null : sulco,
            status: 'Estoque',
            veiculoId: null,
            posicao: null,
            valorPago: valorPago,
            dataCompra: dataCompra,
            kmInstalacaoAtual: null,
            kmRodadoTotal: 0,
            custoReformasTotal: 0,
            qtdReformas: recapagensExistentes,
            origem: usado ? 'usado' : 'novo'
        };
        const histRef = window.rtdb.ref('historico').push();
        updates[`historico/${histRef.key}`] = {
            pneuId: newRef.key,
            fuego: fuego,
            tipo: usado ? 'Cadastro (pneu usado)' : 'Cadastro',
            data: Date.now(),
            veiculoId: null,
            placa: null,
            posicao: null,
            kmVeiculo: null,
            sulco: sulco,
            qtdReformas: usado && recapagensExistentes > 0 ? recapagensExistentes : null,
            usuario: getUsuarioAtual()
        };
    });

    window.rtdb.ref().update(updates).then(() => {
        closeModal();
        let msg = `${fuegos.length} pneu(s) cadastrado(s)!`;
        if (duplicados.length > 0) msg += ` (${duplicados.length} ignorado(s) por já existir: ${duplicados.join(', ')})`;
        showToast(msg, "success");
    });
}

function deletarPneu(id) {
    if (confirm(`Confirma excluir este pneu?`)) {
        window.rtdb.ref(`pneus/${id}`).remove()
            .then(() => showToast("Pneu removido!", "success"));
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
