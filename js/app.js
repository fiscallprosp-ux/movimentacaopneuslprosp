let currentPage = 'dashboard';

// Navegação de Telas por Abas
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
    if (currentPage === 'dashboard') renderDashboard(main);
    if (currentPage === 'carretas') renderCarretasView(main);
    if (currentPage === 'pneus') renderPneusView(main);
}

// ----------------------------------------------------
// 1. DASHBOARD CLARO
// ----------------------------------------------------
function renderDashboard(container) {
    const pneus = DB.get('pneus');
    const carretas = DB.get('carretas');

    const emUso = pneus.filter(p => p.status === 'Em Uso').length;
    const emEstoque = pneus.filter(p => p.status === 'Estoque').length;
    const criticos = pneus.filter(p => p.sulcoAtual <= 3.0 && p.status !== 'Descartado');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase tracking-wider">Total de Carretas</p>
                <h3 class="text-3xl font-bold text-slate-800 mt-1">${carretas.length}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-blue">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase tracking-wider">Pneus Em Uso</p>
                <h3 class="text-3xl font-bold text-lprosp-blue mt-1">${emUso}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-green">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase tracking-wider">Pneus no Estoque</p>
                <h3 class="text-3xl font-bold text-lprosp-green mt-1">${emEstoque}</h3>
            </div>
            <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center border-b-4 border-b-lprosp-red">
                <p class="text-xs font-bold font-heading text-slate-500 uppercase tracking-wider">Alertas (&le; 3mm)</p>
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
                            <span class="px-3 py-1 rounded-lg text-xs font-bold font-heading bg-lprosp-red text-white uppercase tracking-wider">Atenção Imediata</span>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

// ----------------------------------------------------
// 2. GESTÃO DE CARRETAS
// ----------------------------------------------------
function renderCarretasView(container) {
    const carretas = DB.get('carretas');
    const pneus = DB.get('pneus');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${carretas.map(carreta => {
                const pneusDaCarreta = pneus.filter(p => p.carretaId === carreta.id);
                return `
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <div>
                                <h3 class="text-xl font-bold text-slate-800 font-heading">${carreta.placa}</h3>
                                <p class="text-xs text-slate-500">${carreta.modelo} • ${carreta.kmAtual.toLocaleString()} KM</p>
                            </div>
                            <span class="bg-lprosp-blue-light text-lprosp-blue border border-lprosp-blue/20 text-xs px-3 py-1 rounded-lg font-bold font-heading">
                                ${carreta.eixos} EIXOS
                            </span>
                        </div>

                        <!-- Esquema Visual da Carreta -->
                        <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 my-2 flex flex-col items-center gap-4">
                            <div class="text-[10px] text-slate-400 font-bold font-heading uppercase tracking-widest">Frente da Carreta</div>
                            
                            ${[1, 2, 3].slice(0, carreta.eixos).map(eixo => {
                                const posEsquerda = `E${eixo}E`;
                                const posDireita = `E${eixo}D`;
                                const pneuE = pneusDaCarreta.find(p => p.posicao === posEsquerda);
                                const pneuD = pneusDaCarreta.find(p => p.posicao === posDireita);

                                return `
                                    <div class="flex items-center justify-center gap-6 w-full">
                                        <!-- Pneu Esquerdo -->
                                        <button onclick="handleSlotClick('${carreta.id}', '${posEsquerda}')" 
                                            class="w-28 h-12 rounded-lg border flex flex-col items-center justify-center transition text-xs font-semibold shadow-sm
                                            ${pneuE ? (pneuE.sulcoAtual <= 3 ? 'bg-red-50 border-lprosp-red text-lprosp-red' : 'bg-blue-50 border-lprosp-blue text-lprosp-blue') : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'}">
                                            <span class="font-bold">${pneuE ? pneuE.fuego : '+ Montar'}</span>
                                            <span class="text-[10px] opacity-75">${pneuE ? `${pneuE.sulcoAtual}mm` : posEsquerda}</span>
                                        </button>

                                        <!-- Eixo -->
                                        <div class="h-2 flex-1 bg-slate-300 rounded-full"></div>

                                        <!-- Pneu Direito -->
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
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Montar Pneu na Posição ${posicao}</h3>
            <p class="text-xs text-slate-500 mb-4">Selecione um pneu do estoque para instalar.</p>
            
            ${pneusDisponiveis.length === 0 ? '<p class="text-lprosp-red text-xs italic">Nenhum pneu disponível no estoque.</p>' : `
                <form onsubmit="confirmarMontagem(event, '${carretaId}', '${posicao}')" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">SELECIONE O PNEU</label>
                        <select id="montar-pneu-id" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                            ${pneusDisponiveis.map(p => `<option value="${p.id}">${p.fuego} - ${p.marca} (${p.sulcoAtual}mm)</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                        <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue hover:bg-lprosp-blue-dark text-white text-xs font-bold font-heading">INSTALAR PNEU</button>
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
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-1">Desmontar Pneu ${pneu.fuego}</h3>
            <p class="text-xs text-slate-500 mb-4">Informe o sulco medido e o destino do pneu.</p>

            <form onsubmit="confirmarDesmontagem(event, '${pneu.id}')" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">MEDIÇÃO DE SULCO ATUAL (MM)</label>
                    <input type="number" step="0.1" id="desmontar-sulco" value="${pneu.sulcoAtual}" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">DESTINO DO PNEU</label>
                    <select id="desmontar-destino" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue">
                        <option value="Estoque">Retornar ao Estoque</option>
                        <option value="Reforma">Enviar para Reforma / Recape</option>
                        <option value="Descartado">Descarte / Sucata</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-red hover:bg-lprosp-red-hover text-white text-xs font-bold font-heading">CONFIRMAR DESMONTAGEM</button>
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
            <h3 class="text-lg font-bold font-heading text-slate-800 mb-4">CADASTRAR NOVO PNEU</h3>
            <form onsubmit="cadastrarPneu(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nº DE FOGO</label>
                        <input type="text" id="pneu-fuego" placeholder="Ex: P-102" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MARCA</label>
                        <input type="text" id="pneu-marca" placeholder="Ex: Michelin" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">MEDIDA</label>
                        <input type="text" id="pneu-medida" value="295/80 R22.5" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">SULCO NOVO (MM)</label>
                        <input type="number" step="0.1" id="pneu-sulco" value="15" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">VALOR DE COMPRA (R$)</label>
                    <input type="number" id="pneu-valor" placeholder="2200" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-lprosp-blue" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold font-heading">CANCELAR</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-lprosp-blue hover:bg-lprosp-blue-dark text-white text-xs font-bold font-heading">SALVAR PNEU</button>
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
