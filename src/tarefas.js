/**
 * Empresa escolhida e todas as que estão abaixo dela na árvore.
 * O Set de visitadas evita laço infinito se os dados tiverem ciclo.
 */
function empresaEAbaixo(empresas, empresaId) {
  if (!empresas.some((e) => e.id === empresaId)) return new Set();

  const ids = new Set([empresaId]);
  const fila = [empresaId];
  while (fila.length > 0) {
    const atual = fila.shift();
    for (const e of empresas) {
      if (e.pai_id === atual && !ids.has(e.id)) {
        ids.add(e.id);
        fila.push(e.id);
      }
    }
  }
  return ids;
}

/**
 * Lista as tarefas que a pessoa vê quando escolhe uma empresa no seletor:
 * as da empresa e as de todas as empresas abaixo dela.
 *
 * @param {object}   p
 * @param {Array}    p.tarefas   lista de tarefas (data/tarefas.json)
 * @param {Array}    p.empresas  lista de empresas (data/empresas.json)
 * @param {number}   p.empresaId empresa escolhida no seletor
 * @param {string}   p.de        data inicial, 'YYYY-MM-DD', inclusive (vazia = sem limite)
 * @param {string}   p.ate       data final, 'YYYY-MM-DD', inclusive (vazia = sem limite)
 * @returns {Array} tarefas ordenadas pela data de criação (empate: pelo id)
 */
export function listarTarefas({ tarefas, empresas, empresaId, de, ate }) {
  const visiveis = empresaEAbaixo(empresas, empresaId);
  return tarefas
    .filter((t) => visiveis.has(t.empresa_id))
    .filter((t) => (!de || t.criada_em >= de) && (!ate || t.criada_em <= ate))
    .sort((a, b) => a.criada_em.localeCompare(b.criada_em) || a.id - b.id);
}
