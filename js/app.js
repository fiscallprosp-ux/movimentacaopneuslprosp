// Configuração do Firebase Realtime Database
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

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- ESCUTAR SOLICITAÇÕES PENDENTES DO PÁTIO EM TEMPO REAL ---
database.ref('solicitacoes').on('value', (snapshot) => {
    const data = snapshot.val();
    const secao = document.getElementById('secao-solicitacoes');
    const container = document.getElementById('container-solicitacoes');
    const qtdEl = document.getElementById('qtd-solicitacoes');

    if (!secao || !container) return;

    if (!data) {
        secao.classList.add('hidden');
        return;
    }

    // Filtrar apenas ordens com status 'pendente'
    const pendentes = Object.entries(data).filter(([key, item]) => item.status === 'pendente');

    if (pendentes.length === 0) {
        secao.classList.add('hidden');
        return;
    }

    secao.classList.remove('hidden');
    qtdEl.textContent = pendentes.length;

    container.innerHTML = pendentes.map(([id, ordem]) => `
        <div class="bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 space-y-3 text-xs shadow-lg">
            <div class="flex justify-between items-start border-b border-slate-700/60 pb-2">
                <div>
                    <span class="font-mono font-black text-lprosp-blue text-sm">🚚 ${ordem.placaCavalo || 'N/A'}</span>
                    ${ordem.placaCarreta ? `<span class="text-slate-300 font-mono text-xs"> + 🚛 ${ordem.placaCarreta}</span>` : ''}
                </div>
                <span class="bg-slate-900 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700">
                    KM: ${ordem.kmVeiculo || 'N/A'}
                </span>
            </div>

            <!-- Lista de Itens/Pneus -->
            <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                ${(ordem.itens || []).map(item => `
                    <div class="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 text-[11px] space-y-0.5">
                        <div class="flex justify-between font-bold">
                            <span class="text-amber-400">[${item.veiculoTipo}] Posição: ${item.posicao}</span>
                            <span class="text-slate-400 capitalize text-[10px] bg-slate-800 px-1.5 py-0.2 rounded">${item.tipoAcao}</span>
                        </div>
                        <div class="text-slate-300 text-[10px]">
                            ${item.fogoSaindo ? `<span class="text-lprosp-red font-mono">Sai: #${item.fogoSaindo} (${item.sulcoSaindo || '-'}mm)</span>` : ''}
                            ${item.fogoSaindo && item.fogoEntrando ? ' | ' : ''}
                            ${item.fogoEntrando ? `<span class="text-lprosp-green font-mono">Entra: #${item.fogoEntrando}</span>` : ''}
                        </div>
                        ${item.observacao ? `<p class="text-[9px] text-slate-400 italic">Obs: ${item.observacao}</p>` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- Botões de Ação -->
            <div class="flex gap-2 pt-1 border-t border-slate-700/60">
                <button onclick="aprovarSolicitacao('${id}')" 
                        class="flex-1 bg-lprosp-green hover:brightness-110 active:scale-[0.98] text-white font-bold py-2 px-2 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow">
                    <i class="fas fa-check"></i> Aprovar O.S.
                </button>
                <button onclick="rejeitarSolicitacao('${id}')" 
                        class="bg-lprosp-red/20 hover:bg-lprosp-red/40 text-lprosp-red border border-lprosp-red/30 font-bold py-2 px-3 rounded-lg text-xs transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
});

// FUNÇÃO PARA APROVAR SOLICITAÇÃO
function aprovarSolicitacao(id) {
    if (confirm("Deseja aprovar esta Ordem de Serviço do pátio?")) {
        database.ref(`solicitacoes/${id}`).update({ 
            status: 'aprovado',
            dataAprovacao: new Date().toISOString()
        })
        .then(() => alert("Ordem de serviço aprovada com sucesso!"))
        .catch(err => alert("Erro ao aprovar: " + err.message));
    }
}

// FUNÇÃO PARA REJEITAR SOLICITAÇÃO
function rejeitarSolicitacao(id) {
    if (confirm("Deseja rejeitar e descartar esta solicitação do pátio?")) {
        database.ref(`solicitacoes/${id}`).update({ 
            status: 'rejeitado',
            dataRejeicao: new Date().toISOString()
        })
        .then(() => alert("Ordem de serviço rejeitada."))
        .catch(err => alert("Erro ao rejeitar: " + err.message));
    }
}
