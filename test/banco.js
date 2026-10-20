// Banco em memória preparado do mesmo jeito que scripts/db.js, para os testes.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function criarBanco() {
  const db = new PGlite();
  await db.exec(ler('sql/schema.sql'));

  for (const e of JSON.parse(ler('data/empresas.json'))) {
    await db.query('insert into empresas values ($1, $2, $3)', [e.id, e.nome, e.pai_id]);
  }
  for (const t of JSON.parse(ler('data/tarefas.json'))) {
    await db.query('insert into tarefas values ($1, $2, $3, $4, $5)',
      [t.id, t.empresa_id, t.titulo, t.status, t.criada_em]);
  }

  await db.exec(`
    create role app_user;
    grant select, insert, update, delete on all tables in schema public to app_user;
    grant execute on all functions in schema public to app_user;
  `);

  return {
    /** Consulta como administrador (dono do banco). */
    admin: (sql, params) => db.query(sql, params),

    /** Consulta como uma pessoa logada na empresa, igual ao scripts/db.js. */
    async como(empresaId, sql, params) {
      await db.exec(`
        select set_config('app.empresa_id', '${Number(empresaId)}', false);
        set role app_user;
      `);
      try {
        return await db.query(sql, params);
      } finally {
        await db.exec('reset role');
      }
    },
  };
}
