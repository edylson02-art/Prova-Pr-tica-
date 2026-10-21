const UM_DIA = 24 * 60 * 60 * 1000;
const MAX_DIAS = 3650; // trava contra prazo absurdo travar a tela num laço gigante

/**
 * Prazo de atendimento (SLA) de uma tarefa, em dias úteis.
 *
 * O prazo começa a contar no dia seguinte à criação. Dia útil é de segunda a
 * sexta, exceto os feriados recebidos. Prazo de 0 dias é o próprio dia.
 *
 * @param {string}   criadaEm   data de criação, 'YYYY-MM-DD'
 * @param {number}   dias       quantos dias úteis o cliente contratou
 * @param {string[]} feriados   datas 'YYYY-MM-DD' que não contam
 * @returns {string} data do prazo, 'YYYY-MM-DD'
 */
export function prazoSLA(criadaEm, dias, feriados = []) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(criadaEm ?? '');
  // tudo em UTC: o fuso do computador (e o horário de verão) não muda o dia
  let dia = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (Number.isNaN(dia) || isoDe(dia) !== criadaEm) {
    throw new Error(`Data de criação inválida: ${criadaEm}`);
  }
  if (!Number.isInteger(dias) || dias < 0 || dias > MAX_DIAS) {
    throw new RangeError(`Prazo inválido: ${dias} (inteiro de 0 a ${MAX_DIAS})`);
  }

  const naoContam = new Set(feriados.map((f) => String(f).slice(0, 10)));
  let uteis = 0;
  while (uteis < dias) {
    dia += UM_DIA;
    const semana = new Date(dia).getUTCDay(); // 0 = domingo, 6 = sábado
    if (semana !== 0 && semana !== 6 && !naoContam.has(isoDe(dia))) uteis++;
  }
  return isoDe(dia);
}

function isoDe(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}
