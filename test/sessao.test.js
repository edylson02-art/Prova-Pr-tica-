import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco } from './banco.js';

// Ataques que cabem numa única consulta, como a que o `npm run db` aceita.
describe('sessão da pessoa logada', () => {
  let banco;
  beforeAll(async () => {
    banco = await criarBanco();
  }, 30_000);

  it('não volta a ser superusuário com set_config(role)', async () => {
    await expect(
      banco.como(5, "select set_config('role', 'none', false)"),
    ).rejects.toThrow(/permission denied for function set_config/);
  });

  it('não lê o banco todo voltando a superusuário no meio da consulta', async () => {
    const escalada = `
      select (select set_config('role', 'none', false)) as papel,
             query_to_xml('select id from tarefas', true, false, '') as tarefas`;
    await expect(banco.como(5, escalada)).rejects.toThrow(/permission denied for function set_config/);
  });

  it('não troca a própria empresa com set_config(app.empresa_id)', async () => {
    const troca = `
      select t.id
        from (select set_config('app.empresa_id', '1', false)) s,
             lateral (select id from tarefas) t`;
    await expect(banco.como(3, troca)).rejects.toThrow(/permission denied for function set_config/);
  });

  it('nem pelo nome sem esquema ou com outro valor de is_local', async () => {
    await expect(banco.como(3, "select set_config('app.empresa_id', '1', true)")).rejects.toThrow(/permission denied/);
    await expect(banco.como(3, "select pg_catalog.set_config('role', 'none', true)")).rejects.toThrow(/permission denied/);
  });

  it('o servidor continua gravando a empresa e a pessoa continua lendo o que é dela', async () => {
    const r = await banco.como(3, 'select id from tarefas order by id');
    expect(r.rows.map((l) => l.id)).toEqual([105, 106, 110, 114]);
    const s = await banco.como(3, "select current_setting('app.empresa_id') as empresa, current_user as papel");
    expect(s.rows[0]).toEqual({ empresa: '3', papel: 'app_user' });
  });

  it('query_to_xml sem escalada continua sujeito às políticas', async () => {
    const r = await banco.como(5, "select query_to_xml('select id from tarefas', true, false, '')::text as x");
    const ids = [...r.rows[0].x.matchAll(/<id>(\d+)<\/id>/g)].map((m) => Number(m[1]));
    expect(ids).toEqual([107, 111]);
  });
});
