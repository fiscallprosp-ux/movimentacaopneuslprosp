let currentPage = 'dashboard';
let state = {
    pneus: [],
    carretas: [],
    searchTerm: ''
};

let renderTimeout = null;
const DEFAULT_DOMAIN = '@lprosp.com';

// ----------------------------------------------------
// SYSTEM TOASTS (Substitui o alert padrão)
// ----------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-lprosp-red text-white',
        info: 'bg-slate-800 text-white'
    };

    toast.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-xs font-bold font-heading flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ----------------------------------------------------
// GERENCIAMENTO DE AUTENTICAÇÃO
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    window.auth.onAuthStateChanged((user) => {
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');

        if (user) {
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            
            const username = user.email.split('@')[0].toUpperCase();
            document.getElementById('user-display-email').innerText = `L-PROSP • USUÁRIO: ${username}`;

            initRealtimeSync();
        } else {
            loginScreen.classList.remove('hidden');
            appScreen.classList.add('hidden');
        }
    });
});

async function handleLogin(e) {
    e.preventDefault();
    let usuario = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.classList.add('hidden');

    if (!usuario.includes('@')) {
        usuario = `${usuario}${DEFAULT_DOMAIN}`;
    }

    try {
        await window.auth.signInWithEmailAndPassword(usuario, password);
        showToast("Login efetuado com sucesso!", "success");
    } catch (error) {
        console.error("Erro no login:", error);
        errorDiv.innerText = "Usuário ou senha inválidos. Verifique suas credenciais.";
        errorDiv.classList.remove('hidden');
    }
}

function handleLogout() {
    window.auth.signOut();
}

// ----------------------------------------------------
// SINCRONIZAÇÃO EM TEMPO REAL COM DEBOUNCE
// ----------------------------------------------------
function initRealtimeSync() {
    window.rtdb.ref('pneus').on('value', (snapshot) => {
        const data = snapshot.val();
        state.pneus = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        debouncedRender();
    });

    window.rtdb.ref('carretas').on('value', (snapshot) => {
        const data = snapshot.val();
        state.carretas = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        debouncedRender();
    });
}

function debouncedRender() {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(renderPage, 100);
}

// ----------------------------------------------------
// NAVEGAÇÃO ENTRE ABAS
// ----------------------------------------------------
function navigate(page) {
    currentPage = page;
    state.searchTerm = ''; // Limpa a busca ao trocar de página

    document.querySelectorAll('#sidebar-nav button').forEach(btn => {
        btn.className = "px-6 py-2.5 rounded-xl text-sm font-bold font-heading transition bg-white text-slate-600 hover:bg-slate-100 border border-slate-200";
    });

    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) {
        activeBtn.className = "px-6 py-2.5 rounded-xl text-sm font-bold font-heading transition shadow-sm bg-lprosp-blue text-white";
    }

    renderPage();
}

function renderPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (currentPage === 'dashboard') renderDashboard(main);
    if (currentPage === 'carretas') renderCarretasView(main);
    if (currentPage === 'pneus') renderPneusView(main);
}

