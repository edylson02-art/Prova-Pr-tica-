// Feriados nacionais da BrasilAPI (https://brasilapi.com.br/docs#tag/Feriados-Nacionais):
// pública, gratuita, sem chave e mantida no Brasil. Aceita anos de 1900 a 2199.
const API = 'https://brasilapi.com.br/api/feriados/v1';
const MINIMO = 8; // o país tem pelo menos 8 feriados nacionais de data fixa

/** Valida o ano vindo da linha de comando. Ele vira parte da URL e do nome do
 *  arquivo, então só passa um número de 4 dígitos (nada de "../../"). */
export function validarAno(texto) {
  if (!/^\d{4}$/.test(String(texto ?? ''))) {
    throw new Error(`Ano inválido: "${texto}". Use 4 dígitos, ex.: npm run feriados -- 2026`);
  }
  const ano = Number(texto);
  if (ano < 1900 || ano > 2199) throw new Error(`Ano fora do que a API aceita (1900 a 2199): ${ano}`);
  return ano;
}

/** Confere a resposta da API e devolve só os feriados nacionais do ano, sem
 *  repetição e em ordem. Resposta estranha vira erro: um arquivo vazio ou
 *  incompleto faria feriado contar como dia útil sem ninguém perceber. */
export function feriadosNacionais(resposta, ano) {
  if (!Array.isArray(resposta)) throw new Error('Resposta da API não é uma lista de feriados');

  const porData = new Map();
  for (const f of resposta) {
    if (f?.type !== 'national') continue;
    const { date, name } = f;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || Number.isNaN(Date.parse(date)) || !date.startsWith(`${ano}-`)) {
      throw new Error(`Feriado com data inválida para ${ano}: ${JSON.stringify(f)}`);
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`Feriado sem nome: ${JSON.stringify(f)}`);
    }
    porData.set(date, { date, name: name.trim() });
  }

  if (porData.size < MINIMO) {
    throw new Error(`A API devolveu só ${porData.size} feriados nacionais para ${ano} (esperado ao menos ${MINIMO})`);
  }
  return [...porData.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Baixa e confere os feriados nacionais do ano. */
export async function baixarFeriados(ano, { fetch = globalThis.fetch, timeoutMs = 10_000 } = {}) {
  const resposta = await fetch(`${API}/${validarAno(ano)}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  if (!resposta.ok) throw new Error(`BrasilAPI respondeu ${resposta.status} para ${ano}`);
  return feriadosNacionais(await resposta.json(), ano);
}
