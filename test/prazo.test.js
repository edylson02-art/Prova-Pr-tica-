import { describe, it, expect } from 'vitest';
import feriados2026 from '../data/feriados-2026.json';
import { prazoSLA } from '../src/prazo.js';

const feriados = feriados2026.map((f) => f.date);

describe('prazoSLA', () => {
  it('o caso do chamado: criada na sexta com 1 dia vence na segunda, não no sábado', () => {
    expect(prazoSLA('2026-10-02', 1, feriados)).toBe('2026-10-05');
  });

  it('começa a contar no dia seguinte à criação', () => {
    expect(prazoSLA('2026-09-29', 1, feriados)).toBe('2026-09-30'); // terça → quarta
  });

  it.each([
    // [criada, dias, prazo, por quê]
    ['2026-10-01', 3, '2026-10-06', 'quinta + 3: sex, seg, ter'],
    ['2026-10-08', 3, '2026-10-14', 'pula o feriado de 12/10 (N. Sra. Aparecida, segunda)'],
    ['2026-10-10', 3, '2026-10-15', 'criada no sábado: conta a partir de segunda, sem o 12/10'],
    ['2026-10-12', 1, '2026-10-13', 'criada no próprio feriado'],
    ['2026-10-30', 1, '2026-11-03', 'sexta antes de Finados (02/11, segunda)'],
    ['2026-11-19', 1, '2026-11-23', 'Consciência Negra (20/11, sexta) + fim de semana'],
    ['2026-12-24', 1, '2026-12-28', 'Natal (25/12, sexta) + fim de semana'],
    ['2026-04-02', 1, '2026-04-06', 'Sexta-feira Santa (03/04)'],
    ['2026-02-13', 1, '2026-02-18', 'Carnaval (16 e 17/02), como a BrasilAPI marca'],
    ['2026-09-01', 10, '2026-09-16', '10 dias úteis pulando a Independência (07/09)'],
  ])('%s + %i dias úteis → %s (%s)', (criada, dias, prazo) => {
    expect(prazoSLA(criada, dias, feriados)).toBe(prazo);
  });

  it('feriado no fim de semana não desconta nada a mais', () => {
    // 15/11/2026 (Proclamação da República) cai no domingo
    expect(prazoSLA('2026-11-13', 1, feriados)).toBe('2026-11-16');
  });

  it('vira o ano usando os feriados do ano seguinte', () => {
    expect(prazoSLA('2026-12-30', 3, [...feriados, '2027-01-01'])).toBe('2027-01-05');
  });

  it('prazo de 0 dias é o próprio dia', () => {
    expect(prazoSLA('2026-10-03', 0, feriados)).toBe('2026-10-03');
  });

  it('sem lista de feriados, conta só os fins de semana', () => {
    expect(prazoSLA('2026-10-09', 1, [])).toBe('2026-10-12');
    expect(prazoSLA('2026-10-09', 1)).toBe('2026-10-12');
  });

  it('aceita feriado com hora no texto', () => {
    expect(prazoSLA('2026-10-09', 1, ['2026-10-12T00:00:00Z'])).toBe('2026-10-13');
  });

  it('não altera a lista de feriados recebida', () => {
    const copia = [...feriados];
    prazoSLA('2026-10-01', 3, feriados);
    expect(feriados).toEqual(copia);
  });

  it.each(['2026-02-30', '03/10/2026', '', undefined, '2026-10-03T10:00:00Z'])(
    'recusa data de criação inválida: %j',
    (data) => {
      expect(() => prazoSLA(data, 1, feriados)).toThrow(/Data de criação inválida/);
    },
  );

  it.each([-1, 1.5, NaN, Infinity, '3', 100000])('recusa prazo inválido: %j', (dias) => {
    expect(() => prazoSLA('2026-10-01', dias, feriados)).toThrow(RangeError);
  });
});

describe('data/feriados-2026.json', () => {
  it('veio da API com os feriados nacionais do ano, em ordem e sem repetição', () => {
    const datas = feriados2026.map((f) => f.date);
    expect(datas.every((d) => d.startsWith('2026-'))).toBe(true);
    expect(datas).toEqual([...new Set(datas)].sort());
    expect(datas).toEqual(expect.arrayContaining(['2026-01-01', '2026-10-12', '2026-11-20', '2026-12-25']));
  });
});
