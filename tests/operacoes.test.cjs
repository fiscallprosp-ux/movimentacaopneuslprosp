const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const O = require('../js/operacoes.js');

function base() {
    return {
        pneus: {
            a: { fuego: '100', status: 'Em Uso', veiculoId: 'v', posicao: 'E1R1', kmInstalacaoAtual: 100, kmRodadoTotal: 50, valorPago: 2000 },
            b: { fuego: '200', status: 'Estoque', kmRodadoTotal: 20 }
        },
        veiculos: { v: { placa: 'ABC1234', tipo: 'cavalo', eixos: 3, kmAtual: 100 } },
        solicitacoes: { s: { status: 'pendente', placaCavalo: 'ABC1234', kmVeiculo: 150, itens: [{ veiculoTipo: 'Cavalo', posicaoCodigo: 'E1R1', tipoAcao: 'troca', fogoSaindo: '100', fogoEntrando: '200' }] } },
        historico: { antigo: { pneuId: 'a', tipo: 'Cadastro', data: 1 } }
    };
}

function sistema(inicial = base()) {
    let banco = O.copiar(inicial), contador = 0, conflito = null;
    const mensagens = [];
    const ctx = { console, setTimeout, clearTimeout, OperacoesPneus: O, confirm: () => true };
    const bancoFake = {
        ref() {
            return {
                push: () => ({ key: 'k' + (++contador) }),
                once: async () => ({ val: () => O.copiar(banco) }),
                on: (_evento, callback) => callback({ val: () => O.copiar(banco) }),
                off() {},
                transaction: async fn => {
                    let novo = fn(O.copiar(banco));
                    if (conflito) {
                        const alterar = conflito; conflito = null;
                        alterar(banco);
                        novo = fn(O.copiar(banco));
                    }
                    if (novo === undefined) return { committed: false };
                    // O RTDB omite campos com valor null na leitura seguinte.
                    banco = JSON.parse(JSON.stringify(novo, (k, v) => v === null ? undefined : v));
                    return { committed: true };
                }
            };
        }
    };
    ctx.window = { rtdb: bancoFake };
    ctx.firebase = { apps: [{}], database: () => bancoFake, auth: () => ({}) };
    ctx.document = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(require.resolve('../js/app.js'), 'utf8'), ctx);
    ctx.mensagens = mensagens;
    vm.runInContext('showToast = (msg, tipo) => mensagens.push({ msg, tipo });', ctx);
    function sincronizar() {
        ctx.registrosTeste = O.copiar(banco);
        vm.runInContext("['pneus','veiculos','solicitacoes','historico'].forEach(c => { state[c] = Object.entries(registrosTeste[c] || {}).map(([id,p]) => ({...p,id})); }); state.user = {email:'admin@lprosp.com'};", ctx);
    }
    sincronizar();
    return {
        ctx, mensagens, sincronizar,
        get banco() { return banco; },
        alterar(fn) { fn(banco); },
        conflitoNaConfirmacao(fn) { conflito = fn; },
        async aprovar() { sincronizar(); await ctx.aprovarSolicitacao('s'); },
        async reabrir() { sincronizar(); await ctx.reabrirSolicitacao('s'); }
    };
}

test('posição ocupada impede montagem e não grava nada', async () => {
    const s = sistema(), antes = O.copiar(s.banco);
    await assert.rejects(s.ctx.salvarUpdatesSeguros({ 'pneus/b/status': 'Em Uso', 'pneus/b/veiculoId': 'v', 'pneus/b/posicao': 'E1R1' }), /ocupada/);
    assert.deepEqual(s.banco, antes);
});

test('montagem em posição livre é permitida; posição direcional inválida é bloqueada', async () => {
    const s = sistema();
    await s.ctx.salvarUpdatesSeguros({ 'pneus/b/status': 'Em Uso', 'pneus/b/veiculoId': 'v', 'pneus/b/posicao': 'E2R1' });
    assert.equal(s.banco.pneus.b.posicao, 'E2R1');
    s.sincronizar();
    await assert.rejects(s.ctx.salvarUpdatesSeguros({ 'pneus/b/posicao': 'E1R2' }), /inválida/);
});

test('tela desatualizada não sobrescreve movimentação de outra sessão', async () => {
    const s = sistema();
    s.alterar(b => { b.pneus.b.status = 'Reforma'; });
    await assert.rejects(s.ctx.salvarUpdatesSeguros({ 'pneus/b/status': 'Descartado' }), /outra sessão/);
    assert.equal(s.banco.pneus.b.status, 'Reforma');
});

