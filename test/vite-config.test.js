import { describe, it, expect, vi } from 'vitest';
import { editorSoDaPropriaPagina } from '../vite.config.js';

// Monta o filtro como o Vite monta e devolve o que ele faz com um pedido.
function pedir(headers) {
  let caminho, filtro;
  editorSoDaPropriaPagina.configureServer({
    middlewares: { use: (c, f) => { caminho = c; filtro = f; } },
  });
  const res = { statusCode: 200, end: vi.fn() };
  const next = vi.fn();
  filtro({ headers }, res, next);
  return { caminho, status: res.statusCode, passou: next.mock.calls.length === 1 };
}

describe('servidor de desenvolvimento: /__open-in-editor', () => {
  it('protege o caminho certo', () => {
    expect(pedir({}).caminho).toBe('/__open-in-editor');
  });

  it.each([
    ['site de fora (<img> ou fetch)', { 'sec-fetch-site': 'cross-site' }],
    ['subdomínio', { 'sec-fetch-site': 'same-site' }],
    ['URL digitada ou link externo', { 'sec-fetch-site': 'none' }],
    ['pedido sem o cabeçalho', {}],
  ])('recusa %s', (_, headers) => {
    expect(pedir(headers)).toMatchObject({ status: 403, passou: false });
  });

  it('deixa passar o pedido da própria página', () => {
    expect(pedir({ 'sec-fetch-site': 'same-origin' })).toMatchObject({ status: 200, passou: true });
  });
});
