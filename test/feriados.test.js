import { describe, it, expect, vi } from 'vitest';
import { validarAno, feriadosNacionais, baixarFeriados } from '../src/feriados.js';

// Resposta no formato da BrasilAPI (amostra, não é a fonte dos dados do app)
const respostaValida = (ano = 2026) => [
  ['01-01', 'Confraternização mundial'], ['02-16', 'Carnaval'], ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do trabalho'], ['09-07', 'Independência do Brasil'], ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['12-25', 'Natal'],
].map(([md, name]) => ({ date: `${ano}-${md}`, name, type: 'national' })).reverse();

describe('validarAno', () => {
  it('aceita 4 dígitos', () => {
    expect(validarAno('2026')).toBe(2026);
  });

  it.each(['../../etc', '2026/../x', '20261', '26', '', undefined, '2026 ', '1899', '2200'])(
    'recusa %j (vai na URL e no nome do arquivo)',
    (ano) => {
      expect(() => validarAno(ano)).toThrow();
    },
  );
});

describe('feriadosNacionais', () => {
  it('devolve só os nacionais, em ordem de data e sem repetição', () => {
    const resposta = [
      ...respostaValida(),
      { date: '2026-01-01', name: 'Confraternização mundial', type: 'national' },
      { date: '2026-01-20', name: 'Feriado municipal', type: 'municipal' },
    ];
    const r = feriadosNacionais(resposta, 2026);
    expect(r).toHaveLength(9);
    expect(r[0]).toEqual({ date: '2026-01-01', name: 'Confraternização mundial' });
    expect(r.map((f) => f.date)).toEqual([...r.map((f) => f.date)].sort());
  });

  it('recusa resposta que não é lista', () => {
    expect(() => feriadosNacionais({ message: 'erro' }, 2026)).toThrow(/não é uma lista/);
  });

  it('recusa lista vazia ou incompleta, em vez de gravar um arquivo que faria feriado contar como dia útil', () => {
    expect(() => feriadosNacionais([], 2026)).toThrow(/só 0 feriados/);
    expect(() => feriadosNacionais(respostaValida().slice(0, 5), 2026)).toThrow(/só 5 feriados/);
  });

  it('recusa feriado de outro ano ou com data inválida', () => {
    expect(() => feriadosNacionais(respostaValida(2025), 2026)).toThrow(/data inválida/);
    const ruim = [...respostaValida(), { date: '2026-13-45', name: 'x', type: 'national' }];
    expect(() => feriadosNacionais(ruim, 2026)).toThrow(/data inválida/);
  });

  it('recusa feriado sem nome', () => {
    const ruim = [...respostaValida(), { date: '2026-06-01', name: ' ', type: 'national' }];
    expect(() => feriadosNacionais(ruim, 2026)).toThrow(/sem nome/);
  });
});

describe('baixarFeriados', () => {
  it('chama a BrasilAPI do ano com limite de tempo', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => respostaValida() }));
    const r = await baixarFeriados(2026, { fetch });
    expect(fetch).toHaveBeenCalledWith('https://brasilapi.com.br/api/feriados/v1/2026', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
    expect(r).toHaveLength(9);
  });

  it('erro HTTP da API vira erro, não arquivo vazio', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 503 }));
    await expect(baixarFeriados(2026, { fetch })).rejects.toThrow(/respondeu 503/);
  });

  it('não chama a API com ano inválido', async () => {
    const fetch = vi.fn();
    await expect(baixarFeriados('../x', { fetch })).rejects.toThrow(/Ano inválido/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
