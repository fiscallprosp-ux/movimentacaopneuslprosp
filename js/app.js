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

/** Rótulo visual do tipo de banda (Liso / Borrachudo / Misto) */
function labelTipoBanda(tipo) {
    if (!tipo) return '—';
    return String(tipo);
}

function badgeTipoBanda(tipo) {
    const t = (tipo || '').toLowerCase();
    let cls = 'bg-slate-100 text-slate-600';
    if (t === 'liso') cls = 'bg-sky-100 text-sky-700';
    else if (t === 'borrachudo') cls = 'bg-emerald-100 text-emerald-700';
    else if (t === 'misto') cls = 'bg-violet-100 text-violet-700';
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}">${tipo ? escapeHtml(tipo) : '—'}</span>`;
}



const state = {
    user: null,
    veiculos: [],
    pneus: [],
    historico: [],
    solicitacoes: [], // NOVA ADIÇÃO PARA O PÁTIO
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

    // NOVA ADIÇÃO: Ouve as solicitações vindas do patio.html
    window.rtdb.ref('solicitacoes').on('value', snapshot => {
        const data = snapshot.val() || {};
        state.solicitacoes = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        updateQuickStats();
        if (state.currentTab === 'solicitacoes') renderApp();
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
                    <img src="logo.jpg" alt="L-Prosp" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.parentNode.innerHTML='<i class=&quot;fas fa-truck text-4xl text-blue-500&quot;></i>';">
                </div>
                <h2 class="text-2xl font-black tracking-tight font-heading">L-Prosp Logística</h2>
                <p class="text-xs text-slate-400 mt-1">Gestão Inteligente de Pneus e Frota</p>
            </div>

            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">USUÁRIO</label>
                    <input type="text" id="login-username" placeholder="Digite seu usuário..." required 
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
    const badgeSolicitacoes = document.getElementById('badge-solicitacoes'); // INTEGRAÇÃO PÁTIO

    if (elUso) elUso.innerText = state.pneus.filter(p => p.status === 'Em Uso').length;
    if (elEstoque) elEstoque.innerText = state.pneus.filter(p => p.status === 'Estoque').length;
    if (elReforma) elReforma.innerText = state.pneus.filter(p => p.status === 'Reforma').length;

    if (badgeSolicitacoes) {
        const pendentes = state.solicitacoes.filter(s => s.status === 'pendente').length;
        badgeSolicitacoes.innerText = pendentes;
        badgeSolicitacoes.classList.toggle('hidden', pendentes === 0);
    }
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
    } else if (state.currentTab === 'analise') {
        renderAnaliseView(container);
    } else if (state.currentTab === 'solicitacoes') {
        renderSolicitacoesView(container); // NOVA ADIÇÃO PARA PÁTIO
    }
    vincularEventosNavegacao();
}

// ====================================================
// NOVA VISÃO: APROVAÇÕES DO PÁTIO
// ====================================================
function renderSolicitacoesView(container) {
    const pendentes = state.solicitacoes.filter(s => s.status === 'pendente').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const historico = state.solicitacoes.filter(s => s.status !== 'pendente').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);

    // Normaliza: ordens novas (com itens[]) ou formato antigo plano (1 pneu por solicitação)
    function getItens(s) {
        if (Array.isArray(s.itens) && s.itens.length > 0) return s.itens;
        return [{
            veiculoTipo: 'Cavalo',
            posicao: s.posicao,
            posicaoCodigo: s.posicao,
            tipoAcao: s.tipoAcao,
            fogoSaindo: s.pneuSaindoFogo,
            sulcoSaindo: s.sulcoSaindo,
            fogoEntrando: s.pneuEntrandoFogo,
            observacao: s.observacao
        }];
    }

    function labelAcao(tipo) {
        const map = { troca: 'Troca', medicao: 'Medição', reforma: 'Reforma', descarte: 'Descarte' };
        return map[tipo] || (tipo || '-');
    }

    container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 text-sm">REQUISIÇÕES DO PÁTIO PENDENTES (${pendentes.length})</h3>
                </div>
                <div class="divide-y divide-slate-100">
                    ${pendentes.length === 0 ? `
                        <div class="p-8 text-center text-slate-400 text-xs">Nenhuma requisição aguardando aprovação.</div>
                    ` : pendentes.map(s => {
                        const itens = getItens(s);
                        const placaPrincipal = s.placaCavalo || s.placa || '-';
                        const placaCarreta = s.placaCarreta || null;
                        return `
                        <div class="p-4 hover:bg-slate-50/50">
                            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                                <div>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-black text-blue-600 text-sm">${escapeHtml(placaPrincipal)}</span>
                                        ${placaCarreta ? `<span class="text-slate-400 text-[10px]">+ Carreta ${escapeHtml(placaCarreta)}</span>` : ''}
                                        <span class="text-[10px] text-slate-400">KM ${s.kmVeiculo ?? '-'}</span>
                                        <span class="text-[10px] text-slate-400">${s.data ? new Date(s.data).toLocaleString('pt-BR') : ''}</span>
                                    </div>
                                    <div class="text-[11px] text-slate-500 mt-0.5">
                                        ${s.solicitante ? `<i class="fas fa-user text-[9px]"></i> ${escapeHtml(s.solicitante)} · ` : ''}
                                        ${itens.length} item(ns)
                                    </div>
                                </div>
                                <div class="flex gap-1.5 shrink-0">
                                    <button onclick="aprovarSolicitacao('${s.id}')" title="Aprovar e processar estoque"
                                            class="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 font-bold text-xs">
                                        <i class="fas fa-check"></i> Aprovar
                                    </button>
                                    <button onclick="rejeitarSolicitacao('${s.id}')" title="Rejeitar pedido"
                                            class="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold text-xs">
                                        <i class="fas fa-xmark"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                ${itens.map(item => {
                                    const posLabel = item.posicaoCodigo || item.posicao || '-';
                                    return `
                                    <div class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span class="font-bold text-slate-700 uppercase tracking-wide">${labelAcao(item.tipoAcao)}</span>
                                        <span class="text-slate-500">${escapeHtml(item.veiculoTipo || '')} · <span class="font-mono text-blue-600">${escapeHtml(posLabel)}</span></span>
                                        ${item.fogoSaindo ? `<span class="text-rose-600 font-bold"><i class="fas fa-arrow-down text-[9px]"></i> Sai #${escapeHtml(item.fogoSaindo)}${item.sulcoSaindo != null ? ` (${item.sulcoSaindo}mm)` : ''}</span>` : ''}
                                        ${item.fogoEntrando ? `<span class="text-emerald-600 font-bold"><i class="fas fa-arrow-up text-[9px]"></i> Entra #${escapeHtml(item.fogoEntrando)}</span>` : ''}
                                        ${item.observacao ? `<span class="text-slate-400 truncate max-w-[180px]" title="${escapeHtml(item.observacao)}">${escapeHtml(item.observacao)}</span>` : ''}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            ${historico.length > 0 ? `
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden opacity-80">
                <div class="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-bold text-slate-800 text-sm">Últimas 10 processadas</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <tbody class="divide-y divide-slate-100">
                            ${historico.map(s => {
                                const placa = s.placaCavalo || s.placa || '-';
                                const placaCarreta = s.placaCarreta || '';
                                const qtd = Array.isArray(s.itens) ? s.itens.length : 1;
                                return `
                                <tr>
                                    <td class="p-3 text-slate-500">${s.data ? new Date(s.data).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td class="p-3 text-slate-700 font-bold">${escapeHtml(placa)}${placaCarreta ? ' <span class="text-slate-400 font-normal">+ ' + escapeHtml(placaCarreta) + '</span>' : ''}</td>
                                    <td class="p-3 text-slate-500">${qtd} item(ns)</td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'aprovada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${(s.status || '').toUpperCase()}</span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button onclick="reabrirSolicitacao('${s.id}')" title="Voltar para pendente e aprovar de novo"
                                                class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg hover:bg-amber-200 font-bold text-[10px]">
                                            <i class="fas fa-rotate-left"></i> Reabrir
                                        </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : ''}
        </div>
    `;
}

function rejeitarSolicitacao(id) {
    if (confirm('Tem certeza que deseja REJEITAR esta solicitação do pátio?')) {
        window.rtdb.ref(`solicitacoes/${id}/status`).set('rejeitada')
            .then(() => showToast('Solicitação rejeitada.', 'success'));
    }
}

/**
 * Volta solicitação aprovada/rejeitada para pendente.
 * NÃO desfaz automaticamente movimentos de estoque já feitos — cadastre o veículo
 * e ajuste pneus se necessário antes de aprovar de novo.
 */
function reabrirSolicitacao(id) {
    const s = state.solicitacoes.find(x => x.id === id);
    if (!s) return;
    if (s.status === 'pendente') {
        showToast('Esta solicitação já está pendente.', 'error');
        return;
    }
    const ok = confirm(
        'Reabrir esta solicitação para aprovação?\n\n' +
        'Atenção: o estoque NÃO volta automaticamente ao estado anterior.\n' +
        'Se a aprovação anterior já moveu/criou pneus, revise o estoque antes de aprovar de novo.\n\n' +
        'Cadastre a placa do cavalo/carreta se ainda não existir e então aprove novamente.'
    );
    if (!ok) return;

    window.rtdb.ref('solicitacoes/' + id).update({
        status: 'pendente',
        reabertaEm: Date.now(),
        reabertaPor: getUsuarioAtual(),
        aprovadoEm: null,
        aprovadoPor: null
    }).then(() => {
        showToast('Solicitação reaberta — aparece de novo em Pendentes.', 'success');
        state.currentTab = 'solicitacoes';
        renderApp();
    }).catch(e => showToast('Erro ao reabrir: ' + e.message, 'error'));
}

/**
 * Processa um único item de uma ordem do pátio (troca / medição / reforma / descarte).
 */
/**
 * Cria dados de pneu provisório (objeto completo).
 */
function criarDadosPneuProvisorio(fogo, status, extra) {
    extra = extra || {};
    return {
        fuego: String(fogo).trim(),
        marca: null,
        medida: null,
        modelo: null,
        sulcoAtual: extra.sulco != null ? extra.sulco : null,
        sulcoInicial: null,
        status: status,
        veiculoId: extra.veiculoId || null,
        posicao: extra.posicao || null,
        valorPago: null,
        dataCompra: null,
        kmInstalacaoAtual: extra.kmInstalacaoAtual != null ? extra.kmInstalacaoAtual : null,
        kmRodadoTotal: 0,
        custoReformasTotal: 0,
        qtdReformas: 0,
        tipoBanda: null,
        origem: 'provisorio',
        cadastroProvisorio: true,
        provisorioEm: Date.now(),
        provisorioOrigem: 'pátio'
    };
}

/**
 * Grava/atualiza campo de pneu sem conflito no multi-path update do Firebase.
 * Se o pneu foi criado neste mesmo update como objeto completo, mescla no objeto.
 * Caso contrário, usa path filho (pneus/id/campo).
 */
function setPneuUpdate(updates, pneuId, campoOuObjeto, valor) {
    if (!updates.__pneusFull) updates.__pneusFull = {};
    if (typeof campoOuObjeto === 'object' && campoOuObjeto !== null) {
        // objeto completo (criação)
        updates.__pneusFull[pneuId] = Object.assign({}, campoOuObjeto);
        updates['pneus/' + pneuId] = updates.__pneusFull[pneuId];
        return;
    }
    const campo = campoOuObjeto;
    if (updates.__pneusFull[pneuId]) {
        updates.__pneusFull[pneuId][campo] = valor;
        updates['pneus/' + pneuId] = updates.__pneusFull[pneuId];
    } else {
        updates['pneus/' + pneuId + '/' + campo] = valor;
    }
}

/**
 * Processa um único item de uma ordem do pátio.
 * Cria pneu provisório se o nº de fogo ainda não existir.
 */
function processarItemPatio(item, s, updates) {
    const placa = resolverPlacaSolicitacao(s, item);
    const veiculo = placa
        ? state.veiculos.find(v => String(v.placa || '').toUpperCase() === String(placa).toUpperCase())
        : null;
    const tipoVeiculo = (veiculo && veiculo.tipo) || (item.veiculoTipo === 'Carreta' ? 'carreta' : 'cavalo');
    const posicaoCodigo = mapearPosicaoPatio(item, tipoVeiculo);
    const kmVeiculo = Number(s.kmVeiculo) || 0;
    const usuario = s.solicitante || 'pátio';
    const acao = item.tipoAcao || 'troca';

    if (!updates.__provisoriosCriados) updates.__provisoriosCriados = [];
    if (!updates.__pneusFull) updates.__pneusFull = {};

    function acharPneu(fogo) {
        if (!fogo) return null;
        const f = String(fogo).trim();
        let p = state.pneus.find(x => String(x.fuego) === f);
        if (p) return p;
        const criado = updates.__provisoriosCriados.find(x => String(x.fuego) === f);
        if (criado) return { id: criado.id, ...criado.dados };
        return null;
    }

    // --- Pneu saindo ---
    if (item.fogoSaindo) {
        let pneuSaindo = acharPneu(item.fogoSaindo);

        if (!pneuSaindo) {
            let statusIni = 'Estoque';
            if (acao === 'descarte') statusIni = 'Descartado';
            else if (acao === 'reforma') statusIni = 'Reforma';
            else if (acao === 'medicao') statusIni = 'Em Uso';

            const dados = criarDadosPneuProvisorio(item.fogoSaindo, statusIni, {
                sulco: item.sulcoSaindo,
                veiculoId: (acao === 'medicao' && veiculo) ? veiculo.id : null,
                posicao: (acao === 'medicao') ? posicaoCodigo : null,
                kmInstalacaoAtual: (acao === 'medicao') ? kmVeiculo : null
            });
            const key = window.rtdb.ref('pneus').push().key;
            setPneuUpdate(updates, key, dados);
            updates.__provisoriosCriados.push({ id: key, fuego: String(item.fogoSaindo).trim(), dados: dados });
            pneuSaindo = { id: key, ...dados };

            const histCad = window.rtdb.ref('historico').push().key;
            updates['historico/' + histCad] = {
                pneuId: key,
                fuego: String(item.fogoSaindo).trim(),
                tipo: 'Cadastro Provisório (Pátio)',
                data: Date.now(),
                veiculoId: veiculo ? veiculo.id : null,
                placa: placa,
                posicao: posicaoCodigo,
                kmVeiculo: kmVeiculo,
                usuario: usuario,
                observacao: 'Criado automaticamente — complete marca, modelo, tipo de banda e valor quando possível.'
            };
        }

        if (acao === 'medicao') {
            if (item.sulcoSaindo != null) {
                setPneuUpdate(updates, pneuSaindo.id, 'sulcoAtual', item.sulcoSaindo);
            }
            if (veiculo && !pneuSaindo.veiculoId) {
                setPneuUpdate(updates, pneuSaindo.id, 'status', 'Em Uso');
                setPneuUpdate(updates, pneuSaindo.id, 'veiculoId', veiculo.id);
                setPneuUpdate(updates, pneuSaindo.id, 'posicao', posicaoCodigo);
                setPneuUpdate(updates, pneuSaindo.id, 'kmInstalacaoAtual', kmVeiculo);
            }
            const histRef = window.rtdb.ref('historico').push().key;
            updates['historico/' + histRef] = {
                pneuId: pneuSaindo.id,
                fuego: pneuSaindo.fuego,
                tipo: 'Medição de Sulco (Pátio)',
                data: Date.now(),
                veiculoId: veiculo ? veiculo.id : (pneuSaindo.veiculoId || null),
                placa: placa,
                posicao: posicaoCodigo,
                kmVeiculo: kmVeiculo,
                sulco: item.sulcoSaindo != null ? item.sulcoSaindo : null,
                usuario: usuario
            };
        } else {
            const cicloKm = pneuSaindo.kmInstalacaoAtual != null
                ? Math.max(0, kmVeiculo - pneuSaindo.kmInstalacaoAtual)
                : 0;

            let novoStatus = 'Estoque';
            if (acao === 'descarte') novoStatus = 'Descartado';
            else if (acao === 'reforma') novoStatus = 'Reforma';

            setPneuUpdate(updates, pneuSaindo.id, 'status', novoStatus);
            setPneuUpdate(updates, pneuSaindo.id, 'veiculoId', null);
            setPneuUpdate(updates, pneuSaindo.id, 'posicao', null);
            setPneuUpdate(updates, pneuSaindo.id, 'kmInstalacaoAtual', null);
            setPneuUpdate(updates, pneuSaindo.id, 'kmRodadoTotal', (pneuSaindo.kmRodadoTotal || 0) + cicloKm);
            if (item.sulcoSaindo != null) {
                setPneuUpdate(updates, pneuSaindo.id, 'sulcoAtual', item.sulcoSaindo);
            }

            const tipoHist = acao === 'descarte' ? 'Descarte (Pátio)'
                : acao === 'reforma' ? 'Envio para Reforma (Pátio)'
                : 'Desmontagem (Pátio)';

            const histRef = window.rtdb.ref('historico').push().key;
            updates['historico/' + histRef] = {
                pneuId: pneuSaindo.id,
                fuego: pneuSaindo.fuego,
                tipo: tipoHist,
                data: Date.now(),
                veiculoId: veiculo ? veiculo.id : null,
                placa: placa,
                posicao: posicaoCodigo,
                kmVeiculo: kmVeiculo,
                kmRodadoCiclo: cicloKm,
                sulco: item.sulcoSaindo != null ? item.sulcoSaindo : null,
                usuario: usuario
            };
        }
    }

    // --- Pneu entrando (somente troca) ---
    if (acao === 'troca' && item.fogoEntrando) {
        let pneuEntrando = acharPneu(item.fogoEntrando);

        if (!pneuEntrando) {
            const dados = criarDadosPneuProvisorio(item.fogoEntrando, veiculo ? 'Em Uso' : 'Estoque', {
                veiculoId: veiculo ? veiculo.id : null,
                posicao: veiculo ? posicaoCodigo : null,
                kmInstalacaoAtual: veiculo ? kmVeiculo : null
            });
            const key = window.rtdb.ref('pneus').push().key;
            setPneuUpdate(updates, key, dados);
            updates.__provisoriosCriados.push({ id: key, fuego: String(item.fogoEntrando).trim(), dados: dados });
            pneuEntrando = { id: key, ...dados };

            const histCad = window.rtdb.ref('historico').push().key;
            updates['historico/' + histCad] = {
                pneuId: key,
                fuego: String(item.fogoEntrando).trim(),
                tipo: 'Cadastro Provisório (Pátio)',
                data: Date.now(),
                veiculoId: veiculo ? veiculo.id : null,
                placa: placa,
                posicao: posicaoCodigo,
                kmVeiculo: kmVeiculo,
                usuario: usuario,
                observacao: 'Criado automaticamente — complete marca, modelo, tipo de banda e valor quando possível.'
            };
        }

        if (veiculo) {
            setPneuUpdate(updates, pneuEntrando.id, 'status', 'Em Uso');
            setPneuUpdate(updates, pneuEntrando.id, 'veiculoId', veiculo.id);
            setPneuUpdate(updates, pneuEntrando.id, 'posicao', posicaoCodigo);
            setPneuUpdate(updates, pneuEntrando.id, 'kmInstalacaoAtual', kmVeiculo);

            const histRef = window.rtdb.ref('historico').push().key;
            updates['historico/' + histRef] = {
                pneuId: pneuEntrando.id,
                fuego: pneuEntrando.fuego,
                tipo: 'Montagem (Pátio)',
                data: Date.now(),
                veiculoId: veiculo.id,
                placa: veiculo.placa,
                posicao: posicaoCodigo,
                kmVeiculo: kmVeiculo,
                sulco: pneuEntrando.sulcoAtual != null ? pneuEntrando.sulcoAtual : null,
                usuario: usuario
            };
        }
    }

    if (veiculo && kmVeiculo > 0) {
        updates['veiculos/' + veiculo.id + '/kmAtual'] = Math.max(kmVeiculo, veiculo.kmAtual || 0);
    }

    return true;
}

function sanitizarUpdatesFirebase(obj) {
    const out = {};
    Object.keys(obj).forEach(k => {
        if (k.startsWith('__')) return; // auxiliares
        const v = obj[k];
        if (v === undefined) return;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            const nested = {};
            let has = false;
            Object.keys(v).forEach(nk => {
                if (v[nk] !== undefined) {
                    nested[nk] = v[nk];
                    has = true;
                }
            });
            if (has) out[k] = nested;
        } else {
            out[k] = v;
        }
    });
    return out;
}

function aprovarSolicitacao(id) {
    try {
        const s = state.solicitacoes.find(x => x.id === id);
        if (!s) {
            showToast('Solicitação não encontrada.', 'error');
            return;
        }

        if (!confirm('Aprovar solicitação? Pneus ainda não cadastrados serão criados como provisórios para você completar depois.')) return;

        let itens = Array.isArray(s.itens) && s.itens.length > 0
            ? s.itens
            : [{
                veiculoTipo: 'Cavalo',
                posicao: s.posicao,
                posicaoCodigo: s.posicao,
                tipoAcao: s.tipoAcao || 'troca',
                fogoSaindo: s.pneuSaindoFogo,
                sulcoSaindo: s.sulcoSaindo,
                fogoEntrando: s.pneuEntrandoFogo,
                observacao: s.observacao
            }];

        const updates = {};
        updates['solicitacoes/' + id + '/status'] = 'aprovada';
        updates['solicitacoes/' + id + '/aprovadoEm'] = Date.now();
        updates['solicitacoes/' + id + '/aprovadoPor'] = getUsuarioAtual();

        itens.forEach(function (item) {
            try {
                processarItemPatio(item, s, updates);
            } catch (errItem) {
                console.error('Erro no item', item, errItem);
                showToast('Erro ao processar item: ' + (errItem && errItem.message ? errItem.message : errItem), 'error');
            }
        });

        const provisorios = updates.__provisoriosCriados || [];
        delete updates.__provisoriosCriados;
        delete updates.__pneusFull;

        const payload = sanitizarUpdatesFirebase(updates);
        const qtdPaths = Object.keys(payload).length;
        if (qtdPaths === 0) {
            showToast('Nada para atualizar.', 'error');
            return;
        }

        window.rtdb.ref().update(payload).then(function () {
            if (provisorios.length > 0) {
                const lista = provisorios.map(function (p) { return '#' + p.fuego; }).join(', ');
                showToast('Aprovado! Pneu(s) provisório(s): ' + lista + ' — complete os dados depois.', 'success');
            } else {
                showToast('Solicitação processada e estoque integrado!', 'success');
            }
        }).catch(function (e) {
            console.error('Firebase update error', e, payload);
            showToast('Erro Firebase: ' + (e.code || '') + ' ' + e.message, 'error');
        });
    } catch (err) {
        console.error('aprovarSolicitacao', err);
        showToast('Erro ao aprovar: ' + (err && err.message ? err.message : err), 'error');
    }
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

/**
 * Converte a posição textual do pátio (Eixo / Lado / Montagem)
 * para o código interno usado no painel (E1R1, E2R2, etc.).
 */
function mapearPosicaoPatio(item, tipoVeiculo) {
    // Código já padronizado (eixo ou estepe)
    if (item.posicaoCodigo && /^(E\d+R[1-4]|EST[12])$/i.test(item.posicaoCodigo)) {
        return item.posicaoCodigo.toUpperCase();
    }

    // Estepe vindo do pátio (Eixo = "Estepe 1" / "Estepe 2")
    const eixoStr = String(item.eixo || item.posicao || '');
    if (/estepe\s*1/i.test(eixoStr) || /^EST\s*1$/i.test(eixoStr.trim())) return 'EST1';
    if (/estepe\s*2/i.test(eixoStr) || /^EST\s*2$/i.test(eixoStr.trim())) return 'EST2';

    const eixoMatch = eixoStr.match(/(\d+)/);
    const numEixo = eixoMatch ? parseInt(eixoMatch[1], 10) : 1;

    const ladoRaw = String(item.lado || '').toLowerCase();
    const montagemRaw = String(item.montagem || '').toLowerCase();

    const isEsquerdo = ladoRaw.includes('esquer');
    const isInterno = montagemRaw.includes('interno');
    const isSimples = montagemRaw.includes('simples') || montagemRaw.includes('direcional');

    if ((tipoVeiculo === 'cavalo' || tipoVeiculo === 'Cavalo') && numEixo === 1) {
        return isEsquerdo ? 'E1R1' : 'E1R4';
    }

    if (isEsquerdo) {
        return isInterno && !isSimples ? `E${numEixo}R2` : `E${numEixo}R1`;
    } else {
        return isInterno && !isSimples ? `E${numEixo}R3` : `E${numEixo}R4`;
    }
}

/** Resolve a placa correta (cavalo ou carreta) a partir da ordem do pátio */
function resolverPlacaSolicitacao(s, item) {
    if (item && item.veiculoTipo === 'Carreta' && s.placaCarreta) {
        return s.placaCarreta;
    }
    return s.placaCavalo || s.placa || s.placaCarreta || null;
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
                                <div class="flex items-center gap-1">
                                    <button onclick="showEditVeiculoModal('${veiculo.id}')" title="Editar veículo" class="text-slate-500 hover:text-blue-400 p-2">
                                        <i class="fas fa-pen-to-square"></i>
                                    </button>
                                    <button onclick="deletarVeiculo('${veiculo.id}', '${veiculo.placa}')" title="Excluir veículo" class="text-slate-500 hover:text-red-400 p-2">
                                        <i class="fas fa-trash-can"></i>
                                    </button>
                                </div>
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

                                    ${(tipo === 'carreta' || tipo === 'Carreta') ? `
                                    <div class="mt-6 pt-4 border-t border-slate-700">
                                        <div class="text-center text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-3">
                                            <i class="fas fa-life-ring mr-1"></i> Estepes
                                        </div>
                                        <div class="flex items-center justify-center gap-6">
                                            ${renderSlotPneu(veiculo.id, 'EST1', pneusDoVeiculo)}
                                            ${renderSlotPneu(veiculo.id, 'EST2', pneusDoVeiculo)}
                                        </div>
                                        <div class="flex items-center justify-center gap-6 mt-1">
                                            <span class="text-[8px] font-bold text-slate-500 font-mono w-12 text-center">EST1</span>
                                            <span class="text-[8px] font-bold text-slate-500 font-mono w-12 text-center">EST2</span>
                                        </div>
                                    </div>
                                    ` : ''}
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
                                ${(pneu.cadastroProvisorio || pneu.origem === 'provisorio') ? '<span class="text-[9px] font-bold text-amber-600">PROVISÓRIO</span>' : ''}
                                <span class="text-[10px] text-slate-500">${pneu.tipoBanda || '—'}</span>
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
    const tipo = (pneu && pneu.tipoBanda) ? String(pneu.tipoBanda).toLowerCase() : '';
    let borderCls = 'border-dashed border-slate-700 bg-slate-800/40';
    if (pneu) {
        if (tipo === 'liso') borderCls = 'border-sky-400 bg-sky-950/50';
        else if (tipo === 'borrachudo') borderCls = 'border-emerald-400 bg-emerald-950/50';
        else if (tipo === 'misto') borderCls = 'border-violet-400 bg-violet-950/50';
        else borderCls = 'border-blue-500 bg-blue-950/60';
    }
    const tipoAbrev = !pneu ? '' : (tipo === 'liso' ? 'LIS' : tipo === 'borrachudo' ? 'BOR' : tipo === 'misto' ? 'MIS' : '—');
    return `
        <div ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSlot(event, '${veiculoId}', '${pos}')"
             class="w-12 h-20 rounded-lg border-2 ${borderCls} 
             flex flex-col items-center justify-center p-1 transition-all relative group cursor-pointer">
            ${pneu ? `
                <div draggable="true" ondragstart="handleDragStart(event, '${pneu.id}')" class="text-center w-full">
                    <span class="block font-black text-[11px] text-white leading-tight font-mono">${escapeHtml(pneu.fuego)}</span>
                    <span class="block text-[8px] text-slate-300 font-bold">${tipoAbrev}</span>
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
            <p class="text-xs text-slate-500 mb-4">Destino selecionado: <b class="text-blue-600">${destino}</b>. Confirme o tipo de banda e o KM do veículo neste momento.</p>
            <form onsubmit="confirmarMovimentacao(event, '${pneu.id}', '${destino}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO DE BANDA</label>
                    <select id="drag-tipo-banda" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-bold">
                        <option value="">—</option>
                        <option value="Liso" ${pneu.tipoBanda === 'Liso' ? 'selected' : ''}>Liso</option>
                        <option value="Borrachudo" ${pneu.tipoBanda === 'Borrachudo' ? 'selected' : ''}>Borrachudo</option>
                        <option value="Misto" ${pneu.tipoBanda === 'Misto' ? 'selected' : ''}>Misto</option>
                    </select>
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
    const tipoBandaSel = document.getElementById('drag-tipo-banda') ? document.getElementById('drag-tipo-banda').value : '';
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
    if (tipoBandaSel) updates[`pneus/${pneuId}/tipoBanda`] = tipoBandaSel;
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
        sulco: null,
        tipoBanda: tipoBandaSel || pneu.tipoBanda || null,
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

function showEditVeiculoModal(veiculoId) {
    const v = state.veiculos.find(x => x.id === veiculoId);
    if (!v) return;
    const tipo = v.tipo || 'carreta';
    const eixos = v.eixos || 3;
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Editar Veículo</h3>
            <form onsubmit="salvarEdicaoVeiculo(event, '${v.id}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO</label>
                    <select id="edit-veiculo-tipo" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold">
                        <option value="cavalo" ${tipo === 'cavalo' ? 'selected' : ''}>Cavalo</option>
                        <option value="carreta" ${tipo === 'carreta' ? 'selected' : ''}>Carreta</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA</label>
                    <input type="text" id="edit-veiculo-placa" value="${escapeHtml(v.placa || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono uppercase" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="edit-veiculo-modelo" value="${escapeHtml(v.modelo || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="edit-veiculo-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                            <option value="2" ${eixos === 2 ? 'selected' : ''}>2 Eixos</option>
                            <option value="3" ${eixos === 3 ? 'selected' : ''}>3 Eixos</option>
                            <option value="4" ${eixos === 4 ? 'selected' : ''}>4 Eixos</option>
                            <option value="5" ${eixos === 5 ? 'selected' : ''}>5 Eixos</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL</label>
                    <input type="number" id="edit-veiculo-km" value="${v.kmAtual || 0}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs">
                </div>
                <p class="text-[10px] text-slate-400">Os pneus já montados permanecem no veículo. Ao mudar de carreta → cavalo, os estepes (EST1/EST2) deixam de aparecer no desenho — se houver pneu nessas posições, mova-os antes se quiser.</p>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">SALVAR ALTERAÇÕES</button>
                </div>
            </form>
        </div>
    `);
}

function salvarEdicaoVeiculo(e, veiculoId) {
    e.preventDefault();
    const tipo = document.getElementById('edit-veiculo-tipo').value;
    const placa = document.getElementById('edit-veiculo-placa').value.toUpperCase().trim();
    const modelo = document.getElementById('edit-veiculo-modelo').value.trim();
    const eixos = parseInt(document.getElementById('edit-veiculo-eixos').value);
    const kmAtual = parseInt(document.getElementById('edit-veiculo-km').value) || 0;

    const outraPlaca = state.veiculos.some(v => v.id !== veiculoId && v.placa === placa);
    if (outraPlaca) {
        showToast(`Já existe outro veículo com a placa ${placa}!`, 'error');
        return;
    }

    window.rtdb.ref(`veiculos/${veiculoId}`).update({
        tipo: tipo,
        placa: placa,
        modelo: modelo,
        eixos: eixos,
        kmAtual: kmAtual
    }).then(() => {
        closeModal();
        showToast('Veículo atualizado!', 'success');
    }).catch(err => showToast('Erro ao salvar: ' + err.message, 'error'));
}

function deletarVeiculo(id, placa) {
    if (confirm(`Confirma a exclusão do veículo ${placa}? Os pneus montados nele voltarão para o estoque.`)) {
        const veiculo = state.veiculos.find(v => v.id === id);
        const kmFinal = veiculo ? (veiculo.kmAtual || 0) : 0;

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
                            <th class="p-3.5">Tipo</th>
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
                                    <td class="p-3.5 font-black text-slate-800 font-mono">
                                        ${escapeHtml(pneu.fuego)}
                                        ${(pneu.cadastroProvisorio || pneu.origem === 'provisorio') ? '<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700" title="Cadastro provisório — complete marca, medida e valor">PROVISÓRIO</span>' : ''}
                                    </td>
                                    <td class="p-3.5 text-slate-600">${escapeHtml(pneu.marca || '-')} ${pneu.modelo ? '· ' + escapeHtml(pneu.modelo) : (pneu.medida ? '(' + escapeHtml(pneu.medida) + ')' : '')}</td>
                                    <td class="p-3.5">${badgeTipoBanda(pneu.tipoBanda)}</td>
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
            <p class="text-xs text-slate-500 mb-2">${escapeHtml(pneu.marca || '-')} ${pneu.modelo ? '· ' + escapeHtml(pneu.modelo) : (pneu.medida ? '· ' + escapeHtml(pneu.medida) : '')}</p>
            ${(pneu.cadastroProvisorio || pneu.origem === 'provisorio') ? `
                <div class="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-xl p-3 mb-4 flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation"></i>
                    Cadastro provisório (criado pelo pátio). Complete marca, medida, tipo de banda (Liso/Borrachudo/Misto) e valor quando tiver os dados.
                </div>` : ''}

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
                            ${ev.tipoBanda ? `<span>Tipo: ${escapeHtml(ev.tipoBanda)}</span>` : (ev.sulco != null ? `<span>Sulco: ${ev.sulco} mm</span>` : '')}
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
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="ph-modelo" placeholder="Ex: X Multiway 3D" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO DE BANDA *</label>
                    <select id="ph-tipo-banda" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold" required>
                        <option value="">Selecione...</option>
                        <option value="Liso">Liso</option>
                        <option value="Borrachudo">Borrachudo</option>
                        <option value="Misto">Misto</option>
                    </select>
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
    const modelo = document.getElementById('ph-modelo').value.trim();
    const tipoBanda = document.getElementById('ph-tipo-banda').value;
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
        medida: null,
        modelo: modelo,
        sulcoAtual: null,
        sulcoInicial: null,
        tipoBanda: tipoBanda,
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
        sulco: null,
        tipoBanda: tipoBanda,
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
                        <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                        <input type="text" id="pneu-modelo" placeholder="Ex: X Multiway 3D" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">TIPO DE BANDA *</label>
                    <select id="pneu-tipo-banda" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold" required>
                        <option value="">Selecione...</option>
                        <option value="Liso">Liso</option>
                        <option value="Borrachudo">Borrachudo</option>
                        <option value="Misto">Misto</option>
                    </select>
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
    const modelo = document.getElementById('pneu-modelo').value.trim();
    const tipoBanda = document.getElementById('pneu-tipo-banda').value;
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
            medida: null,
            modelo: modelo,
            sulcoAtual: null,
            sulcoInicial: null,
            tipoBanda: tipoBanda,
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
            sulco: null,
            tipoBanda: tipoBanda,
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
