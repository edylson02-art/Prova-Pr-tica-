import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../src/App.jsx';

describe('botão Exportar CSV', () => {
  it('aparece na tela', () => {
    expect(renderToStaticMarkup(<App />)).toMatch(/<button[^>]*>Exportar CSV<\/button>/);
  });
});
