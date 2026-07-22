let currentPage = 'dashboard';

// Navegação de Telas
function navigate(page) {
    currentPage = page;
    document.querySelectorAll('#sidebar-nav button').forEach(btn => {
        btn.classList.remove('bg-lprosp-blue/10', 'text-lprosp-blue', 'font-semibold');
        btn.classList.add('text-zinc-400');
    });

    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-lprosp-blue/10', 'text-lprosp-blue', 'font-semibold');
    }

    const titleMap = {
        'dashboard': 'Dashboard Geral',
        'carretas': 'Gestão de Carretas & Pátio',
        'pneus': 'Estoque & Saúde dos Pneus'
    };
    document.getElementById('page-title').innerText = titleMap[page] || 'L-PROSP';

    renderPage();
}

function renderPage() {
    const main = document.getElementById('main-content');
    if (currentPage === 'dashboard') renderDashboard(main);
    if (currentPage === 'carretas') renderCarretasView(main);
    if (currentPage === 'pneus') renderPneusView(main);
}

// ----------------------------------------------------
// 1. DASHBOARD
// ----------------------------------------------------
function renderDashboard(container) {
    const pneus = DB.get('pneus');
    const carretas = DB.get('carretas');

    const emUso = pneus.filter(p => p.status === 'Em Uso').length;
    const emEstoque = pneus.filter(p => p.status === 'Estoque').length;
    const criticos = pneus.filter(p => p.sulcoAtual <= 3.0 && p.status !== 'Descartado');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p class="text-zinc-400 text-sm">Total de Carretas</p>
                <h3 class="text-3xl font-bold mt-2">${carretas.length}</h3>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p class="text-zinc-400 text-sm">Pneus Em Uso</p>
                <h3 class="text-3xl font-bold text-lprosp-blue mt-2">${emUso}</h3>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p class="text-zinc-400 text-sm">Pneus no Estoque</p>
                <h3 class="text-3xl font-bold text-lprosp-green mt-2">${emEstoque}</h3>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p class="text-zinc-400 text-sm">Alertas de Sulco (&le; 3mm)</p>
                <h3 class="text-3xl font-bold text-lprosp-red mt-2">${criticos.length}</h3>
            </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 class="text-lg font-semibold mb-4 text-lprosp-red flex items-center gap-2">
                <i class="fas fa-triangle-exclamation"></i> Pneus Críticos que Exigem Atenção
            </h3>
            ${criticos.length === 0 ? '<p class="text-zinc-500 text-sm">Nenhum pneu em estado crítico no momento.</p>' : `
                <div class="space-y-3">
                    ${criticos.map(p => `
                        <div class="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div>
                                <span class="font-bold text-white">${p.fuego}</span> - ${p.marca} (${p.medida})
                                <p class="text-xs text-zinc-500">Sulco Atual: <b class="text-lprosp-red">${p.sulcoAtual} mm</b></p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-lprosp-red/10 text-lprosp-red border border-lprosp-red/20">Atenção Imediata</span>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

// ----------------------------------------------------
// 2. GESTÃO DE CARRETAS (ESQUEMA VISUAL DO PÁTIO)
// ----------------------------------------------------
function renderCarretasView(container) {
    const carretas = DB.get('carretas');
    const pneus = DB.get('pneus');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            ${carretas.map(carreta => {
                const pneusDaCarreta = pneus.filter(p => p.carretaId === carreta.id);
                return `
                    <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-6">
                                <div>
                                    <h3 class="text-xl font-bold text-white">${carreta.placa}</h3>
                                    <p class="text-sm text-zinc-400">${carreta.modelo} • ${carreta.kmAtual.toLocaleString()} KM</p>
                                </div>
                                <span class="bg-lprosp-blue/10 text-lprosp-blue border border-lprosp-blue/20 text-xs px-3 py-1 rounded-full font-medium">
                                    ${carreta.eixos} Eixos
                                </span>
                            </div>

                            <!-- Esquema Visual da Carreta -->
                            <div class="bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 my-4 flex flex-col items-center gap-6">
                                <div class="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Frente da Carreta</div>
                                
                                ${[1, 2, 3].slice(0, carreta.eixos).map(eixo => {
                                    const posEsquerda = `E${eixo}E`;
                                    const posDireita = `E${eixo}D`;
                                    const pneuE = pneusDaCarreta.find(p => p.posicao === posEsquerda);
                                    const pneuD = pneusDaCarreta.find(p => p.posicao === posDireita);

                                    return `
                                        <div class="flex items-center justify-center gap-8 w-full">
                                            <!-- Pneu Esquerdo -->
                                            <button onclick="handleSlotClick('${carreta.id}', '${posEsquerda}')" 
                                                class="w-24 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold
                                                ${pneuE ? (pneuE.sulcoAtual <= 3 ? 'bg-red-950/40 border-lprosp-red/50 text-red-300' : 'bg-lprosp-blue/10 border-lprosp-blue/50 text-lprosp-blue') : 'bg-zinc-900 border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500'}">
                                                <span>${pneuE ? pneuE.fuego : '+ Montar'}</span>
                                                <span class="text-[10px] opacity-75">${pneuE ? `${pneuE.sulcoAtual}mm` : posEsquerda}</span>
                                            </button>

                                            <!-- Eixo -->
                                            <div class="h-2 flex-1 bg-zinc-800 rounded-full"></div>

                                            <!-- Pneu Direito -->
                                            <button onclick="handleSlotClick('${carreta.id}', '${posDireita}')" 
                                                class="w-24 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold
                                                ${pneuD ? (pneuD.sulcoAtual <= 3 ? 'bg-red-950/40 border-lprosp-red/50 text-red-300' : 'bg-lprosp-blue/10 border-lprosp-blue/50 text-lprosp-blue') : 'bg-zinc-900 border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500'}">
                                                <span>${pneuD ? pneuD.fuego : '+ Montar'}</span>
                                                <span class="text-[10px] opacity-75">${pneuD ? `${pneuD.sulcoAtual}mm` : posDireita}</span>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ----------------------------------------------------
// 3. AÇÕES DE MONTAGEM E DESMONTAGEM
// ----------------------------------------------------
function handleSlotClick(carretaId, posicao) {
    const pneus = DB.get('pneus');
    const pneuInstalado = pneus.find(p => p.carretaId === carretaId && p.posicao === posicao);

    if (pneuInstalado) {
        showDesmontarModal(pneuInstalado);
    } else {
        showMontarModal(carretaId, posicao);
    }
}

function showMontarModal(carretaId, posicao) {
    const pneusDisponiveis = DB.get('pneus').filter(p => p.status === 'Estoque');

    openModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-1">Montar Pneu na Posição ${posicao}</h3>
            <p class="text-sm text-zinc-400 mb-6">Selecione um pneu do estoque para instalar.</p>
            
            ${pneusDisponiveis.length === 0 ? '<p class="text-lprosp-red text-sm">Nenhum pneu disponível no estoque.</p>' : `
                <form onsubmit="confirmarMontagem(event, '${carretaId}', '${posicao}')" class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-1">Pneu</label>
                        <select id="montar-pneu-id" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                            ${pneusDisponiveis.map(p => `<option value="${p.id}">${p.fuego} - ${p.marca} (${p.sulcoAtual}mm)</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex justify-end gap-3 mt-6">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Cancelar</button>
                        <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue hover:bg-lprosp-blue-hover text-white font-medium text-sm">Instalar Pneu</button>
                    </div>
                </form>
            `}
        </div>
    `);
}

function confirmarMontagem(e, carretaId, posicao) {
    e.preventDefault();
    const pneuId = document.getElementById('montar-pneu-id').value;
    const pneus = DB.get('pneus');

    const index = pneus.findIndex(p => p.id === pneuId);
    if (index !== -1) {
        pneus[index].status = 'Em Uso';
        pneus[index].carretaId = carretaId;
        pneus[index].posicao = posicao;
        DB.set('pneus', pneus);
    }

    closeModal();
    renderPage();
}

function showDesmontarModal(pneu) {
    openModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-1">Desmontar Pneu ${pneu.fuego}</h3>
            <p class="text-sm text-zinc-400 mb-6">Informe o sulco medido e o destino do pneu.</p>

            <form onsubmit="confirmarDesmontagem(event, '${pneu.id}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Medição de Sulco Atual (mm)</label>
                    <input type="number" step="0.1" id="desmontar-sulco" value="${pneu.sulcoAtual}" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Destino do Pneu</label>
                    <select id="desmontar-destino" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm">
                        <option value="Estoque">Retornar ao Estoque</option>
                        <option value="Reforma">Enviar para Reforma / Recape</option>
                        <option value="Descartado">Descarte / Sucata</option>
                    </select>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Cancelar</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-red hover:opacity-90 font-medium text-sm text-white">Confirmar Desmontagem</button>
                </div>
            </form>
        </div>
    `);
}

function confirmarDesmontagem(e, pneuId) {
    e.preventDefault();
    const sulco = parseFloat(document.getElementById('desmontar-sulco').value);
    const destino = document.getElementById('desmontar-destino').value;

    const pneus = DB.get('pneus');
    const index = pneus.findIndex(p => p.id === pneuId);

    if (index !== -1) {
        pneus[index].sulcoAtual = sulco;
        pneus[index].status = destino;
        pneus[index].carretaId = null;
        pneus[index].posicao = null;
        DB.set('pneus', pneus);
    }

    closeModal();
    renderPage();
}

// ----------------------------------------------------
// 4. MODAIS DE CADASTRO
// ----------------------------------------------------
function showAddTireModal() {
    openModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Cadastrar Novo Pneu</h3>
            <form onsubmit="cadastrarPneu(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-1">Nº de Fogo</label>
                        <input type="text" id="pneu-fuego" placeholder="Ex: P-102" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-1">Marca</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-1">Medida</label>
                        <input type="text" id="pneu-medida" value="295/80 R22.5" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-1">Sulco Novo (mm)</label>
                        <input type="number" step="0.1" id="pneu-sulco" value="15" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Valor de Compra (R$)</label>
                    <input type="number" id="pneu-valor" placeholder="2200" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm" required>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-zinc-800 text-sm">Cancelar</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue hover:bg-lprosp-blue-hover text-white font-medium text-sm">Salvar Pneu</button>
                </div>
            </form>
        </div>
    `);
}

function cadastrarPneu(e) {
    e.preventDefault();
    const pneus = DB.get('pneus');

    const novoPneu = {
        id: Date.now().toString(),
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

    pneus.push(novoPneu);
    DB.set('pneus', pneus);
    closeModal();
    renderPage();
}

// Helpers de Modal
function openModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// Inicializar a aplicação
navigate('dashboard');
