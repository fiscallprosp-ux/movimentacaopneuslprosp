/* Operações puras: nenhuma leitura ou gravação remota neste arquivo. */
(function (global) {
    'use strict';
    const copiar = valor => JSON.parse(JSON.stringify(valor));
    function igual(a, b) {
        if (a == null || b == null) return a == null && b == null;
        if (typeof a !== 'object' || typeof b !== 'object') return a === b;
        const ka = Object.keys(a).filter(k => a[k] != null).sort();
        const kb = Object.keys(b).filter(k => b[k] != null).sort();
        return ka.length === kb.length && ka.every((k, i) => k === kb[i] && igual(a[k], b[k]));
    }
    function aplicar(raiz, updates) {
        Object.entries(updates).forEach(([path, valor]) => {
            const partes = path.split('/');
            let atual = raiz;
            partes.slice(0, -1).forEach(p => { atual = atual[p] || (atual[p] = {}); });
            const campo = partes[partes.length - 1];
            if (valor == null) delete atual[campo];
            else atual[campo] = copiar(valor);
        });
        return raiz;
    }
    function validarPosicoes(raiz, ids) {
        const pneus = raiz.pneus || {};
        ids.forEach(id => {
            const p = pneus[id];
            if (!p) return;
            if (p.arquivado && (p.veiculoId || p.posicao || p.status === 'Em Uso')) {
                throw new Error('Desmonte o pneu antes de arquivar.');
            }
            if (p.arquivado || p.status !== 'Em Uso') return;
            const v = (raiz.veiculos || {})[p.veiculoId];
            const pos = String(p.posicao || '').toUpperCase();
            const eixo = pos.match(/^E(\d+)R([1-4])$/);
            const eixoValido = eixo && Number(eixo[1]) >= 1 && Number(eixo[1]) <= Number(v && (v.eixos || 3));
            const direcionalValido = !eixo || !v || v.tipo !== 'cavalo' || eixo[1] !== '1' || ['1', '4'].includes(eixo[2]);
            if (!v || !((eixoValido && direcionalValido) || /^EST[12]$/.test(pos))) {
                throw new Error('Veículo ou posição inválida para o pneu #' + p.fuego + '.');
            }
            const ocupado = Object.entries(pneus).find(([outroId, outro]) => outroId !== id && !outro.arquivado && outro.veiculoId === p.veiculoId && String(outro.posicao || '').toUpperCase() === pos);
            if (ocupado) throw new Error('A posição ' + pos + ' já está ocupada pelo pneu #' + ocupado[1].fuego + '. Retire-o antes de montar outro.');
        });
    }
    function registrarAprovacao(antes, depois, updates, solicitacaoId, operacaoId, usuario, data) {
        const pneusIds = [...new Set(Object.keys(updates).filter(p => p.startsWith('pneus/')).map(p => p.split('/')[1]))];
        const veiculosIds = [...new Set(Object.keys(updates).filter(p => p.startsWith('veiculos/')).map(p => p.split('/')[1]))];
        const entidades = [];
        for (const [colecao, ids] of [['pneus', pneusIds], ['veiculos', veiculosIds]]) {
            ids.forEach(id => entidades.push({ colecao, id, antes: copiar((antes[colecao] || {})[id] || null), depois: copiar((depois[colecao] || {})[id] || null) }));
        }
        const historicos = Object.keys(updates).filter(p => p.startsWith('historico/')).map(p => p.split('/')[1]);
        const historicosAnteriores = Object.entries(antes.historico || {}).filter(([, h]) => pneusIds.includes(h.pneuId) || veiculosIds.includes(h.veiculoId)).map(([id]) => id);
        historicos.forEach(id => Object.assign(depois.historico[id], { solicitacaoId, operacaoId }));
        depois.operacoesPatio = depois.operacoesPatio || {};
        depois.operacoesPatio[operacaoId] = { solicitacaoId, usuario, data, entidades, historicos, historicosAnteriores, status: 'aplicada' };
        Object.assign(depois.solicitacoes[solicitacaoId], { status: 'aprovada', aprovadoEm: data, aprovadoPor: usuario, operacaoId });
        validarPosicoes(depois, pneusIds);
        return depois;
    }
    function estornar(raiz, solicitacaoId, usuario, data, historicoId) {
        const s = (raiz.solicitacoes || {})[solicitacaoId];
        if (!s || !['aprovada', 'rejeitada'].includes(s.status)) throw new Error('A solicitação não está disponível para reabertura.');
        if (s.status === 'rejeitada') {
            Object.assign(s, { status: 'pendente', reabertaEm: data, reabertaPor: usuario });
            return raiz;
        }
        const op = (raiz.operacoesPatio || {})[s.operacaoId];
        if (!op || op.solicitacaoId !== solicitacaoId || op.status !== 'aplicada') {
            throw new Error('Aprovação antiga sem registro de estorno. Revise as movimentações manualmente; a solicitação não foi reaberta.');
        }
        const entidades = op.entidades || [];
        entidades.forEach(e => {
            if (!igual((raiz[e.colecao] || {})[e.id], e.depois)) throw new Error('Há alterações posteriores em pneus ou veículos desta aprovação. Revise o histórico antes de estornar.');
        });
        const originais = new Set(op.historicos || []);
        const anteriores = new Set(op.historicosAnteriores || []);
        const pneusIds = new Set(entidades.filter(e => e.colecao === 'pneus').map(e => e.id));
        const veiculosIds = new Set(entidades.filter(e => e.colecao === 'veiculos').map(e => e.id));
        const posterior = Object.entries(raiz.historico || {}).some(([id, h]) => !originais.has(id) && !anteriores.has(id) && (pneusIds.has(h.pneuId) || veiculosIds.has(h.veiculoId)));
        if (posterior) throw new Error('Existem movimentações posteriores. O estorno foi bloqueado para preservar o histórico.');
        entidades.forEach(e => {
            if (e.antes != null) raiz[e.colecao][e.id] = copiar(e.antes);
            else if (e.colecao === 'pneus') {
                // Mantém a identidade do provisório para a correção e nova aprovação.
                const p = raiz.pneus[e.id];
                Object.assign(p, { status: 'Estoque', kmRodadoTotal: 0 });
                delete p.veiculoId; delete p.posicao; delete p.kmInstalacaoAtual;
            }
        });
        (op.historicos || []).forEach(id => {
            if (raiz.historico[id]) Object.assign(raiz.historico[id], { estornado: true, estornadoEm: data, estornadoPor: usuario });
        });
        op.status = 'estornada'; op.estornadoEm = data; op.estornadoPor = usuario;
        raiz.historico = raiz.historico || {};
        raiz.historico[historicoId] = { tipo: 'Estorno de solicitação (Pátio)', solicitacaoId, operacaoId: s.operacaoId, data, usuario };
        Object.assign(s, { status: 'pendente', reabertaEm: data, reabertaPor: usuario });
        delete s.aprovadoEm; delete s.aprovadoPor; delete s.operacaoId;
        validarPosicoes(raiz, [...pneusIds]);
        return raiz;
    }
    function arquivar(raiz, id, arquivado, usuario, data, historicoId) {
        const p = (raiz.pneus || {})[id];
        if (!p) throw new Error('Pneu não encontrado.');
        if (!!p.arquivado === arquivado) throw new Error('O cadastro já está neste estado.');
        if (p.veiculoId || p.posicao || p.status === 'Em Uso') throw new Error('Desmonte o pneu antes de arquivar.');
        p.arquivado = arquivado;
        if (arquivado) { p.arquivadoEm = data; p.arquivadoPor = usuario; }
        else { p.restauradoEm = data; p.restauradoPor = usuario; }
        raiz.historico = raiz.historico || {};
        raiz.historico[historicoId] = { pneuId: id, fuego: p.fuego, tipo: arquivado ? 'Arquivamento de cadastro' : 'Restauração de cadastro', data, usuario };
        return raiz;
    }
    const api = { copiar, igual, aplicar, validarPosicoes, registrarAprovacao, estornar, arquivar };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else global.OperacoesPneus = api;
})(typeof window !== 'undefined' ? window : globalThis);
