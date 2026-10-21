import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/relatorio.js', import.meta.url));
const rodar = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

describe('npm run relatorio', () => {
  it('mostra o relatório de 01/10/2026 que o financeiro conferiu', () => {
    const r = rodar('2026-10-01');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Total vendido: R$ 3.400,50');
    expect(r.stdout).toContain('Ticket médio:  R$ 680,10');
  });

  it.each([[], ['01/10/2026'], ['2026-13-45'], ['2026-02-30'], ['2026-1-1'], ['amanhã']])(
    'recusa dia inválido %j em vez de mostrar R$ 0,00',
    (...args) => {
      const r = rodar(...args.flat());
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('Informe o dia');
      expect(r.stdout).not.toContain('R$');
    },
  );
});