test('aprovação e estorno restauram pneus e veículo e preservam eventos', async () => {
    const s = sistema(), antes = O.copiar(s.banco);
    await s.aprovar();
    assert.equal(s.banco.solicitacoes.s.status, 'aprovada');
    assert.equal(s.banco.pneus.a.status, 'Estoque');
    assert.equal(s.banco.pneus.a.kmRodadoTotal, 100);
    assert.equal(s.banco.pneus.b.posicao, 'E1R1');
    const opId = s.banco.solicitacoes.s.operacaoId;
    await s.reabrir();
    assert.deepEqual(s.banco.pneus, antes.pneus);
    assert.deepEqual(s.banco.veiculos, antes.veiculos);
    assert.equal(s.banco.solicitacoes.s.status, 'pendente');
    assert.equal(s.banco.operacoesPatio[opId].status, 'estornada');
    assert.ok(s.banco.operacoesPatio[opId].historicos.every(id => s.banco.historico[id].estornado));
    assert.ok(s.banco.historico.antigo);
});

test('aprovação repetida não duplica quilometragem ou histórico', async () => {
    const s = sistema();
    await s.aprovar();
    const antes = O.copiar(s.banco);
    await s.aprovar();
    assert.deepEqual(s.banco, antes);
    assert.match(s.mensagens.at(-1).msg, /não está mais pendente/);
});

test('nova aprovação após estorno aplica apenas um ciclo de KM', async () => {
    const s = sistema();
    await s.aprovar(); await s.reabrir(); await s.aprovar();
    assert.equal(s.banco.pneus.a.kmRodadoTotal, 100);
    assert.equal(Object.values(s.banco.operacoesPatio).filter(op => op.status === 'aplicada').length, 1);
});

test('erro em um item cancela toda a aprovação', async () => {
    const b = base();
    b.solicitacoes.s.itens.push({ tipoAcao: 'reforma', fogoSaindo: '200', posicaoCodigo: 'E2R1' });
    const s = sistema(b), antes = O.copiar(s.banco);
    await s.aprovar();
    assert.deepEqual(s.banco, antes);
});

test('troca sem retirar ocupante não é aprovada', async () => {
    const b = base(); delete b.solicitacoes.s.itens[0].fogoSaindo;
    const s = sistema(b), antes = O.copiar(s.banco);
    await s.aprovar();
    assert.deepEqual(s.banco, antes);
    assert.match(s.mensagens.at(-1).msg, /ocupada/);
});

test('alteração posterior impede estorno e mantém aprovação', async () => {
    const s = sistema(); await s.aprovar();
    s.alterar(b => { b.pneus.b.sulcoAtual = 8; });
    const antes = O.copiar(s.banco);
    await s.reabrir();
    assert.deepEqual(s.banco, antes);
    assert.match(s.mensagens.at(-1).msg, /alterações posteriores/);
});

test('movimentação posterior que voltou ao mesmo estado também impede estorno', async () => {
    const s = sistema(); await s.aprovar();
    s.alterar(b => { b.historico.posterior = { pneuId: 'b', data: Date.now() + 1, tipo: 'Medição' }; });
    const antes = O.copiar(s.banco); await s.reabrir();
    assert.deepEqual(s.banco, antes);
    assert.match(s.mensagens.at(-1).msg, /movimentações posteriores/);
});

test('aprovação antiga sem snapshot não pode ser reaberta automaticamente', async () => {
    const b = base(); b.solicitacoes.s.status = 'aprovada';
    const s = sistema(b); await s.reabrir();
    assert.equal(s.banco.solicitacoes.s.status, 'aprovada');
    assert.match(s.mensagens.at(-1).msg, /antiga/);
});

test('rejeitada pode ser reaberta sem movimentar estoque', async () => {
    const b = base(); b.solicitacoes.s.status = 'rejeitada';
    const s = sistema(b); await s.reabrir();
    assert.equal(s.banco.solicitacoes.s.status, 'pendente');
    assert.deepEqual(s.banco.pneus, b.pneus);
});

