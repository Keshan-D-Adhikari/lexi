// Gemini text-to-speech through the server proxy (the key stays on the server).
// Used for Sinhala, which has no built-in browser/Windows voice.
import { readProxyError } from '../utils/env';

// Tried in order; TTS models are often overloaded or renamed
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];
const VOICE = 'Kore';
const ATTEMPT_TIMEOUT_MS = 20000;

// Some TTS models return raw 16-bit PCM ("audio/l16; rate=24000"); wrap it in a WAV header
function pcmToWav(pcm: Uint8Array, sampleRate: number, channels: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

function toAudioBlob(base64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (/l16|pcm/i.test(mimeType)) {
    const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000);
    const channels = Number(/channels=(\d+)/.exec(mimeType)?.[1] ?? 1);
    return pcmToWav(bytes, rate, channels);
  }
  return new Blob([bytes], { type: mimeType || 'audio/wav' });
}

async function synthesizeWith(model: string, text: string): Promise<Blob> {
  const response = await fetch(`/api/gemini/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    }),
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${model}: ${await readProxyError(response)}`);

  const data = await response.json();
  const audio = data.candidates?.[0]?.content?.parts?.find((part: { inlineData?: unknown }) => part.inlineData)?.inlineData;
  if (!audio?.data) throw new Error(`${model}: no audio in response`);
  return toAudioBlob(audio.data, audio.mimeType ?? '');
}

// Returns a ready-to-play audio element for the text
export async function speakWithGemini(text: string): Promise<HTMLAudioElement> {
  const errors: string[] = [];
  for (const model of TTS_MODELS) {
    try {
      const blob = await synthesizeWith(model, text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
      return audio;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Sinhala voice unavailable (${errors.join(' | ')})`);
}

// Text that reads well aloud: no markdown markers, emojis or stage directions like *beep*
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\*[^*\n]{1,40}\*/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
