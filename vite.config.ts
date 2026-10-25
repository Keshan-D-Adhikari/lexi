import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest, type ServerEnv } from './server/apiProxy';

// Serves /api/* from the same handler the production serverless function uses,
// so API keys stay on the server in development too.
function apiProxy(env: ServerEnv): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;

      const request = new Request(new URL(req.url, `http://${req.headers.host ?? 'localhost'}`), {
        method: req.method,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      });
      const response = await handleApiRequest(request, env);
      if (!response) return next();

      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  };

  return {
    name: 'lexi-api-proxy',
    configureServer: (server) => { server.middlewares.use(middleware); },
    configurePreviewServer: (server) => { server.middlewares.use(middleware); },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix loads every variable, including the server-only (non-VITE_) keys
  const env = loadEnv(mode, process.cwd(), '');

  const exposedSecrets = Object.keys(env).filter(
    (name) => name.startsWith('VITE_') && /(KEY|TOKEN|SECRET)/.test(name)
  );
  if (exposedSecrets.length) {
    console.warn(
      `\n⚠️  These variables are bundled into the browser and would leak: ${exposedSecrets.join(', ')}\n` +
      '   Rename them without the VITE_ prefix (see env.example).\n'
    );
  }

  return {
    plugins: [react(), apiProxy(env)],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
