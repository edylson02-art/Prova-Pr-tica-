import { describe, it, expect } from 'vitest';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { listarTarefas } from '../src/tarefas.js';

// Grupo Aurora (1) ── Aurora Serviços (2) ── Aurora Campo (4)
//                 └── Vértice Finanças (3)
// Outra Empresa S.A. (5), fora do grupo
const listar = (empresaId, de = '2026-09-01', ate = '2026-10-31', dados = { tarefas, empresas }) =>
  listarTarefas({ ...dados, empresaId, de, ate }).map((t) => t.id);

describe('listarTarefas', () => {
  it('lista as tarefas da Vértice Finanças em setembro', () => {
    const r = listarTarefas({ tarefas, empresas, empresaId: 3, de: '2026-09-01', ate: '2026-09-30' });
    expect(r.map((t) => t.id)).toEqual([105, 106]);
  });

  describe('árvore de empresas', () => {
    it('Grupo Aurora vê as tarefas de todo o grupo, sem a Outra Empresa', () => {
      expect(listar(1)).toEqual([101, 102, 103, 104, 105, 106, 108, 109, 110, 112, 113, 114, 115]);
    });

    it('Aurora Serviços vê as próprias tarefas e as da Aurora Campo', () => {
      expect(listar(2)).toEqual([101, 102, 103, 104, 108, 109, 112, 113, 115]);
    });

    it('Aurora Campo vê só as próprias (não sobe na árvore)', () => {
      expect(listar(4)).toEqual([103, 104, 109, 113]);
    });

    it('Outra Empresa vê só as próprias, e o grupo não a vê', () => {
      expect(listar(5)).toEqual([107, 111]);
      for (const id of [1, 2, 3, 4]) expect(listar(id)).not.toContain(107);
    });

    it('empresa que não existe não vê nada', () => {
      expect(listar(99)).toEqual([]);
    });

    it('desce mais de um nível', () => {
      const dados = {
        empresas: [...empresas, { id: 6, nome: 'Neta', pai_id: 4 }],
        tarefas: [...tarefas, { id: 200, empresa_id: 6, titulo: 'x', status: 'aberta', criada_em: '2026-09-10' }],
      };
      expect(listar(1, undefined, undefined, dados)).toContain(200);
      expect(listar(2, undefined, undefined, dados)).toContain(200);
      expect(listar(3, undefined, undefined, dados)).not.toContain(200);
    });

    it('não trava se os dados da árvore tiverem ciclo', () => {
      const comCiclo = empresas.map((e) => (e.id === 1 ? { ...e, pai_id: 4 } : e)); // 1 → 2 → 4 → 1
      expect(listar(2, undefined, undefined, { tarefas, empresas: comCiclo })).toHaveLength(13);
    });
  });

  describe('período', () => {
    it('inclui a tarefa criada no primeiro dia do filtro', () => {
      expect(listar(2, '2026-09-01', '2026-09-05')).toEqual([101, 102]);
    });

    it('inclui a tarefa criada no último dia do filtro', () => {
      expect(listar(2, '2026-09-25', '2026-09-30')).toEqual([108]);
    });

    it('período de um dia só (de = até)', () => {
      expect(listar(1, '2026-10-01', '2026-10-01')).toEqual([109, 110]);
    });

    it('de depois de até não traz nada', () => {
      expect(listar(1, '2026-10-31', '2026-09-01')).toEqual([]);
    });

    it('data apagada no filtro vira "sem limite"', () => {
      expect(listar(3, '', '2026-09-30')).toEqual([105, 106]);
      expect(listar(3, '2026-10-01', '')).toEqual([110, 114]);
      expect(listar(3, '', '')).toEqual([105, 106, 110, 114]);
    });
  });

  it('ordena pela data e, no mesmo dia, pelo id', () => {
    const embaralhadas = [...tarefas].reverse();
    expect(listar(1, '2026-09-15', '2026-09-15', { tarefas: embaralhadas, empresas })).toEqual([104, 105]);
  });

  it('não altera a lista recebida', () => {
    const copia = structuredClone(tarefas);
    listar(1);
    expect(tarefas).toEqual(copia);
  });
});
