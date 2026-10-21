const SEPARADOR = ';'; // padrão do Excel em português
const BOM = '﻿'; // sem ele o Excel lê o arquivo como ANSI e estraga os acentos

// O Excel executa como fórmula um campo que começa com estes caracteres, mesmo
// entre aspas ("=SOMA(...)", "=HYPERLINK(...)"). O apóstrofo na frente faz o
// campo ser lido como texto.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** 'YYYY-MM-DD' (ou ISO com hora) → 'DD/MM/AAAA'. Sem passar por Date, para
 *  o fuso do computador não mudar o dia. */
function dataBR(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : valor;
}

function campo(valor) {
  let texto = String(valor ?? '');
  if (INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  // separador, aspas ou quebra de linha no meio do texto: entre aspas, com as
  // aspas internas dobradas, para o campo continuar numa coluna só
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/** Gera o CSV das tarefas para o financeiro abrir no Excel. */
export function gerarCSV(tarefas) {
  const linhas = tarefas.map((t) =>
    [t.id, t.titulo, t.status, dataBR(t.criada_em)].map(campo).join(SEPARADOR));
  return BOM + ['id;titulo;status;criada_em', ...linhas].join('\n');
}

/** Baixa no navegador o CSV das tarefas recebidas. */
export function baixarCSV(tarefas, nomeArquivo = 'tarefas.csv') {
  const arquivo = new Blob([gerarCSV(tarefas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  // libera a memória depois que o navegador já começou o download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
