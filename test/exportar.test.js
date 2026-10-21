import { describe, it, expect, vi, afterEach } from 'vitest';
import tarefas from '../data/tarefas.json';
import { gerarCSV, baixarCSV } from '../src/exportar.js';

const BOM = '﻿';
const tarefa = (titulo, extra = {}) => ({ id: 1, titulo, status: 'aberta', criada_em: '2026-10-03', ...extra });

// Leitor de CSV como o Excel em português: separador ';', aspas delimitam o
// campo e "" dentro de aspas é uma aspa. Serve para conferir as colunas.
function lerComoExcel(csv) {
  const linhas = [];
  let linha = [], valor = '', aspas = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (aspas) {
      if (c === '"' && csv[i + 1] === '"') { valor += '"'; i++; }
      else if (c === '"') aspas = false;
      else valor += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') { linha.push(valor); valor = ''; }
    else if (c === '\n') { linha.push(valor); linhas.push(linha); linha = []; valor = ''; }
    else valor += c;
  }
  linha.push(valor);
  linhas.push(linha);
  return linhas;
}
const semBOM = (csv) => csv.replace(/^﻿/, '');

describe('gerarCSV', () => {
  it('começa com o BOM do UTF-8, para o Excel ler os acentos', () => {
    expect(gerarCSV(tarefas).startsWith(BOM)).toBe(true);
  });

  it('primeira linha é o cabeçalho com ;', () => {
    expect(semBOM(gerarCSV(tarefas)).split('\n')[0]).toBe('id;titulo;status;criada_em');
  });

  it('data no formato DD/MM/AAAA', () => {
    expect(semBOM(gerarCSV([tarefa('x', { criada_em: '2026-10-03' })])).split('\n')[1]).toBe('1;x;aberta;03/10/2026');
  });

  it('data não muda de dia por causa do fuso', () => {
    const csv = gerarCSV([tarefa('x', { criada_em: '2026-10-01T00:30:00Z' })]);
    expect(lerComoExcel(semBOM(csv))[1][3]).toBe('01/10/2026');
  });

  it('mantém os acentos', () => {
    const csv = gerarCSV(tarefas.filter((t) => t.id === 103));
    expect(csv).toContain('Visita técnica — Rua das Flores, 42');
  });

  it('cada tarefa do arquivo de dados fica com 4 colunas e o título intacto', () => {
    const linhas = lerComoExcel(semBOM(gerarCSV(tarefas)));
    expect(linhas).toHaveLength(1 + tarefas.length);
    tarefas.forEach((t, i) => {
      const [id, titulo, status, data] = linhas[i + 1];
      expect(linhas[i + 1]).toHaveLength(4);
      expect(id).toBe(String(t.id));
      expect(titulo.replace(/^'/, '')).toBe(t.titulo);
      expect(status).toBe(t.status);
      expect(data).toBe(t.criada_em.split('-').reverse().join('/'));
    });
  });

  it.each([
    ['ponto e vírgula e aspas', 'Treinamento "Vendas 2026"; turma 1'],
    ['vírgula', 'Visita técnica — Rua das Flores, 42'],
    ['quebra de linha', 'linha 1\nlinha 2'],
    ['quebra de linha do Windows', 'linha 1\r\nlinha 2'],
    ['só aspas', '"""'],
    ['texto vazio', ''],
  ])('título com %s continua numa coluna só', (_, titulo) => {
    const linhas = lerComoExcel(semBOM(gerarCSV([tarefa(titulo)])));
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toEqual(['1', titulo, 'aberta', '03/10/2026']);
  });

  it.each(['=SOMA(despesas) conferir na auditoria', '+5', '-5', '@SOMA(A1)', '\t=1+1', '=HYPERLINK("http://x";"clique")'])(
    'título que o Excel executaria como fórmula vira texto: %j',
    (titulo) => {
      const [, linha] = lerComoExcel(semBOM(gerarCSV([tarefa(titulo)])));
      expect(linha[1]).toBe(`'${titulo}`);
      expect(linha).toHaveLength(4);
    },
  );

  it('neutraliza fórmula em qualquer campo, não só no título', () => {
    const [, linha] = lerComoExcel(semBOM(gerarCSV([tarefa('ok', { status: '=1+1' })])));
    expect(linha[2]).toBe("'=1+1");
  });

  it('a tarefa 114 do arquivo de dados não vira fórmula', () => {
    expect(gerarCSV(tarefas)).toContain("\n114;'=SOMA(despesas) conferir na auditoria;aberta;08/10/2026");
  });

  it('lista vazia gera só o cabeçalho', () => {
    expect(gerarCSV([])).toBe(`${BOM}id;titulo;status;criada_em`);
  });

  it('campo ausente vira vazio, não "undefined"', () => {
    expect(semBOM(gerarCSV([{ id: 7 }])).split('\n')[1]).toBe('7;;;');
  });
});

describe('baixarCSV', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('baixa um arquivo UTF-8 com BOM, com o nome pedido, e libera a memória', async () => {
    vi.useFakeTimers();
    const link = { click: vi.fn() };
    vi.stubGlobal('document', { createElement: vi.fn(() => link) });
    let arquivo;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { arquivo = blob; return 'blob:teste'; });
    const revogar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    baixarCSV(tarefas.slice(0, 2), 'tarefas.csv');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(link).toMatchObject({ href: 'blob:teste', download: 'tarefas.csv' });
    expect(link.click).toHaveBeenCalledOnce();
    expect(arquivo.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM gravado no arquivo
    expect(new TextDecoder().decode(bytes)).toBe(semBOM(gerarCSV(tarefas.slice(0, 2))));

    expect(revogar).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revogar).toHaveBeenCalledWith('blob:teste');
  });
});
