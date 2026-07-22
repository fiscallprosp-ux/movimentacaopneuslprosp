let currentPage = 'dashboard';
let state = {
    pneus: [],
    carretas: []
};

// Domínio padrão para conversão de usuário -> e-mail do Firebase
const DEFAULT_DOMAIN = '@lprosp.com';

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
// SINCRONIZAÇÃO EM TEMPO REAL (FIREBASE)
// ----------------------------------------------------
function initRealtimeSync() {
    window.rtdb.ref('pneus').on('value', (snapshot) => {
        const data = snapshot.val();
        state.pneus = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        renderPage();
    });

    window.rtdb.ref('carretas').on('value', (snapshot) => {
        const data = snapshot.val();
        state.carretas = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        renderPage();
    });
}

// ----------------------------------------------------
// NAVEGAÇÃO ENTRE ABAS
// ----------------------------------------------------
function navigate(page) {
    currentPage = page;
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
                                <span class="font-bold text-slate-800">${p.fuego}</span> - <span class="text-slate-600 text-sm">${p.marca} (${p.medida})</span>
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
// 2. CARRETAS / PÁTIO (COM EDITAR E EXCLUIR)
// ----------------------------------------------------
function renderCarretasView(container) {
    if (state.carretas.length === 0) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                <i class="fas fa-truck-front text-4xl mb-3 text-slate-300"></i>
                <p class="font-bold font-heading text-slate-600">NENHUMA CARRETA CADASTRADA</p>
                <p class="text-xs text-slate-400 mt-1">Clique em "+ NOVA CARRETA" para cadastrar sua frota.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${state.carretas.map(carreta => {
                const pneusDaCarreta = state.pneus.filter(p => p.carretaId === carreta.id);
                return `
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                            <div>
                                <h3 class="text-xl font-bold text-slate-800 font-heading">${carreta.placa}</h3>
                                <p class="text-xs text-slate-500">${carreta.modelo} • ${carreta.kmAtual?.toLocaleString() || 0} KM</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="bg-lprosp-blue-light text-lprosp-blue border border-lprosp-blue/20 text-xs px-2.5 py-1 rounded-lg font-bold font-heading">
                                    ${carreta.eixos} EIXOS
                                </span>
                                <!-- Botão Editar Carreta -->
                                <button onclick="showEditCarretaModal('${carreta.id}')" title="Editar Carreta" class="text-slate-400 hover:text-lprosp-blue p-1 transition">
                                    <i class="fas fa-pen-to-square text-sm"></i>
                                </button>
                                <!-- Botão Excluir Carreta -->
                                <button onclick="deletarCarreta('${carreta.id}', '${carreta.placa}')" title="Excluir Carreta" class="text-slate-400 hover:text-lprosp-red p-1 transition">
                                    <i class="fas fa-trash-can text-sm"></i>
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 my-2 flex flex-col items-center gap-4">
                            <div class="text-[10px] text-slate-400 font-bold font-heading uppercase">Frente da Carreta</div>
                            
                            ${[1, 2, 3].slice(0, carreta.eixos).map(eixo => {
                                const posEsquerda = `E${eixo}E`;
                                const posDireita = `E${eixo}D`;
                                const pneuE = pneusDaCarreta.find(p => p.posicao === posEsquerda);
                                const pneuD = pneusDaCarreta.find(p => p.posicao === posDireita);

                                return `
                                    <div class="flex items-center justify-center gap-6 w-full">
                                        <button onclick="handleSlotClick('${carreta.id}', '${posEsquerda}')" 
                                            class="w-28 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold shadow-sm
                                            ${pneuE ? (pneuE.sulcoAtual <= 3 ? 'bg-red-50 border-lprosp-red text-lprosp-red' : 'bg-blue-50 border-lprosp-blue text-lprosp-blue') : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'}">
                                            <span class="font-bold">${pneuE ? pneuE.fuego : '+ Montar'}</span>
                                            <span class="text-[10px] opacity-75">${pneuE ? `${pneuE.sulcoAtual}mm` : posEsquerda}</span>
                                        </button>

                                        <div class="h-2 flex-1 bg-slate-300 rounded-full"></div>

                                        <button onclick="handleSlotClick('${carreta.id}', '${posDireita}')" 
                                            class="w-28 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold shadow-sm
                                            ${pneuD ? (pneuD.sulcoAtual <= 3 ? 'bg-red-50 border-lprosp-red text-lprosp-red' : 'bg-blue-50 border-lprosp-blue text-lprosp-blue') : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'}">
                                            <span class="font-bold">${pneuD ? pneuD.fuego : '+ Montar'}</span>
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
    `;
}

// ----------------------------------------------------
// 3. ESTOQUE DE PNEUS (COM EDITAR E EXCLUIR)
// ----------------------------------------------------
function renderPneusView(container) {
    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">TODOS OS PNEUS</h3>
            ${state.pneus.length === 0 ? '<p class="text-slate-400 text-xs italic">Nenhum pneu cadastrado.</p>' : `
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
                            ${state.pneus.map(p => {
                                const carreta = state.carretas.find(c => c.id === p.carretaId);
                                return `
                                    <tr>
                                        <td class="p-3 font-bold text-slate-800">${p.fuego}</td>
                                        <td class="p-3">${p.marca} (${p.medida})</td>
                                        <td class="p-3 font-bold ${p.sulcoAtual <= 3 ? 'text-lprosp-red' : 'text-slate-800'}">${p.sulcoAtual} mm</td>
                                        <td class="p-3"><span class="px-2 py-1 rounded text-[10px] font-bold ${p.status === 'Em Uso' ? 'bg-blue-100 text-lprosp-blue' : 'bg-emerald-100 text-lprosp-green'}">${p.status}</span></td>
                                        <td class="p-3 text-slate-500">${carreta ? `${carreta.placa} (${p.posicao})` : 'Estoque Central'}</td>
                                        <td class="p-3 text-right flex justify-end gap-2">
                                            <!-- Botão Editar Pneu -->
                                            <button onclick="showEditTireModal('${p.id}')" title="Editar Pneu" class="text-slate-400 hover:text-lprosp-blue p-1 transition">
                                                <i class="fas fa-pen-to-square text-sm"></i>
                                            </button>
                                            <!-- Botão Excluir Pneu -->
                                            <button onclick="deletarPneu('${p.id}', '${p.fuego}')" title="Excluir Pneu" class="text-slate-400 hover:text-lprosp-red p-1 transition">
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
                            ${pneusDisponiveis.map(p => `<option value="${p.id}">${p.fuego} - ${p.marca} (${p.sulcoAtual}mm)</option>`).join('')}
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
    }).then(() => closeModal())
      .catch(() => alert("Erro ao salvar. Verifique suas permissões."));
}

function showDesmontarModal(pneu) {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Desmontar Pneu ${pneu.fuego}</h3>
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
    }).then(() => closeModal())
      .catch(() => alert("Erro ao salvar. Verifique suas permissões."));
}

// ----------------------------------------------------
// 5. MODAIS DE CADASTRO E EDIÇÃO DE PNEUS
// ----------------------------------------------------
function showAddTireModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">CADASTRAR NOVO PNEU</h3>
            <form onsubmit="cadastrarPneu(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO</label>
                        <input type="text" id="pneu-fuego" placeholder="Ex: P-102" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
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
                    <label class="block text-xs font-bold text-slate-600 mb-1">VALOR DE COMPRA (R$)</label>
                    <input type="number" id="pneu-valor" placeholder="2200" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue text-white text-xs font-bold font-heading">SALVAR PNEU</button>
                </div>
            </form>
        </div>
    `);
}

function cadastrarPneu(e) {
    e.preventDefault();
    const novoPneu = {
        fuego: document.getElementById('pneu-fuego').value,
        marca: document.getElementById('pneu-marca').value,
        medida: document.getElementById('pneu-medida').value,
        sulcoAtual: parseFloat(document.getElementById('pneu-sulco').value),
        valor: parseFloat(document.getElementById('pneu-valor').value),
        vida: 'Nova',
        status: 'Estoque',
        carretaId: null,
        posicao: null,
        kmRodados: 0
    };

    window.rtdb.ref('pneus').push(novoPneu)
        .then(() => closeModal())
        .catch(() => alert("Erro ao salvar. Verifique se o seu usuário tem permissão de edição."));
}

function showEditTireModal(pneuId) {
    const pneu = state.pneus.find(p => p.id === pneuId);
    if (!pneu) return;

    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">EDITAR PNEU ${pneu.fuego}</h3>
            <form onsubmit="salvarEdicaoPneu(event, '${pneu.id}')" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO</label>
                        <input type="text" id="pneu-fuego" value="${pneu.fuego}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" value="${pneu.marca}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" value="${pneu.medida}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
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
    window.rtdb.ref(`pneus/${pneuId}`).update({
        fuego: document.getElementById('pneu-fuego').value,
        marca: document.getElementById('pneu-marca').value,
        medida: document.getElementById('pneu-medida').value,
        sulcoAtual: parseFloat(document.getElementById('pneu-sulco').value),
        valor: parseFloat(document.getElementById('pneu-valor').value)
    }).then(() => closeModal())
      .catch(() => alert("Erro ao editar. Verifique suas permissões."));
}

function deletarPneu(pneuId, fuego) {
    if (confirm(`Tem certeza que deseja excluir o pneu ${fuego}?`)) {
        window.rtdb.ref(`pneus/${pneuId}`).remove()
            .catch(() => alert("Erro ao excluir. Verifique suas permissões."));
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
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA DA CARRETA</label>
                    <input type="text" id="carreta-placa" placeholder="Ex: ABC-1234" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                    <input type="text" id="carreta-modelo" placeholder="Ex: Vanderléia 3 Eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="carreta-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs">
                            <option value="2">2 Eixos</option>
                            <option value="3" selected>3 Eixos</option>
                        </select>
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
        placa: document.getElementById('carreta-placa').value,
        modelo: document.getElementById('carreta-modelo').value,
        eixos: parseInt(document.getElementById('carreta-eixos').value),
        kmAtual: parseInt(document.getElementById('carreta-km').value)
    };

    window.rtdb.ref('carretas').push(novaCarreta)
        .then(() => closeModal())
        .catch(() => alert("Erro ao salvar. Verifique se o seu usuário tem permissão de edição."));
}

function showEditCarretaModal(carretaId) {
    const carreta = state.carretas.find(c => c.id === carretaId);
    if (!carreta) return;

    openModal(`
        <div class="p-6">
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">EDITAR CARRETA ${carreta.placa}</h3>
            <form onsubmit="salvarEdicaoCarreta(event, '${carreta.id}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">PLACA DA CARRETA</label>
                    <input type="text" id="carreta-placa" value="${carreta.placa}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MODELO</label>
                    <input type="text" id="carreta-modelo" value="${carreta.modelo}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">QTD DE EIXOS</label>
                        <select id="carreta-eixos" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs">
                            <option value="2" ${carreta.eixos === 2 ? 'selected' : ''}>2 Eixos</option>
                            <option value="3" ${carreta.eixos === 3 ? 'selected' : ''}>3 Eixos</option>
                        </select>
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
        placa: document.getElementById('carreta-placa').value,
        modelo: document.getElementById('carreta-modelo').value,
        eixos: parseInt(document.getElementById('carreta-eixos').value),
        kmAtual: parseInt(document.getElementById('carreta-km').value)
    }).then(() => closeModal())
      .catch(() => alert("Erro ao editar. Verifique suas permissões."));
}

function deletarCarreta(carretaId, placa) {
    if (confirm(`Tem certeza que deseja excluir a carreta ${placa}?`)) {
        window.rtdb.ref(`carretas/${carretaId}`).remove()
            .then(() => {
                // Ao excluir a carreta, move os pneus que estavam instalados de volta para o estoque
                state.pneus.filter(p => p.carretaId === carretaId).forEach(pneu => {
                    window.rtdb.ref(`pneus/${pneu.id}`).update({
                        carretaId: null,
                        posicao: null,
                        status: 'Estoque'
                    });
                });
            })
            .catch(() => alert("Erro ao excluir. Verifique suas permissões."));
    }
}

// Helpers Modal
function openModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}
