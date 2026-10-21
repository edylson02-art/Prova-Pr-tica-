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

  it.each([
    ['reset role', "do $$ begin reset role; raise exception 'tarefas=%', (select count(*) from tarefas); end $$"],
    ['set role postgres', 'do $$ begin set role postgres; end $$'],
    ['execute dinâmico', "do $$ begin execute 'set role none'; end $$"],
    ['trocar a empresa', "do $$ begin set app.empresa_id = '1'; end $$"],
    ['com a linguagem explícita', "do language plpgsql $$ begin reset role; end $$"],
  ])('não sai do papel com bloco DO (%s)', async (_, sql) => {
    await expect(banco.como(5, sql)).rejects.toThrow(/permission denied for language plpgsql/);
  });

  it('nem com DO em outra linguagem ou dentro de query_to_xml', async () => {
    await expect(banco.como(5, 'do language sql $$ select 1 $$')).rejects.toThrow(/does not support inline code/);
    await expect(banco.como(5, "select query_to_xml('reset role', true, false, '')")).rejects.toThrow(/not allowed/);
    await expect(banco.como(5, "select query_to_xml('do $x$ begin reset role; end $x$', true, false, '')")).rejects.toThrow(/not allowed/);
  });

  it.each([
    "select pg_advisory_lock(hashtext('empresas_arvore'))",
    "select pg_try_advisory_lock(hashtext('empresas_arvore'))",
    "select pg_advisory_xact_lock(hashtext('empresas_arvore'))",
    'select pg_advisory_lock_shared(1, 2)',
  ])('não segura a trava da árvore: %s', async (sql) => {
    await expect(banco.como(5, sql)).rejects.toThrow(/permission denied for function pg_/);
  });

  it.each([
    ['ler arquivo do servidor', "select pg_read_file('postgresql.conf')", /permission denied/],
    ['COPY para programa', "copy (select 1) to program 'id'", /permission denied/],
    ['criar função', "create function f() returns int language sql as 'select 1'", /permission denied for schema public/],
    ['criar view que pularia as políticas', 'create view v as select * from tarefas', /permission denied for schema public/],
    ['alterar política', 'alter policy tarefas_leitura on tarefas using (true)', /must be owner/],
    ['desligar RLS', 'alter table tarefas disable row level security', /must be owner/],
    ['pegar o papel de superusuário', 'grant postgres to app_user', /permission denied to grant role/],
  ])('não %s', async (_, sql, erro) => {
    await expect(banco.como(5, sql)).rejects.toThrow(erro);
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
