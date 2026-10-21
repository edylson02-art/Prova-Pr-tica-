import { describe, it, expect } from 'vitest';
import vendasReais from '../data/vendas.json';
import { totalDoDia, ticketMedio, formatarBRL } from '../src/relatorio.js';

const venda = (id, valor, criada_em, status = 'paga') => ({ id, valor, status, criada_em });

describe('totalDoDia', () => {
  it('soma só as vendas pagas', () => {
    const vendas = [
      { id: 'A', valor: 100, status: 'paga', criada_em: '2026-10-05T15:00:00Z' },
      { id: 'B', valor: 50, status: 'cancelada', criada_em: '2026-10-05T16:00:00Z' },
    ];
    expect(totalDoDia(vendas, '2026-10-05')).toBe(100);
  });

  it('bate com a conferência do financeiro para 01/10/2026', () => {
    expect(totalDoDia(vendasReais, '2026-10-01')).toBe(3400.5);
    expect(formatarBRL(totalDoDia(vendasReais, '2026-10-01'))).toBe('R$ 3.400,50');
  });

  it.each([
    ['2026-09-30', 1370],
    ['2026-10-02', 3340],
    ['2026-10-03', 510],
    ['2026-10-04', 0],
  ])('fecha os outros dias do arquivo (%s → %d)', (dia, total) => {
    expect(totalDoDia(vendasReais, dia)).toBe(total);
  });

  it('usa o dia de Brasília: 02:59Z ainda é o dia anterior, 03:00Z já é o dia', () => {
    const vendas = [
      venda('A', 10, '2026-10-02T02:59:59Z'), // 01/10 23:59:59 em Brasília
      venda('B', 20, '2026-10-02T03:00:00Z'), // 02/10 00:00:00 em Brasília
      venda('C', 40, '2026-10-01T02:00:00Z'), // 30/09 23:00 em Brasília
    ];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(10);
    expect(totalDoDia(vendas, '2026-10-02')).toBe(20);
    expect(totalDoDia(vendas, '2026-09-30')).toBe(40);
  });

  it('aceita horário com fuso explícito', () => {
    expect(totalDoDia([venda('A', 10, '2026-10-01T23:30:00-03:00')], '2026-10-01')).toBe(10);
  });

  it('conta uma vez a venda que a sincronização repetiu', () => {
    const vendas = [venda('A', 100, '2026-10-01T15:00:00Z'), venda('A', 100, '2026-10-01T15:00:00Z')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(100);
  });

  it('na repetição vale a última ocorrência', () => {
    const pagaDepoisCancelada = [
      venda('A', 100, '2026-10-01T15:00:00Z', 'paga'),
      venda('A', 100, '2026-10-01T15:00:00Z', 'cancelada'),
    ];
    expect(totalDoDia(pagaDepoisCancelada, '2026-10-01')).toBe(0);
    expect(totalDoDia([...pagaDepoisCancelada].reverse(), '2026-10-01')).toBe(100);
  });

  it('não descarta vendas sem id', () => {
    const vendas = [venda(undefined, 10, '2026-10-01T15:00:00Z'), venda(undefined, 20, '2026-10-01T16:00:00Z')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(30);
  });

  it('soma sem erro de ponto flutuante', () => {
    const vendas = [venda('A', 0.1, '2026-10-01T15:00:00Z'), venda('B', 0.2, '2026-10-01T15:00:00Z')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(0.3);
  });

  it('aceita valor vindo como texto', () => {
    expect(totalDoDia([venda('A', '250.50', '2026-10-01T15:00:00Z')], '2026-10-01')).toBe(250.5);
  });

  it('avisa em vez de sumir com venda de data ou valor inválido', () => {
    expect(() => totalDoDia([venda('A', 10, 'ontem')], '2026-10-01')).toThrow(/Venda A: data inválida/);
    expect(() => totalDoDia([venda('B', 'dez', '2026-10-01T15:00:00Z')], '2026-10-01')).toThrow(/Venda B: valor inválido/);
  });

  it.each([null, undefined, '', '  ', true, false, [], {}, -500, '-1', '1.234,56', Infinity])(
    'recusa valor %j em vez de contar como 0 ou 1',
    (valor) => {
      expect(() => totalDoDia([venda('A', valor, '2026-10-01T15:00:00Z')], '2026-10-01')).toThrow(/Venda A: valor inválido/);
    },
  );

  it('aceita valor zero (cortesia)', () => {
    expect(totalDoDia([venda('A', 0, '2026-10-01T15:00:00Z'), venda('B', '0', '2026-10-01T15:00:00Z')], '2026-10-01')).toBe(0);
  });

  it('id 1 e "1" são a mesma venda', () => {
    const vendas = [venda(1, 100, '2026-10-01T15:00:00Z'), venda('1', 100, '2026-10-01T15:00:00Z')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(100);
  });

  it('venda paga com data inválida em outro dia também impede o relatório', () => {
    // sem a data não dá para saber se a venda é deste dia: o total ficaria errado
    const vendas = [venda('A', 100, '2026-10-01T15:00:00Z'), venda('B', 50, 'xx')];
    expect(() => totalDoDia(vendas, '2026-10-01')).toThrow(/Venda B: data inválida/);
  });

  it('venda cancelada com dado ruim não atrapalha', () => {
    const vendas = [venda('A', 100, '2026-10-01T15:00:00Z'), venda('B', null, 'xx', 'cancelada')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(100);
  });
});

describe('ticketMedio', () => {
  it('01/10/2026: R$ 3.400,50 em 5 vendas pagas = R$ 680,10', () => {
    expect(ticketMedio(vendasReais, '2026-10-01')).toBeCloseTo(680.1, 10);
  });

  it('não conta canceladas nem repetidas no divisor', () => {
    const vendas = [
      venda('A', 100, '2026-10-01T15:00:00Z'),
      venda('A', 100, '2026-10-01T15:00:00Z'),
      venda('B', 300, '2026-10-01T16:00:00Z'),
      venda('C', 999, '2026-10-01T17:00:00Z', 'cancelada'),
    ];
    expect(ticketMedio(vendas, '2026-10-01')).toBe(200);
  });

  it('usa o mesmo dia de Brasília do total', () => {
    const vendas = [venda('A', 100, '2026-10-02T01:00:00Z'), venda('B', 300, '2026-10-01T02:00:00Z')];
    expect(ticketMedio(vendas, '2026-10-01')).toBe(100);
  });

  it('dia sem venda paga dá zero', () => {
    expect(ticketMedio([venda('A', 100, '2026-10-01T15:00:00Z', 'cancelada')], '2026-10-01')).toBe(0);
  });
});
