import { PluginResult } from '../brain';

// Browser control runs on the local Lexi server (server/browserAgent.ts), which drives
// a real Chrome window. Progress is broadcast as a window event so the voice bar can show it.
export interface BrowserTaskState {
  id: string;
  goal: string;
  status: 'running' | 'done' | 'error' | 'stopped' | 'needs_confirmation';
  steps: { action: string; detail: string }[];
  answer?: string;
  error?: string;
  url?: string;
}

export const BROWSER_PROGRESS_EVENT = 'lexi-browser-progress';

const HEADERS = { 'Content-Type': 'application/json', 'X-Lexi-Client': '1' };
const POLL_MS = 1500;
const MAX_WAIT_MS = 6 * 60 * 1000;

const publish = (task: BrowserTaskState | null) =>
  window.dispatchEvent(new CustomEvent<BrowserTaskState | null>(BROWSER_PROGRESS_EVENT, { detail: task }));

export async function stopBrowserTask(id: string): Promise<void> {
  await fetch(`/api/browser/tasks/${id}/stop`, { method: 'POST', headers: HEADERS }).catch(() => undefined);
}

export const browserPlugin = {
  async execute(parameters: { goal: string }): Promise<PluginResult> {
    const start = await fetch('/api/browser/tasks', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ goal: parameters.goal }),
    }).catch(() => null);

    if (!start || !start.ok) {
      const data = start ? await start.json().catch(() => ({})) : {};
      const summary = start?.status === 404 || start?.status === 403
        ? 'Browser control only works when Lexi is running locally on your computer.'
        : `I couldn't start the browser: ${data.error ?? 'the server did not respond'}.`;
      return { success: false, type: 'browser', summary };
    }

    let task: BrowserTaskState = await start.json();
    publish(task);
    const deadline = Date.now() + MAX_WAIT_MS;

    try {
      while (task.status === 'running' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const response = await fetch(`/api/browser/tasks/${task.id}`, { headers: HEADERS });
        if (!response.ok) break;
        task = await response.json();
        publish(task);
      }
    } finally {
      publish(null);
    }

    switch (task.status) {
      case 'done':
        return { success: true, type: 'browser', data: task, summary: task.answer || 'Done.' };
      case 'needs_confirmation':
        return { success: true, type: 'browser', data: task, summary: task.answer ?? 'This step needs your confirmation.' };
      case 'stopped':
        return { success: true, type: 'browser', data: task, summary: 'Okay, I stopped the browser task.' };
      case 'running':
        await stopBrowserTask(task.id);
        return { success: false, type: 'browser', summary: 'The browser task took too long, so I stopped it.' };
      default:
        return { success: false, type: 'browser', summary: `I couldn't finish that in the browser: ${task.error ?? 'unknown error'}.` };
    }
  },
};
