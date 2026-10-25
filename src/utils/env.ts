// API keys live on the server (see server/apiProxy.ts). The browser only learns
// which services are configured, never the keys themselves.
export interface ServiceStatus {
  // Server-side model overrides (null = use the client defaults)
  models?: { openrouter: string[] | null; gemini: string[] | null };
  brain: boolean;
  openrouter: boolean;
  gemini: boolean;
  tts: boolean;
  weather: boolean;
  news: boolean;
  search: boolean;
  youtube: boolean;
  sentiment: boolean;
}

const NONE_CONFIGURED: ServiceStatus = {
  brain: false,
  openrouter: false,
  gemini: false,
  tts: false,
  weather: false,
  news: false,
  search: false,
  youtube: false,
  sentiment: false,
};

let cachedStatus: ServiceStatus | null = null;
let pendingStatus: Promise<ServiceStatus> | null = null;

export function getServiceStatus(): Promise<ServiceStatus> {
  if (cachedStatus) return Promise.resolve(cachedStatus);
  if (!pendingStatus) {
    pendingStatus = fetch('/api/status')
      .then((response) => (response.ok ? response.json() : NONE_CONFIGURED))
      .catch(() => NONE_CONFIGURED)
      .then((status: ServiceStatus) => {
        cachedStatus = status;
        return status;
      });
  }
  return pendingStatus;
}

// Synchronous read for render code; false until getServiceStatus() has resolved
export function getCachedServiceStatus(): ServiceStatus {
  return cachedStatus ?? NONE_CONFIGURED;
}

// Turns a proxy "not configured" response into a readable message
export async function readProxyError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) return `${response.status}: ${data.error}`;
  } catch {
    // Upstream returned a non-JSON body
  }
  return `${response.status} ${response.statusText}`;
}
