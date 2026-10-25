// /api/browser/* routes for the local browser agent (dev/preview server only).
// These can drive a real browser on this computer, so they only accept requests
// from Lexi itself: same-origin with a custom header that cross-site pages cannot send
// without a CORS preflight (which is never approved).
import { getBrowserTask, startBrowserTask, stopBrowserTask } from './browserAgent';
import type { ServerEnv } from './apiProxy';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function handleBrowserRequest(
  request: Request,
  env: ServerEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/browser/')) return null;

  const origin = request.headers.get('origin');
  if (request.headers.get('x-lexi-client') !== '1' || (origin && origin !== url.origin)) {
    return json(403, { error: 'Forbidden' });
  }
  if (!env.GEMINI_API_KEY) {
    return json(503, { error: 'Browser control needs GEMINI_API_KEY in the server .env' });
  }

  const [, , , resource, id, action] = url.pathname.split('/');
  if (resource !== 'tasks') return json(404, { error: 'Not found' });

  if (!id && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 500) : '';
    if (!goal) return json(400, { error: 'Missing goal' });
    try {
      return json(201, startBrowserTask(goal, env));
    } catch (error) {
      return json(409, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  const task = id ? getBrowserTask(id) : undefined;
  if (!task) return json(404, { error: 'Unknown task' });

  if (!action && request.method === 'GET') return json(200, task);
  if (action === 'stop' && request.method === 'POST') return json(200, { stopped: stopBrowserTask(task.id) });
  return json(405, { error: 'Method not allowed' });
}
