// Executar apenas com o emulador e um projeto demo; nunca conecta em produção.
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const O = require('../js/operacoes.js');

const projectId = 'demo-pneus-lprosp';
const admins = ['eHk5Xl0K3fc0NfIAXoemlfZz0UK2', 'YRDl63klI6VExSFO8Gbhs6iKQBW2'];
let ambiente;
function base() {
    return {
        pneus: {
            a: { fuego: '100', status: 'Em Uso', veiculoId: 'v', posicao: 'E1R1', kmInstalacaoAtual: 100, kmRodadoTotal: 50, valorPago: 2000 },
            b: { fuego: '200', status: 'Estoque', kmRodadoTotal: 20 },
            c: { fuego: '300', status: 'Estoque', kmRodadoTotal: 0 }
        },
        veiculos: { v: { placa: 'ABC1234', tipo: 'cavalo', eixos: 3, kmAtual: 100 } },
        solicitacoes: { s: { status: 'pendente', placaCavalo: 'ABC1234', kmVeiculo: 150, itens: [{ veiculoTipo: 'Cavalo', posicaoCodigo: 'E1R1', tipoAcao: 'troca', fogoSaindo: '100', fogoEntrando: '200' }] } },
        historico: { anterior: { pneuId: 'a', tipo: 'Cadastro', data: 1 } }
    };
}
function dbAdmin(indice = 0) { return ambiente.authenticatedContext(admins[indice]).database(); }
async function sistema(indice = 0) {
    const db = dbAdmin(indice), mensagens = [];
    const ctx = {
        console, setTimeout, clearTimeout, OperacoesPneus: O, confirm: () => true,
        mensagens, window: { rtdb: db },
        firebase: { apps: [{}], database: () => db, auth: () => ({}) },
        document: { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } }
    };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(require.resolve('../js/app.js'), 'utf8'), ctx);
    vm.runInContext('showToast = (msg, tipo) => mensagens.push({msg, tipo});', ctx);
    const sincronizar = async () => {
        ctx.registrosTeste = (await db.ref().once('value')).val();
        vm.runInContext("['pneus','veiculos','solicitacoes','historico'].forEach(c => { state[c] = Object.entries(registrosTeste[c] || {}).map(([id,p]) => ({...p,id})); }); state.user = {email:'admin@lprosp.com'};", ctx);
    };
    await sincronizar();
    return { ctx, db, mensagens, sincronizar, ler: async () => (await db.ref().once('value')).val() };
}

before(async () => {
    if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) throw new Error('Emulador obrigatório; teste não executado fora do ambiente local.');
    ambiente = await initializeTestEnvironment({ projectId, database: { host: '127.0.0.1', port: 19000, rules: fs.readFileSync(require.resolve('../database.rules.json'), 'utf8') } });
});
beforeEach(async () => {
    await ambiente.clearDatabase();
    await ambiente.withSecurityRulesDisabled(async contexto => contexto.database().ref().set(base()));
});
after(async () => { if (ambiente) await ambiente.cleanup(); });

test('visitante mantém envio do pátio, mas não lê estoque nem grava a raiz', async () => {
    const db = ambiente.unauthenticatedContext().database();
    await assertFails(db.ref('pneus').once('value'));
    await assertSucceeds(db.ref('solicitacoes').push({ status: 'pendente', placaCavalo: 'DEF1234' }));
    await assertFails(db.ref().set({ pneus: {} }));
});

test('usuário autenticado sem perfil administrativo não altera pneus nem executa transação na raiz', async () => {
    const db = ambiente.authenticatedContext('usuario-sem-permissao').database();
    await assertSucceeds(db.ref('pneus').once('value'));
    await assertFails(db.ref('pneus/b/status').set('Vendido'));
    await assertFails(db.ref().transaction(atual => ({ ...atual, tentativa: true })));
});

test('os dois administradores atuais podem executar transações na raiz', async () => {
    for (let i = 0; i < admins.length; i++) {
        const db = dbAdmin(i);
        await db.ref().once('value');
        const resultado = await assertSucceeds(db.ref().transaction(atual => ({ ...atual, verificacao: admins[i] })));
        assert.equal(resultado.committed, true);
    }
});

test('aprovação, estorno e nova aprovação funcionam com SDK e regras reais', async () => {
    const s = await sistema();
    await s.ctx.aprovarSolicitacao('s');
    let banco = await s.ler();
    assert.equal(banco.solicitacoes.s.status, 'aprovada', JSON.stringify(s.mensagens));
    assert.equal(banco.pneus.b.posicao, 'E1R1');
    const operacaoId = banco.solicitacoes.s.operacaoId;
    await s.ctx.reabrirSolicitacao('s');
    banco = await s.ler();
    assert.equal(banco.solicitacoes.s.status, 'pendente', JSON.stringify(s.mensagens));
    assert.deepEqual(banco.pneus, base().pneus);
    assert.equal(banco.operacoesPatio[operacaoId].status, 'estornada');
    await s.ctx.aprovarSolicitacao('s');
    banco = await s.ler();
    assert.equal(banco.solicitacoes.s.status, 'aprovada');
    assert.equal(banco.pneus.a.kmRodadoTotal, 100);
});

test('duas sessões concorrentes não montam pneus na mesma posição', async () => {
    const a = await sistema(0), b = await sistema(1);
    const montar = (s, id) => s.ctx.salvarUpdatesSeguros({ [`pneus/${id}/status`]: 'Em Uso', [`pneus/${id}/veiculoId`]: 'v', [`pneus/${id}/posicao`]: 'E2R1' });
    const resultados = await Promise.allSettled([montar(a, 'b'), montar(b, 'c')]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(resultados.filter(r => r.status === 'rejected').length, 1);
    const banco = await a.ler();
    assert.equal(Object.values(banco.pneus).filter(p => p.posicao === 'E2R1').length, 1);
});

test('aprovação concorrente de duas sessões aplica apenas um ciclo', async () => {
    const a = await sistema(0), b = await sistema(1);
    await Promise.all([a.ctx.aprovarSolicitacao('s'), b.ctx.aprovarSolicitacao('s')]);
    const banco = await a.ler();
    assert.equal(banco.solicitacoes.s.status, 'aprovada');
    assert.equal(banco.pneus.a.kmRodadoTotal, 100);
    assert.equal(Object.keys(banco.operacoesPatio).length, 1);
    assert.equal([...a.mensagens, ...b.mensagens].filter(m => m.tipo === 'success').length, 1);
});

test('arquivamento e restauração preservam histórico e custos sob as regras publicáveis', async () => {
    const s = await sistema();
    await s.ctx.deletarPneu('b');
    let banco = await s.ler();
    assert.equal(banco.pneus.b.arquivado, true, JSON.stringify(s.mensagens));
    assert.equal(banco.pneus.b.kmRodadoTotal, 20);
    await s.sincronizar();
    await s.ctx.deletarPneu('b');
    banco = await s.ler();
    assert.equal(banco.pneus.b.arquivado, false);
    assert.equal(Object.values(banco.historico).filter(h => h.pneuId === 'b').length, 2);
});
