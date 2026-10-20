import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { criarBanco } from './banco.js';

// Grupo Aurora (1) ── Aurora Serviços (2) ── Aurora Campo (4)
//                 └── Vértice Finanças (3)
// Outra Empresa S.A. (5), fora do grupo
const TAREFAS = {
  2: [101, 102, 108, 112, 115],
  3: [105, 106, 110, 114],
  4: [103, 104, 109, 113],
  5: [107, 111],
};
const esperado = (...empresas) => empresas.flatMap((e) => TAREFAS[e]).sort((a, b) => a - b);
const ids = (r) => r.rows.map((l) => l.id);
const tarefaNova = (id, empresaId) =>
  [`insert into tarefas values ($1, $2, 'nova', 'aberta', '2026-10-15')`, [id, empresaId]];

describe('leitura por empresa', () => {
  let banco;
  beforeAll(async () => {
    banco = await criarBanco();
  }, 30_000);

  it.each([
    [1, esperado(2, 3, 4)],
    [2, esperado(2, 4)],
    [3, esperado(3)],
    [4, esperado(4)],
    [5, esperado(5)],
  ])('empresa %i vê só as tarefas da própria árvore', async (empresa, tarefas) => {
    expect(ids(await banco.como(empresa, 'select id from tarefas order by id'))).toEqual(tarefas);
  });

  it.each([
    [1, [1, 2, 3, 4]],
    [2, [2, 4]],
    [3, [3]],
    [4, [4]],
    [5, [5]],
  ])('empresa %i vê só as empresas da própria árvore', async (empresa, empresas) => {
    expect(ids(await banco.como(empresa, 'select id from empresas order by id'))).toEqual(empresas);
  });

  it('sem empresa definida não vê nada', async () => {
    expect(ids(await banco.como(null, 'select id from tarefas'))).toEqual([]);
    expect(ids(await banco.como(null, 'select id from empresas'))).toEqual([]);
  });

  it('empresa inexistente não vê nada', async () => {
    expect(ids(await banco.como(99, 'select id from tarefas'))).toEqual([]);
  });

  it('não dá para pedir a árvore de outra empresa pela função', async () => {
    const r = await banco.como(3, 'select * from empresas_visiveis()');
    expect(r.rows.map((l) => l.empresas_visiveis)).toEqual([3]);
  });
});

describe('escrita por empresa', () => {
  let banco;
  beforeEach(async () => {
    banco = await criarBanco();
  }, 30_000);

  it('cria tarefa na própria empresa e nas de baixo', async () => {
    await banco.como(3, ...tarefaNova(900, 3));
    await banco.como(2, ...tarefaNova(901, 4));
    await banco.como(1, ...tarefaNova(902, 2));
    const r = await banco.admin('select id from tarefas where id >= 900 order by id');
    expect(ids(r)).toEqual([900, 901, 902]);
  });

  it.each([
    [3, 5, 'Vértice na Outra Empresa'],
    [3, 2, 'Vértice na irmã Aurora Serviços'],
    [4, 2, 'Aurora Campo na empresa de cima'],
    [5, 1, 'Outra Empresa no Grupo Aurora'],
    [1, 5, 'Grupo Aurora na Outra Empresa'],
  ])('não cria tarefa fora da árvore (%i → %i: %s)', async (logada, alvo) => {
    await expect(banco.como(logada, ...tarefaNova(900, alvo))).rejects.toThrow(/row-level security/);
  });

  it('não altera tarefa de fora da árvore', async () => {
    const r = await banco.como(3, "update tarefas set titulo = 'x' where empresa_id in (2, 5)");
    expect(r.affectedRows).toBe(0);
    const intactas = await banco.admin("select count(*)::int as n from tarefas where titulo = 'x'");
    expect(intactas.rows[0].n).toBe(0);
  });

  it('não move tarefa para fora da árvore', async () => {
    await expect(
      banco.como(3, 'update tarefas set empresa_id = 5 where id = 105'),
    ).rejects.toThrow(/row-level security/);
    await expect(
      banco.como(4, 'update tarefas set empresa_id = 2 where id = 103'),
    ).rejects.toThrow(/row-level security/);
  });

  it('altera e move tarefa dentro da própria árvore', async () => {
    const r = await banco.como(2, "update tarefas set empresa_id = 4, status = 'concluida' where id = 101");
    expect(r.affectedRows).toBe(1);
    const t = await banco.admin('select empresa_id, status from tarefas where id = 101');
    expect(t.rows[0]).toEqual({ empresa_id: 4, status: 'concluida' });
  });

  it('não apaga tarefa de fora da árvore', async () => {
    const r = await banco.como(3, 'delete from tarefas where empresa_id <> 3');
    expect(r.affectedRows).toBe(0);
    const total = await banco.admin('select count(*)::int as n from tarefas');
    expect(total.rows[0].n).toBe(15);
  });

  it('apaga tarefa da própria árvore', async () => {
    const r = await banco.como(2, 'delete from tarefas where id in (103, 105)');
    expect(r.affectedRows).toBe(1); // 103 é da Aurora Campo; 105 é da Vértice
  });

  it('sem empresa definida não escreve', async () => {
    await expect(banco.como(null, ...tarefaNova(900, 3))).rejects.toThrow(/row-level security/);
    expect((await banco.como(null, 'delete from tarefas')).affectedRows).toBe(0);
  });
});
