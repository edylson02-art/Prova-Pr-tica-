import { useState } from 'react';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { prazoSLA } from './prazo.js';
import { listarTarefas } from './tarefas.js';

const SLA_DIAS_UTEIS = 3;

// Todos os data/feriados-<ano>.json baixados com `npm run feriados -- <ano>`:
// um ano novo entra na conta sem mudar código.
const arquivosDeFeriados = import.meta.glob('../data/feriados-*.json', { eager: true, import: 'default' });
const feriados = Object.values(arquivosDeFeriados).flat().map((f) => f.date);
const anosComFeriados = new Set(feriados.map((d) => d.slice(0, 4)));

function Prazo({ criadaEm }) {
  const prazo = prazoSLA(criadaEm, SLA_DIAS_UTEIS, feriados);
  const faltando = [criadaEm, prazo].map((d) => d.slice(0, 4)).filter((ano) => !anosComFeriados.has(ano));
  if (faltando.length === 0) return prazo;
  // sem o arquivo do ano, feriados contariam como dia útil: avisa em vez de esconder
  const aviso = `Feriados de ${[...new Set(faltando)].join(' e ')} não baixados (npm run feriados -- ${faltando[0]})`;
  return <span title={aviso}>{prazo} ⚠</span>;
}

export function App() {
  const [empresaId, setEmpresaId] = useState(1);
  const [de, setDe] = useState('2026-09-01');
  const [ate, setAte] = useState('2026-10-31');

  const lista = listarTarefas({ tarefas, empresas, empresaId, de, ate });

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <h1>Tarefas</h1>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={empresaId} onChange={(e) => setEmpresaId(Number(e.target.value))}>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <label>De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label>Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
      </div>
      {lista.length === 0 ? (
        <p>Nenhuma tarefa no período.</p>
      ) : (
        <table width="100%" cellPadding={6}>
          <thead>
            <tr>
              <th align="left">Data</th><th align="left">Tarefa</th><th align="left">Status</th>
              <th align="left" title={`${SLA_DIAS_UTEIS} dias úteis, sem feriados nacionais`}>Prazo</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr key={t.id}>
                <td>{t.criada_em}</td><td>{t.titulo}</td><td>{t.status}</td>
                <td><Prazo criadaEm={t.criada_em} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
