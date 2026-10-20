import { describe, it, expect, beforeEach } from 'vitest';
import { criarBanco } from './banco.js';

const paiDe = async (banco, id) =>
  (await banco.admin('select pai_id from empresas where id = $1', [id])).rows[0].pai_id;

describe('árvore de empresas', () => {
  let banco;
  beforeEach(async () => {
    banco = await criarBanco();
  }, 30_000);

  it('pessoa logada não consegue pendurar o Grupo Aurora embaixo da própria empresa', async () => {
    const r = await banco.como(5, 'update empresas set pai_id = 5 where id = 1');
    expect(r.affectedRows).toBe(0);
    expect(await paiDe(banco, 1)).toBeNull();
  });

  it('pessoa logada não altera nem a própria empresa', async () => {
    const r = await banco.como(4, 'update empresas set pai_id = 1 where id = 4');
    expect(r.affectedRows).toBe(0);
    expect(await paiDe(banco, 4)).toBe(2);
  });

  it('pessoa logada não cria empresa', async () => {
    await expect(
      banco.como(5, "insert into empresas values (6, 'Falsa', 1)"),
    ).rejects.toThrow(/row-level security/);
  });

  it('pessoa logada não apaga empresa', async () => {
    const r = await banco.como(1, 'delete from empresas where id = 5');
    expect(r.affectedRows).toBe(0);
  });

  it('nem o administrador cria ciclo na árvore', async () => {
    // 1 → 2 → 4: colocar o 1 embaixo do 4 fecharia o ciclo
    await expect(
      banco.admin('update empresas set pai_id = 4 where id = 1'),
    ).rejects.toThrow(/abaixo de si mesma/);
    expect(await paiDe(banco, 1)).toBeNull();
  });

  it('empresa não pode ser mãe de si mesma', async () => {
    await expect(
      banco.admin('update empresas set pai_id = 5 where id = 5'),
    ).rejects.toThrow(/abaixo de si mesma/);
    await expect(
      banco.admin("insert into empresas values (7, 'Auto', 7)"),
    ).rejects.toThrow();
  });

  it('o administrador continua podendo reorganizar a árvore sem ciclo', async () => {
    await banco.admin('update empresas set pai_id = 1 where id = 4');
    expect(await paiDe(banco, 4)).toBe(1);
    await banco.admin("insert into empresas values (6, 'Nova filha', 3)");
    expect(await paiDe(banco, 6)).toBe(3);
  });
});
