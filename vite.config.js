import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O servidor de desenvolvimento abre arquivos no editor com
// GET /__open-in-editor?file=... Qualquer site aberto no navegador consegue
// disparar esse pedido (uma <img> basta, o CORS não impede GET). O navegador
// marca cada pedido com Sec-Fetch-Site, que uma página não consegue forjar:
// só passa o que vem da própria página (o "abrir no editor" do erro na tela).
export const editorSoDaPropriaPagina = {
  name: 'editor-so-da-propria-pagina',
  configureServer(server) {
    server.middlewares.use('/__open-in-editor', (req, res, next) => {
      if (req.headers['sec-fetch-site'] === 'same-origin') return next();
      res.statusCode = 403;
      res.end('Forbidden');
    });
  },
};

export default defineConfig({ plugins: [react(), editorSoDaPropriaPagina] });
