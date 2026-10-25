// Server-side API proxy. Third-party API keys live only in server environment
// variables (no VITE_ prefix), so they never reach the browser bundle.
// The browser calls /api/<service>/<path> and this handler adds the key.

export type ServerEnv = Record<string, string | undefined>;

type AuthStyle =
  | { kind: 'header'; name: string; prefix?: string }
  | { kind: 'query'; name: string };

interface ServiceConfig {
  envKey: string;
  baseUrl: string;
  auth: AuthStyle;
  // Only these upstream paths and methods may be reached through the proxy
  routes: { method: 'GET' | 'POST'; path: RegExp }[];
}

const SERVICES: Record<string, ServiceConfig> = {
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1/',
    auth: { kind: 'header', name: 'Authorization', prefix: 'Bearer ' },
    routes: [{ method: 'POST', path: /^chat\/completions$/ }],
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    // Header instead of ?key= so the key never appears in URLs or logs
    auth: { kind: 'header', name: 'x-goog-api-key' },
    routes: [{ method: 'POST', path: /^models\/[\w.-]+:generateContent$/ }],
  },
  deepgram: {
    envKey: 'DEEPGRAM_API_KEY',
    baseUrl: 'https://api.deepgram.com/v1/',
    auth: { kind: 'header', name: 'Authorization', prefix: 'Token ' },
    routes: [{ method: 'POST', path: /^speak$/ }],
  },
  weather: {
    envKey: 'WEATHER_API_KEY',
    baseUrl: 'https://api.openweathermap.org/',
    auth: { kind: 'query', name: 'appid' },
    routes: [
      { method: 'GET', path: /^geo\/1\.0\/direct$/ },
      { method: 'GET', path: /^data\/2\.5\/weather$/ },
    ],
  },
  news: {
    envKey: 'NEWS_API_KEY',
    baseUrl: 'https://newsapi.org/v2/',
    auth: { kind: 'header', name: 'X-Api-Key' },
    routes: [
      { method: 'GET', path: /^everything$/ },
      { method: 'GET', path: /^top-headlines$/ },
    ],
  },
  search: {
    envKey: 'SERPER_API_KEY',
    baseUrl: 'https://google.serper.dev/',
    auth: { kind: 'header', name: 'X-API-KEY' },
    routes: [{ method: 'POST', path: /^search$/ }],
  },
  youtube: {
    envKey: 'YOUTUBE_API_KEY',
    baseUrl: 'https://www.googleapis.com/youtube/v3/',
    auth: { kind: 'query', name: 'key' },
    routes: [
      { method: 'GET', path: /^search$/ },
      { method: 'GET', path: /^videos$/ },
    ],
  },
  huggingface: {
    envKey: 'HUGGINGFACE_TOKEN',
    baseUrl: 'https://api-inference.huggingface.co/',
    auth: { kind: 'header', name: 'Authorization', prefix: 'Bearer ' },
    routes: [{ method: 'POST', path: /^models\/cardiffnlp\/twitter-roberta-base-sentiment-latest$/ }],
  },
};

const MAX_BODY_BYTES = 64 * 1024;

// Query parameter names a client could use to smuggle in its own credentials
const STRIPPED_QUERY_PARAMS = ['key', 'appid', 'apiKey', 'api_key'];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const hasKey = (env: ServerEnv, service: string) => {
  const value = env[SERVICES[service].envKey];
  return !!value && !value.startsWith('your_');
};

export function getServiceStatus(env: ServerEnv) {
  return {
    brain: hasKey(env, 'openrouter') || hasKey(env, 'gemini'),
    openrouter: hasKey(env, 'openrouter'),
    gemini: hasKey(env, 'gemini'),
    tts: hasKey(env, 'deepgram'),
    weather: hasKey(env, 'weather'),
    news: hasKey(env, 'news'),
    search: hasKey(env, 'search'),
    youtube: hasKey(env, 'youtube'),
    sentiment: hasKey(env, 'huggingface'),
  };
}

// Returns null when the request is not an /api/ request, so callers can fall through
export async function handleApiRequest(request: Request, env: ServerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  const [service, ...rest] = url.pathname.slice('/api/'.length).split('/');
  const upstreamPath = rest.join('/');

  if (service === 'status' && rest.length === 0) {
    if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
    return json(200, getServiceStatus(env));
  }

  const config = SERVICES[service];
  if (!config) return json(404, { error: 'Unknown API service' });

  const route = config.routes.find((r) => r.path.test(upstreamPath));
  if (!route) return json(404, { error: 'Endpoint not allowed' });
  if (request.method !== route.method) return json(405, { error: 'Method not allowed' });

  if (!hasKey(env, service)) {
    return json(503, { error: `${service} is not configured on the server (${config.envKey})` });
  }
  const apiKey = env[config.envKey] as string;

  const target = new URL(upstreamPath, config.baseUrl);
  url.searchParams.forEach((value, name) => {
    if (!STRIPPED_QUERY_PARAMS.includes(name)) target.searchParams.append(name, value);
  });

  const headers: Record<string, string> = {};
  if (config.auth.kind === 'header') {
    headers[config.auth.name] = `${config.auth.prefix ?? ''}${apiKey}`;
  } else {
    target.searchParams.set(config.auth.name, apiKey);
  }
  if (service === 'openrouter') {
    headers['HTTP-Referer'] = url.origin;
    headers['X-Title'] = 'Talking Lexi';
  }

  let body: ArrayBuffer | undefined;
  if (route.method === 'POST') {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return json(413, { error: 'Request body too large' });
    headers['Content-Type'] = 'application/json';
  }

  try {
    const upstream = await fetch(target, { method: route.method, headers, body });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`[api] ${service} upstream request failed:`, error);
    return json(502, { error: `Could not reach ${service}` });
  }
}
