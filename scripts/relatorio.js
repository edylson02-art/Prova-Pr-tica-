// Uso: npm run relatorio -- 2026-10-01
import { readFileSync } from 'node:fs';
import { totalDoDia, ticketMedio, formatarBRL } from '../src/relatorio.js';

// formato AAAA-MM-DD e dia que existe no calendário (recusa 2026-13-45 e 2026-02-30)
function diaValido(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto ?? '')) return false;
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

const dia = process.argv[2];
if (!diaValido(dia)) {
  console.error('Informe o dia: npm run relatorio -- 2026-10-01');
  process.exit(1);
}

const vendas = JSON.parse(readFileSync(new URL('../data/vendas.json', import.meta.url)));

try {
  const total = totalDoDia(vendas, dia);
  const ticket = ticketMedio(vendas, dia);
  console.log(`Relatório de vendas — ${dia}`);
  console.log(`Total vendido: ${formatarBRL(total)}`);
  console.log(`Ticket médio:  ${formatarBRL(ticket)}`);
} catch (erro) {
  // dado ruim da sincronização: sem relatório, em vez de um número errado
  console.error(`Não foi possível gerar o relatório: ${erro.message}`);
  process.exit(1);
}
