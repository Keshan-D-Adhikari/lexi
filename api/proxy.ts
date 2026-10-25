// Vercel serverless entry point. vercel.json rewrites every /api/* request here.
import { handleApiRequest } from '../server/apiProxy';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  // The rewrite passes the original path as ?path=..., rebuild the original URL from it
  const url = new URL(request.url);
  const originalPath = url.searchParams.get('path');
  if (originalPath !== null) {
    url.searchParams.delete('path');
    url.pathname = `/api/${originalPath}`;
  }

  const response = await handleApiRequest(new Request(url, request), process.env);
  return response ?? new Response('Not found', { status: 404 });
}