test('provisório é preservado no estorno e reutilizado sem cadastro duplicado', async () => {
    const b = base(); b.solicitacoes.s.itens[0].fogoEntrando = '999';
    const s = sistema(b); await s.aprovar();
    let novos = Object.entries(s.banco.pneus).filter(([,p]) => p.fuego === '999');
    assert.equal(novos.length, 1); const id = novos[0][0];
    await s.reabrir();
    assert.equal(s.banco.pneus[id].status, 'Estoque');
    assert.ok(!s.banco.pneus[id].veiculoId);
    await s.aprovar();
    novos = Object.entries(s.banco.pneus).filter(([,p]) => p.fuego === '999');
    assert.equal(novos.length, 1); assert.equal(novos[0][0], id);
    assert.equal(s.banco.pneus[id].status, 'Em Uso');
});

test('arquivamento e restauração mantêm custos, número de fogo e histórico', async () => {
    const s = sistema();
    await s.ctx.deletarPneu('b');
    assert.equal(s.banco.pneus.b.arquivado, true);
    assert.equal(s.banco.pneus.b.kmRodadoTotal, 20);
    s.sincronizar(); await s.ctx.deletarPneu('b');
    assert.equal(s.banco.pneus.b.arquivado, false);
    assert.equal(s.banco.pneus.b.fuego, '200');
    assert.equal(Object.values(s.banco.historico).filter(h => h.pneuId === 'b').length, 2);
});

test('pneu montado não pode ser arquivado', async () => {
    const s = sistema(), antes = O.copiar(s.banco);
    await s.ctx.deletarPneu('a');
    assert.deepEqual(s.banco, antes);
    assert.match(s.mensagens.at(-1).msg, /Desmonte/);
});

test('pneu arquivado não pode entrar em uma troca', async () => {
    const b = base(); b.pneus.b.arquivado = true;
    const s = sistema(b); await s.aprovar();
    assert.equal(s.banco.solicitacoes.s.status, 'pendente');
    assert.match(s.mensagens.at(-1).msg, /arquivado/);
});

test('lista alterna ativos e arquivados e mantém consulta ao histórico', () => {
    const b = base(); b.pneus.b.arquivado = true;
    const s = sistema(b), container = {};
    s.ctx.renderPneusView(container);
    assert.match(container.innerHTML, /LISTA DE PNEUS \(1\)/);
    assert.match(container.innerHTML, /Ver arquivados/);
    s.ctx.alternarArquivados(); s.ctx.renderPneusView(container);
    assert.match(container.innerHTML, /PNEUS ARQUIVADOS \(1\)/);
    assert.match(container.innerHTML, /Restaurar/);
    assert.match(container.innerHTML, /showHistoricoPneu/);
});

test('posição ocupada em outra sessão durante a confirmação cancela a montagem', async () => {
    const s = sistema();
    s.conflitoNaConfirmacao(b => { b.pneus.c = { fuego: '300', status: 'Em Uso', veiculoId: 'v', posicao: 'E2R1' }; });
    await assert.rejects(s.ctx.salvarUpdatesSeguros({ 'pneus/b/status': 'Em Uso', 'pneus/b/veiculoId': 'v', 'pneus/b/posicao': 'E2R1' }), /ocupada/);
    assert.equal(s.banco.pneus.b.status, 'Estoque');
    assert.equal(s.banco.pneus.c.posicao, 'E2R1');
});

test('nova tentativa da transação mantém solicitações recebidas durante a aprovação', async () => {
    const s = sistema();
    s.conflitoNaConfirmacao(b => { b.solicitacoes.nova = { status: 'pendente', placaCavalo: 'DEF1234' }; });
    await s.aprovar();
    assert.equal(s.banco.solicitacoes.nova.status, 'pendente');
    assert.equal(Object.keys(s.banco.operacoesPatio).length, 1);
    assert.equal(s.banco.pneus.a.kmRodadoTotal, 100);
});

test('relógio de outro dispositivo não permite ignorar um movimento posterior', async () => {
    const s = sistema(); await s.aprovar();
    s.alterar(b => { b.historico.atrasado = { pneuId: 'b', data: 1, tipo: 'Medição' }; });
    await s.reabrir();
    assert.equal(s.banco.solicitacoes.s.status, 'aprovada');
    assert.match(s.mensagens.at(-1).msg, /movimentações posteriores/);
});

test('tela antiga não consegue editar ou rejeitar uma solicitação já aprovada', async () => {
    const s = sistema(); await s.aprovar();
    const antes = O.copiar(s.banco);
    await assert.rejects(s.ctx.salvarSolicitacaoPendente('s', { kmVeiculo: 999 }), /não está mais pendente/);
    await s.ctx.rejeitarSolicitacao('s');
    assert.deepEqual(s.banco, antes);
});
