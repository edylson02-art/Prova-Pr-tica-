import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../src/App.jsx';

describe('tela de tarefas', () => {
  it('abre com o Grupo Aurora mostrando as tarefas do grupo', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain('Nenhuma tarefa no período');
    expect(html).toContain('Revisar proposta do cliente Almeida'); // 101, criada no 1º dia do filtro
    expect(html).toContain('Visita técnica'); // 103, da Aurora Campo (neta do grupo)
    expect(html).not.toContain('Planejamento trimestral'); // 107, da Outra Empresa
    expect(html.match(/<tr>/g)).toHaveLength(1 + 13); // cabeçalho + 13 tarefas
  });
});
