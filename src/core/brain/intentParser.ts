// Rule-based intent detection for plugin commands.
// Anything that is not clearly a plugin command returns null and goes to the
// AI chat, so there is no extra (slow, paid) AI round-trip just to classify.

export type Intent =
  | { plugin: 'weather'; parameters: { location: string | null }; confidence: number }
  | { plugin: 'news'; parameters: { topic: string }; confidence: number }
  | { plugin: 'search'; parameters: { query: string }; confidence: number }
  | { plugin: 'youtube'; parameters: { query: string }; confidence: number }
  | { plugin: 'browser'; parameters: { goal: string }; confidence: number };

// "hey lexi, can you please ..." -> "..."
const POLITE_PREFIX = /^(?:(?:hey|hi|ok|okay)\s+)?(?:lexi[,\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?/;
const TRAILING_FILLER = /\s+(?:please|for me|right now|now|today|tonight|tomorrow)$/;
const TIME_WORDS = /^(?:today|tomorrow|tonight|now|right now|this week|this weekend|the week|the weekend)$/;

// Requests to act in the browser; the whole sentence is passed on as the goal
const BROWSER_PATTERNS = [
  /^(?:open|go to|goto|visit|browse to|navigate to|launch)\s+\S/,
  /\b(?:in|on|using|with|use)\s+(?:the\s+|my\s+)?(?:browser|chrome)\b/,
  /^(?:browser|browse)\s+\S/,
];

const YOUTUBE_PATTERNS = [
  /^(?:play|watch|show me|find|search(?: for)?)\s+(.+?)\s+(?:on|from)\s+youtube$/,
  /^(?:youtube|search youtube for|search youtube|youtube search(?: for)?)\s+(.+)$/,
  /^(?:play|show me|find|search for)\s+(?:some\s+)?(.+?)\s+videos?$/,
];

const SEARCH_PATTERNS = [
  /^(?:search(?:\s+(?:the web|the internet|online|google))?(?:\s+for)?|look up|google|web search(?:\s+for)?)\s+(.+)$/,
];

// Weather word followed (anywhere later) by "in/at/for <place>"
const WEATHER_WITH_PLACE = /\b(?:weather|temperature|forecast|raining|rain|snowing|sunny|humid|hot|cold)\b.*?\b(?:in|at|for)\s+(.+)$/;
// Weather question without a place: "what's the weather like", "forecast today"
const WEATHER_NO_PLACE = /^(?:(?:what(?:'s| is)|how(?:'s| is)|tell me|show me|get|check)\s+)?(?:the\s+)?(?:weather|forecast|temperature)(?:\s+(?:like|outside|forecast|report))*$/;

const NEWS_PATTERNS = [
  /^(?:(?:what(?:'s| is| are)|show me|tell me|give me|get|read me|any)\s+)?(?:the\s+)?(?:(?:latest|top|today's|recent|breaking|current)\s+)?(?:news|headlines)(?:\s+(?:about|on|for|regarding)\s+(.+))?$/,
  /\b(?:news|headlines)\s+(?:about|on|regarding)\s+(.+)$/,
  /^what(?:'s| is) happening in the (?:news|world)$/,
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[?.!]+$/, '')
    .replace(POLITE_PREFIX, '')
    .trim();
}

function cleanSubject(value: string | undefined): string {
  return (value ?? '').replace(TRAILING_FILLER, '').replace(/^(?:the|a|an)\s+/, '').trim();
}

function firstMatch(patterns: RegExp[], text: string): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

export class IntentParser {
  async parseIntent(userInput: string): Promise<Intent | null> {
    const text = normalize(userInput);
    if (!text) return null;

    // Explicit browser actions first: "open youtube and play lofi" should drive the browser
    if (BROWSER_PATTERNS.some((pattern) => pattern.test(text))) {
      return { plugin: 'browser', parameters: { goal: userInput.trim() }, confidence: 0.9 };
    }

    // YouTube before search so "search for cats on youtube" goes to YouTube
    const youtube = firstMatch(YOUTUBE_PATTERNS, text);
    if (youtube && cleanSubject(youtube[1])) {
      return { plugin: 'youtube', parameters: { query: cleanSubject(youtube[1]) }, confidence: 0.9 };
    }

    const search = firstMatch(SEARCH_PATTERNS, text);
    if (search && cleanSubject(search[1])) {
      return { plugin: 'search', parameters: { query: cleanSubject(search[1]) }, confidence: 0.9 };
    }

    const weather = text.match(WEATHER_WITH_PLACE);
    if (weather) {
      const place = cleanSubject(weather[1]);
      return {
        plugin: 'weather',
        parameters: { location: place && !TIME_WORDS.test(place) ? place : null },
        confidence: 0.9,
      };
    }
    if (WEATHER_NO_PLACE.test(text.replace(TRAILING_FILLER, ''))) {
      return { plugin: 'weather', parameters: { location: null }, confidence: 0.8 };
    }

    const news = firstMatch(NEWS_PATTERNS, text);
    if (news) {
      return { plugin: 'news', parameters: { topic: cleanSubject(news[1]) || 'general' }, confidence: 0.9 };
    }

    return null;
  }
}

export const intentParser = new IntentParser();