// ----------------------------------------------------
// 1. DASHBOARD
// ----------------------------------------------------
function renderDashboard(container) {
    const emUso = state.pneus.filter(p => p.status === 'Em Uso').length;
    const emEstoque = state.pneus.filter(p => p.status === 'Estoque').length;
    const criticos = state.pneus.filter(p => p.sulcoAtual <= 3.0 && p.status !== 'Descartado');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase">Total de Carretas</p>
                <h3 class="text-3xl font-bold text-slate-800 mt-1">${state.carretas.length}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-blue">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase">Pneus Em Uso</p>
                <h3 class="text-3xl font-bold text-lprosp-blue mt-1">${emUso}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-green">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase">Pneus no Estoque</p>
                <h3 class="text-3xl font-bold text-lprosp-green mt-1">${emEstoque}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-red">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase">Alertas (&le; 3mm)</p>
                <h3 class="text-3xl font-bold text-lprosp-red mt-1">${criticos.length}</h3>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 class="text-base font-bold font-heading text-lprosp-red flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <i class="fas fa-triangle-exclamation"></i> PNEUS CRÍTICOS QUE EXIGEM TROCA / REFORMA
            </h3>
            ${criticos.length === 0 ? '<p class="text-slate-400 text-xs italic">Nenhum pneu em estado crítico no momento.</p>' : `
                <div class="space-y-3">
                    ${criticos.map(p => `
                        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span class="font-bold text-slate-800">${escapeHtml(p.fuego)}</span> - <span class="text-slate-600 text-sm">${escapeHtml(p.marca)} (${escapeHtml(p.medida)})</span>
                                <p class="text-xs text-slate-500 mt-0.5">Sulco Atual: <b class="text-lprosp-red">${p.sulcoAtual} mm</b></p>
                            </div>
                            <span class="px-3 py-1 rounded-lg text-xs font-bold font-heading bg-lprosp-red text-white uppercase">Atenção Imediata</span>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

// ----------------------------------------------------
// 2. CARRETAS / PÁTIO (COM SUPORTE A CAVALO ENGATADO)
// ----------------------------------------------------
function renderCarretasView(container) {
    const carretasFiltradas = state.carretas.filter(c => 
        c.placa.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        c.modelo.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        (c.cavaloEngatado && c.cavaloEngatado.toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    container.innerHTML = `
        <div class="mb-6 flex justify-between items-center gap-4">
            <div class="relative flex-1 max-w-md">
                <i class="fas fa-search absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" placeholder="Buscar por placa da carreta ou cavalo..." value="${escapeHtml(state.searchTerm)}" 
                    oninput="state.searchTerm = this.value; renderPage()" 
                    class="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-lprosp-blue shadow-sm">
            </div>
        </div>

        ${carretasFiltradas.length === 0 ? `
            <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                <i class="fas fa-truck-front text-4xl mb-3 text-slate-300"></i>
                <p class="font-bold font-heading text-slate-600">NENHUMA CARRETA ENCONTRADA</p>
            </div>
        ` : `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                ${carretasFiltradas.map(carreta => {
                    const pneusDaCarreta = state.pneus.filter(p => p.carretaId === carreta.id);
                    return `
                        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                <div>
                                    <h3 class="text-xl font-bold text-slate-800 font-heading">${escapeHtml(carreta.placa)}</h3>
                                    <p class="text-xs text-slate-500">${escapeHtml(carreta.modelo)} • ${carreta.kmAtual?.toLocaleString() || 0} KM</p>
                                    ${carreta.cavaloEngatado ? `<span class="inline-block mt-1 text-[11px] font-bold text-lprosp-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><i class="fas fa-truck"></i> Cavalo: ${escapeHtml(carreta.cavaloEngatado)}</span>` : '<span class="inline-block mt-1 text-[10px] text-slate-400 italic">Nenhum cavalo engatado</span>'}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="bg-lprosp-blue-light text-lprosp-blue border border-lprosp-blue/20 text-xs px-2.5 py-1 rounded-lg font-bold font-heading">
                                        ${carreta.eixos} EIXOS
                                    </span>
                                    <button onclick="showEditCarretaModal('${carreta.id}')" title="Editar" class="text-slate-400 hover:text-lprosp-blue p-1 transition">
                                        <i class="fas fa-pen-to-square text-sm"></i>
                                    </button>
                                    <button onclick="deletarCarreta('${carreta.id}', '${carreta.placa}')" title="Excluir" class="text-slate-400 hover:text-lprosp-red p-1 transition">
                                        <i class="fas fa-trash-can text-sm"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 my-2 flex flex-col items-center gap-4">
                                <div class="text-[10px] text-slate-400 font-bold font-heading uppercase">Frente da Carreta</div>
                                
                                ${Array.from({ length: carreta.eixos }, (_, index) => index + 1).map(eixo => {
                                    const posEsquerda = `E${eixo}E`;
                                    const posDireita = `E${eixo}D`;
                                    const pneuE = pneusDaCarreta.find(p => p.posicao === posEsquerda);
                                    const pneuD = pneusDaCarreta.find(p => p.posicao === posDireita);

                                    return `
                                        <div class="flex items-center justify-center gap-6 w-full">
                                            <button onclick="handleSlotClick('${carreta.id}', '${posEsquerda}')" 
                                                class="w-28 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold shadow-sm
                                                ${pneuE ? (pneuE.sulcoAtual <= 3 ? 'bg-red-50 border-lprosp-red text-lprosp-red' : 'bg-blue-50 border-lprosp-blue text-lprosp-blue') : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'}">
                                                <span class="font-bold">${pneuE ? escapeHtml(pneuE.fuego) : '+ Montar'}</span>
                                                <span class="text-[10px] opacity-75">${pneuE ? `${pneuE.sulcoAtual}mm` : posEsquerda}</span>
                                            </button>

                                            <div class="h-2 flex-1 bg-slate-300 rounded-full"></div>

                                            <button onclick="handleSlotClick('${carreta.id}', '${posDireita}')" 
                                                class="w-28 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold shadow-sm
                                                ${pneuD ? (pneuD.sulcoAtual <= 3 ? 'bg-red-50 border-lprosp-red text-lprosp-red' : 'bg-blue-50 border-lprosp-blue text-lprosp-blue') : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'}">
                                                <span class="font-bold">${pneuD ? escapeHtml(pneuD.fuego) : '+ Montar'}</span>
                                                <span class="text-[10px] opacity-75">${pneuD ? `${pneuD.sulcoAtual}mm` : posDireita}</span>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

// ----------------------------------------------------
// 3. ESTOQUE DE PNEUS (COM BUSCA EM TEMPO REAL)
// ----------------------------------------------------
function renderPneusView(container) {
    const pneusFiltrados = state.pneus.filter(p => 
        p.fuego.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        p.marca.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        p.status.toLowerCase().includes(state.searchTerm.toLowerCase())
    );

    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h3 class="text-lg font-bold font-heading text-slate-800">TODOS OS PNEUS (${pneusFiltrados.length})</h3>
                <div class="relative w-full md:w-72">
                    <i class="fas fa-search absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                    <input type="text" placeholder="Buscar por Fogo, Marca ou Status..." value="${escapeHtml(state.searchTerm)}" 
                        oninput="state.searchTerm = this.value; renderPage()" 
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-lprosp-blue">
                </div>
            </div>

            ${pneusFiltrados.length === 0 ? '<p class="text-slate-400 text-xs italic text-center py-8">Nenhum pneu encontrado.</p>' : `
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600">
                        <thead class="bg-slate-50 text-slate-500 font-heading border-b border-slate-200">
                            <tr>
                                <th class="p-3">FOGO</th>
                                <th class="p-3">MARCA / MEDIDA</th>
                                <th class="p-3">SULCO ATUAL</th>
                                <th class="p-3">STATUS</th>
                                <th class="p-3">LOCALIZAÇÃO</th>
                                <th class="p-3 text-right">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${pneusFiltrados.map(p => {
                                const carreta = state.carretas.find(c => c.id === p.carretaId);
                                return `
                                    <tr>
                                        <td class="p-3 font-bold text-slate-800">${escapeHtml(p.fuego)}</td>
                                        <td class="p-3">${escapeHtml(p.marca)} (${escapeHtml(p.medida)})</td>
                                        <td class="p-3 font-bold ${p.sulcoAtual <= 3 ? 'text-lprosp-red' : 'text-slate-800'}">${p.sulcoAtual} mm</td>
                                        <td class="p-3"><span class="px-2 py-1 rounded text-[10px] font-bold ${p.status === 'Em Uso' ? 'bg-blue-100 text-lprosp-blue' : 'bg-emerald-100 text-lprosp-green'}">${escapeHtml(p.status)}</span></td>
                                        <td class="p-3 text-slate-500">${carreta ? `${escapeHtml(carreta.placa)} (${escapeHtml(p.posicao)})` : 'Estoque Central'}</td>
                                        <td class="p-3 text-right flex justify-end gap-2">
                                            <button onclick="showEditTireModal('${p.id}')" title="Editar" class="text-slate-400 hover:text-lprosp-blue p-1 transition">
                                                <i class="fas fa-pen-to-square text-sm"></i>
                                            </button>
                                            <button onclick="deletarPneu('${p.id}', '${p.fuego}')" title="Excluir" class="text-slate-400 hover:text-lprosp-red p-1 transition">
                                                <i class="fas fa-trash-can text-sm"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

// ----------------------------------------------------
// 4. AÇÕES DE MONTAGEM E DESMONTAGEM
// ----------------------------------------------------
function handleSlotClick(carretaId, posicao) {
    const pneuInstalado = state.pneus.find(p => p.carretaId === carretaId && p.posicao === posicao);
    if (pneuInstalado) {
        showDesmontarModal(pneuInstalado);
    } else {
        showMontarModal(carretaId, posicao);
    }
}

function showMontarModal(carretaId, posicao) {
    const pneusDisponiveis = state.pneus.filter(p => p.status === 'Estoque');

    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Montar Pneu na Posição ${posicao}</h3>
            <p class="text-xs text-slate-500 mb-4">Selecione um pneu do estoque para instalar.</p>
            
            ${pneusDisponiveis.length === 0 ? '<p class="text-lprosp-red text-xs italic">Nenhum pneu disponível no estoque.</p>' : `
                <form onsubmit="confirmarMontagem(event, '${carretaId}', '${posicao}')" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">SELECIONE O PNEU</label>
                        <select id="montar-pneu-id" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" required>
                            ${pneusDisponiveis.map(p => `<option value="${p.id}">${escapeHtml(p.fuego)} - ${escapeHtml(p.marca)} (${p.sulcoAtual}mm)</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                        <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue text-white text-xs font-bold font-heading">INSTALAR PNEU</button>
                    </div>
                </form>
            `}
        </div>
    `);
}

function confirmarMontagem(e, carretaId, posicao) {
    e.preventDefault();
    const pneuId = document.getElementById('montar-pneu-id').value;

    window.rtdb.ref(`pneus/${pneuId}`).update({
        status: 'Em Uso',
        carretaId: carretaId,
        posicao: posicao
    }).then(() => {
        closeModal();
        showToast("Pneu montado com sucesso!", "success");
    }).catch(() => showToast("Erro ao instalar pneu.", "error"));
}

function showDesmontarModal(pneu) {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Desmontar Pneu ${escapeHtml(pneu.fuego)}</h3>
            <p class="text-xs text-slate-500 mb-4">Informe o sulco medido e o destino do pneu.</p>

            <form onsubmit="confirmarDesmontagem(event, '${pneu.id}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MEDIÇÃO DE SULCO ATUAL (MM)</label>
                    <input type="number" step="0.1" id="desmontar-sulco" value="${pneu.sulcoAtual}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">DESTINO DO PNEU</label>
                    <select id="desmontar-destino" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800">
                        <option value="Estoque">Retornar ao Estoque</option>
                        <option value="Reforma">Enviar para Reforma / Recape</option>
                        <option value="Descartado">Descarte / Sucata</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-red text-white text-xs font-bold font-heading">CONFIRMAR DESMONTAGEM</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarDesmontagem(e, pneuId) {
    e.preventDefault();
    const sulco = parseFloat(document.getElementById('desmontar-sulco').value);
    const destino = document.getElementById('desmontar-destino').value;

    window.rtdb.ref(`pneus/${pneuId}`).update({
        sulcoAtual: sulco,
        status: destino,
        carretaId: null,
        posicao: null
    }).then(() => {
        closeModal();
        showToast("Pneu desmontado com sucesso!", "success");
    }).catch(() => showToast("Erro ao desmontar pneu.", "error"));
}

// ----------------------------------------------------
// 5. MODAIS DE CADASTRO E EDIÇÃO DE PNEUS (COM VALIDAÇÃO DE DUPLICIDADE)
// ----------------------------------------------------
function showAddTireModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">CADASTRAR NOVO(S) PNEU(S)</h3>
            <form onsubmit="cadastrarPneu(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO (Separe por vírgula)</label>
                        <input type="text" id="pneu-fuego" placeholder="Ex: 101,102,103,104" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" value="295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">SULCO NOVO (MM)</label>
                        <input type="number" step="0.1" id="pneu-sulco" value="15" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">VALOR UN. DE COMPRA (R$)</label>
                    <input type="number" id="pneu-valor" placeholder="1000" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue text-white text-xs font-bold font-heading">SALVAR PNEU(S)</button>
                </div>
            </form>
        </div>
    `);
}

function cadastrarPneu(e) {
    e.preventDefault();

    const inputFuego = document.getElementById('pneu-fuego').value;
    const marca = document.getElementById('pneu-marca').value;
    const medida = document.getElementById('pneu-medida').value;
    const sulcoAtual = parseFloat(document.getElementById('pneu-sulco').value);
    const valor = parseFloat(document.getElementById('pneu-valor').value);

    // Separa os números de fogo digitados
    const listaFuegos = inputFuego.split(',')
                                  .map(f => f.trim())
                                  .filter(f => f.length > 0);

    if (listaFuegos.length === 0) {
        showToast("Informe pelo menos um número de fogo.", "error");
        return;
    }

    // VALIDAÇÃO DE FOGO DUPLICADO: Verifica se algum já existe no banco
    const fogosExistentes = state.pneus.map(p => p.fuego.toLowerCase());
    const duplicados = listaFuegos.filter(f => fogosExistentes.includes(f.toLowerCase()));

    if (duplicados.length > 0) {
        showToast(`Fogo(s) já existente(s): ${duplicados.join(', ')}`, "error");
        return;
    }

    const updates = {};
    listaFuegos.forEach(fuego => {
        const newKey = window.rtdb.ref().child('pneus').push().key;
        updates[`pneus/${newKey}`] = {
            fuego: fuego,
            marca: marca,
            medida: medida,
            sulcoAtual: sulcoAtual,
            valor: valor,
            vida: 'Nova',
            status: 'Estoque',
            carretaId: null,
            posicao: null,
            kmRodados: 0
        };
    });

    window.rtdb.ref().update(updates)
        .then(() => {
            closeModal();
            showToast(`${listaFuegos.length} pneu(s) cadastrado(s) com sucesso!`, "success");
        })
        .catch(() => showToast("Erro ao cadastrar pneus.", "error"));
}

function showEditTireModal(pneuId) {
    const pneu = state.pneus.find(p => p.id === pneuId);
    if (!pneu) return;

    const isEmUso = pneu.status === 'Em Uso';

    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">EDITAR PNEU ${escapeHtml(pneu.fuego)}</h3>
            <form onsubmit="salvarEdicaoPneu(event, '${pneu.id}')" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO ${isEmUso ? '(Bloqueado - Em Uso)' : ''}</label>
                        <input type="text" id="pneu-fuego" value="${escapeHtml(pneu.fuego)}" ${isEmUso ? 'disabled' : ''} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs disabled:opacity-50" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" value="${escapeHtml(pneu.marca)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" value="${escapeHtml(pneu.medida)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">SULCO ATUAL (MM)</label>
                        <input type="number" step="0.1" id="pneu-sulco" value="${pneu.sulcoAtual}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">VALOR DE COMPRA (R$)</label>
                    <input type="number" id="pneu-valor" value="${pneu.valor || 0}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue text-white text-xs font-bold font-heading">SALVAR ALTERAÇÕES</button>
                </div>
            </form>
        </div>
    `);
}

function salvarEdicaoPneu(e, pneuId) {
    e.preventDefault();
    const novoFuego = document.getElementById('pneu-fuego').value.trim();

    // Valida se alterou o fuego para um que já existe
    const pneuExistente = state.pneus.find(p => p.fuego.toLowerCase() === novoFuego.toLowerCase() && p.id !== pneuId);
    if (pneuExistente) {
        showToast(`O fogo ${novoFuego} já está cadastrado em outro pneu.`, "error");
        return;
    }

    window.rtdb.ref(`pneus/${pneuId}`).update({
        fuego: novoFuego,
        marca: document.getElementById('pneu-marca').value,
        medida: document.getElementById('pneu-medida').value,
        sulcoAtual: parseFloat(document.getElementById('pneu-sulco').value),
        valor: parseFloat(document.getElementById('pneu-valor').value)
    }).then(() => {
        closeModal();
        showToast("Pneu atualizado com sucesso!", "success");
    }).catch(() => showToast("Erro ao editar pneu.", "error"));
}

function deletarPneu(pneuId, fuego) {
    if (confirm(`Tem certeza que deseja excluir o pneu ${fuego}?`)) {
        window.rtdb.ref(`pneus/${pneuId}`).remove()
            .then(() => showToast("Pneu excluído.", "success"))
            .catch(() => showToast("Erro ao excluir pneu.", "error"));
    }
}

// ----------------------------------------------------
// 6. MODAIS DE CADASTRO E EDIÇÃO DE CARRETAS
// ----------------------------------------------------
function showAddCarretaModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">CADASTRAR NOVA CARRETA</h3>
            <form onsubmit="cadastrarCarreta(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">PLACA DA CARRETA</label>
                        <input type="text" id="carreta-placa" placeholder="Ex: ABC-1234" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">CAVALO ENGATADO (Opcional)</label>
                        <input type="text" id="carreta-cavalo" placeholder="Ex: DEF-5678" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                    <input type="text" id="carreta-modelo" placeholder="Ex: Vanderléia 3 Eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <input type="number" id="carreta-eixos" min="1" max="6" value="3" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL</label>
                        <input type="number" id="carreta-km" value="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-red text-white text-xs font-bold font-heading">SALVAR CARRETA</button>
                </div>
            </form>
        </div>
    `);
}

function cadastrarCarreta(e) {
    e.preventDefault();
    const novaCarreta = {
        placa: document.getElementById('carreta-placa').value.toUpperCase().trim(),
        cavaloEngatado: document.getElementById('carreta-cavalo').value.toUpperCase().trim() || null,
        modelo: document.getElementById('carreta-modelo').value,
        eixos: parseInt(document.getElementById('carreta-eixos').value),
        kmAtual: parseInt(document.getElementById('carreta-km').value)
    };

    window.rtdb.ref('carretas').push(novaCarreta)
        .then(() => {
            closeModal();
            showToast("Carreta cadastrada com sucesso!", "success");
        })
        .catch(() => showToast("Erro ao cadastrar carreta.", "error"));
}

function showEditCarretaModal(carretaId) {
    const carreta = state.carretas.find(c => c.id === carretaId);
    if (!carreta) return;

    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">EDITAR CARRETA ${escapeHtml(carreta.placa)}</h3>
            <form onsubmit="salvarEdicaoCarreta(event, '${carreta.id}')" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">PLACA DA CARRETA</label>
                        <input type="text" id="carreta-placa" value="${escapeHtml(carreta.placa)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">CAVALO ENGATADO</label>
                        <input type="text" id="carreta-cavalo" value="${escapeHtml(carreta.cavaloEngatado || '')}" placeholder="Ex: DEF-5678" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                    <input type="text" id="carreta-modelo" value="${escapeHtml(carreta.modelo)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <input type="number" id="carreta-eixos" min="1" max="6" value="${carreta.eixos}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">KM ATUAL</label>
                        <input type="number" id="carreta-km" value="${carreta.kmAtual || 0}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue text-white text-xs font-bold font-heading">SALVAR ALTERAÇÕES</button>
                </div>
            </form>
        </div>
    `);
}

function salvarEdicaoCarreta(e, carretaId) {
    e.preventDefault();
    window.rtdb.ref(`carretas/${carretaId}`).update({
        placa: document.getElementById('carreta-placa').value.toUpperCase().trim(),
        cavaloEngatado: document.getElementById('carreta-cavalo').value.toUpperCase().trim() || null,
        modelo: document.getElementById('carreta-modelo').value,
        eixos: parseInt(document.getElementById('carreta-eixos').value),
        kmAtual: parseInt(document.getElementById('carreta-km').value)
    }).then(() => {
        closeModal();
        showToast("Carreta atualizada!", "success");
    }).catch(() => showToast("Erro ao editar carreta.", "error"));
}

// CORREÇÃO CRÍTICA DO BUG DE EXCLUSÃO (ATÔMICO):
async function deletarCarreta(carretaId, placa) {
    if (!confirm(`Tem certeza que deseja excluir a carreta ${placa}? Todos os pneus montados nela voltarão para o estoque.`)) return;

    try {
        const updates = {};
        
        // 1. Apaga a carreta
        updates[`carretas/${carretaId}`] = null;

        // 2. Desmonta todos os pneus vinculados a ela em uma única transação
        const pneusDaCarreta = state.pneus.filter(p => p.carretaId === carretaId);
        pneusDaCarreta.forEach(pneu => {
            updates[`pneus/${pneu.id}/carretaId`] = null;
            updates[`pneus/${pneu.id}/posicao`] = null;
            updates[`pneus/${pneu.id}/status`] = 'Estoque';
        });

        await window.rtdb.ref().update(updates);
        showToast("Carreta excluída e pneus retornados ao estoque.", "success");
    } catch (e) {
        console.error(e);
        showToast("Erro ao excluir carreta.", "error");
    }
}

// ----------------------------------------------------
// HELPERS E SANITIZAÇÃO
// ----------------------------------------------------
function openModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
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
