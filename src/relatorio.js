// Os dias do relatório são no horário de Brasília. Usa o fuso pelo nome (e não
// um -3h fixo) para continuar certo se o horário de verão voltar.
const diaEmBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function diaDaVenda(v) {
  const quando = new Date(v.criada_em);
  if (Number.isNaN(quando.getTime())) {
    throw new Error(`Venda ${v.id}: data inválida (${v.criada_em})`);
  }
  return diaEmBrasilia.format(quando); // 'YYYY-MM-DD'
}

// Aceita número ou texto numérico ("250.50", como alguns sistemas exportam).
// Number() sozinho transformaria null, '' e false em 0 e true em 1 sem aviso.
// Venda paga com valor negativo não fecha com o financeiro: estorno é outro
// lançamento, então também é erro.
function centavos(v) {
  const { valor } = v;
  const numero = typeof valor === 'number' ? valor
    : typeof valor === 'string' && valor.trim() !== '' ? Number(valor)
      : NaN;
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`Venda ${v.id}: valor inválido (${JSON.stringify(valor)})`);
  }
  return Math.round(numero * 100);
}

// A sincronização pode repetir a mesma venda. Vale a última ocorrência de cada
// id (o estado mais recente: se veio paga e depois cancelada, está cancelada).
// Venda sem id não tem como ser identificada, então nunca é descartada.
// O id é comparado como texto: 1 e "1" são a mesma venda.
function semRepetidas(vendas) {
  const porId = new Map();
  const semId = [];
  for (const v of vendas) {
    if (v.id == null || v.id === '') semId.push(v);
    else {
      const chave = String(v.id);
      porId.delete(chave); // reinsere no fim, na ordem da última ocorrência
      porId.set(chave, v);
    }
  }
  return [...porId.values(), ...semId];
}

function pagasDoDia(vendas, dia) {
  return semRepetidas(vendas)
    .filter((v) => v.status === 'paga')
    .filter((v) => diaDaVenda(v) === dia);
}

/** Total vendido (só vendas pagas) em um dia 'YYYY-MM-DD'. */
export function totalDoDia(vendas, dia) {
  // soma em centavos para não acumular erro de ponto flutuante
  return pagasDoDia(vendas, dia).reduce((soma, v) => soma + centavos(v), 0) / 100;
}

/** Ticket médio do dia: total vendido ÷ número de vendas pagas. */
export function ticketMedio(vendas, dia) {
  const pagas = pagasDoDia(vendas, dia);
  if (pagas.length === 0) return 0;
  return totalDoDia(vendas, dia) / pagas.length;
}

export function formatarBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
