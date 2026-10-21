// Baixa os feriados nacionais do ano e salva em data/feriados-<ano>.json.
// Uso: npm run feriados -- 2026
import { renameSync, writeFileSync } from 'node:fs';
import { baixarFeriados, validarAno } from '../src/feriados.js';

try {
  const ano = validarAno(process.argv[2]);
  const feriados = await baixarFeriados(ano);

  // grava num temporário e renomeia: se algo falhar no meio, o arquivo antigo fica intacto
  const destino = new URL(`../data/feriados-${ano}.json`, import.meta.url);
  const temporario = new URL(`../data/feriados-${ano}.json.tmp`, import.meta.url);
  writeFileSync(temporario, JSON.stringify(feriados, null, 2) + '\n');
  renameSync(temporario, destino);

  console.log(`${feriados.length} feriados nacionais de ${ano} salvos em data/feriados-${ano}.json`);
  for (const f of feriados) console.log(`  ${f.date}  ${f.name}`);
} catch (erro) {
  console.error(`Não foi possível baixar os feriados: ${erro.message}`);
  process.exit(1);
}
