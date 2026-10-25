// AI Service: direct Gemini and OpenRouter, raced with a hedge and an overall deadline
import { getCachedServiceStatus, getServiceStatus, readProxyError, type ServiceStatus } from '../utils/env';

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
  modelUsed?: string;
  responseTime?: number;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelAttempt {
  model: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

// Defaults when the server sets no OPENROUTER_MODELS / GEMINI_MODEL.
// OpenRouter tries these in order inside a single request ("models" fallback routing),
// so a retired model only costs a quick server-side retry instead of a client timeout.
// "openrouter/free" routes to whichever free model is currently available.
const DEFAULT_OPENROUTER_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];
// "-latest" alias keeps pointing at a current Flash model as Google retires versions
const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

const MAX_OUTPUT_TOKENS = 250;
const TEMPERATURE = 0.7;
// Whole answer must arrive within this, no matter how many providers are tried
const TOTAL_DEADLINE_MS = 15000;
// When both providers are configured, start OpenRouter if Gemini has not answered by then
const HEDGE_DELAY_MS = 2500;

const SYSTEM_PROMPT = "You are Lexi, a friendly 3D AI robot assistant who speaks politely, concisely, and with a touch of personality. Keep your responses conversational and not too long, as you're speaking to users through voice. Be helpful, engaging, and show your robotic personality in a charming way.";

interface ProviderCall {
  name: string;
  run: (signal: AbortSignal) => Promise<{ content: string; model: string }>;
}

export class AIService {
  private status: ServiceStatus = getCachedServiceStatus();
  private conversationHistory: ConversationMessage[] = [];
  private modelAttempts: ModelAttempt[] = [];

  // Keys stay on the server; ask it which AI providers are configured
  public async init(): Promise<boolean> {
    this.status = await getServiceStatus();
    return this.isReady();
  }

  public isReady(): boolean {
    return this.status.brain;
  }

  public clearConversationHistory() {
    this.conversationHistory = [];
  }

  public getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  public getModelAttempts(): ModelAttempt[] {
    return [...this.modelAttempts];
  }

  public clearModelAttempts() {
    this.modelAttempts = [];
  }

  // Ask every configured provider, preferring direct Gemini, and return the first good answer
  async askLexi(): Promise<AIResponse> {
    if (!(await this.init())) {
      return {
        content: "I'm having trouble thinking right now—could you repeat that? (AI keys not configured)",
        success: false,
        error: 'AI keys not configured'
      };
    }

    const startTime = Date.now();
    this.modelAttempts = [];

    const messages: ConversationMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
    ];

    const providers: ProviderCall[] = [];
    if (this.status.gemini) {
      const model = this.status.models?.gemini || DEFAULT_GEMINI_MODEL;
      providers.push({ name: `Gemini (${model})`, run: (signal) => this.callGemini(messages, model, signal) });
    }
    if (this.status.openrouter) {
      const models = this.status.models?.openrouter?.length ? this.status.models.openrouter : DEFAULT_OPENROUTER_MODELS;
      providers.push({ name: 'OpenRouter', run: (signal) => this.callOpenRouter(messages, models, signal) });
    }

    const winner = await this.race(providers);
    const totalTime = Date.now() - startTime;

    if (winner) {
      console.log(`✅ Answer from ${winner.model} in ${totalTime}ms`);
      return { content: winner.content, success: true, modelUsed: winner.model, responseTime: totalTime };
    }

    console.error(`❌ All AI providers failed after ${totalTime}ms`, this.modelAttempts);
    return {
      content: "I'm having trouble thinking right now—could you repeat that?",
      success: false,
      error: 'All AI providers failed',
      responseTime: totalTime
    };
  }

  // Starts providers in order: the next one starts when the previous fails or after HEDGE_DELAY_MS.
  // The first success wins and the rest are aborted; everything is cut off at TOTAL_DEADLINE_MS.
  private race(providers: ProviderCall[]): Promise<{ content: string; model: string } | null> {
    return new Promise((resolve) => {
      const controllers: AbortController[] = [];
      const timers: ReturnType<typeof setTimeout>[] = [];
      let started = 0;
      let finished = 0;
      let done = false;

      const settle = (result: { content: string; model: string } | null) => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        controllers.forEach((controller) => controller.abort());
        resolve(result);
      };

      const startNext = () => {
        if (done || started >= providers.length) return;
        const provider = providers[started++];
        const controller = new AbortController();
        controllers.push(controller);
        const attemptStart = Date.now();
        console.log(`🧠 Asking ${provider.name}`);

        provider.run(controller.signal).then(
          (result) => {
            this.modelAttempts.push({ model: result.model, success: true, responseTime: Date.now() - attemptStart });
            settle(result);
          },
          (error: unknown) => {
            if (done) return;
            const message = error instanceof Error && error.name === 'AbortError'
              ? 'Timed out'
              : error instanceof Error ? error.message : String(error);
            this.modelAttempts.push({ model: provider.name, success: false, error: message, responseTime: Date.now() - attemptStart });
            console.warn(`❌ ${provider.name} failed:`, message);
            finished++;
            if (finished === providers.length) settle(null);
            else startNext();
          }
        );

        if (started < providers.length) timers.push(setTimeout(startNext, HEDGE_DELAY_MS));
      };

      timers.push(setTimeout(() => settle(null), TOTAL_DEADLINE_MS));
      if (providers.length === 0) settle(null);
      else startNext();
    });
  }

  private async callOpenRouter(
    messages: ConversationMessage[],
    models: string[],
    signal: AbortSignal
  ): Promise<{ content: string; model: string }> {
    // Server-side proxy adds the OpenRouter key
    const response = await fetch('/api/openrouter/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        models,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`OpenRouter ${await readProxyError(response)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(data.error?.message ?? 'Empty response from OpenRouter');
    }
    return { content, model: data.model ?? 'OpenRouter' };
  }

  private async callGemini(
    messages: ConversationMessage[],
    model: string,
    signal: AbortSignal
  ): Promise<{ content: string; model: string }> {
    const systemMessage = messages.find((message) => message.role === 'system');
    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      }));

    // Server-side proxy adds the Gemini key as a header, never in the URL
    const response = await fetch(`/api/gemini/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
        ...(systemMessage && { system_instruction: { parts: [{ text: systemMessage.content }] } })
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Gemini ${await readProxyError(response)}`);
    }

    const data = await response.json();
    const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts ?? [];
    const content = parts.map((part) => part.text ?? '').join('').trim();
    if (!content) {
      throw new Error('Empty response from Gemini');
    }
    return { content, model: `Gemini (${model})` };
  }

  // Main method to get AI response (backwards compatibility)
  async getAIResponse(userMessage: string): Promise<AIResponse> {
    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Use the new askLexi function
      const response = await this.askLexi();

      if (response.success) {
        // Add AI response to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content
        });

        // Keep conversation history manageable (last 20 messages)
        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
      } else {
        // Remove the user message from history since it failed
        this.conversationHistory.pop();
      }

      return response;

    } catch (error) {
      console.error('AI Service error:', error);
      
      // Remove the user message from history since it failed
      this.conversationHistory.pop();
      
      return {
        content: "I'm having trouble thinking right now—could you repeat that?",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Fallback method for when AI service is not available
  generateFallbackResponse(userInput: string): string {
    const input = userInput.toLowerCase().trim();
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! I'm Lexi, your AI assistant. It's great to meet you! How can I help you today?";
    }
    
    if (input.includes('how are you') || input.includes('how do you do')) {
      return "I'm doing wonderful, thank you for asking! I'm excited to chat with you. What would you like to talk about?";
    }
    
    if (input.includes('what is your name') || input.includes('who are you')) {
      return "I'm Lexi, your friendly AI assistant! I'm here to help you with anything you need. What can I do for you?";
    }
    
    if (input.includes('goodbye') || input.includes('bye') || input.includes('see you')) {
      return "Goodbye! It was wonderful talking with you. Feel free to come back anytime you want to chat!";
    }
    
    if (input.includes('thank you') || input.includes('thanks')) {
      return "You're very welcome! I'm always happy to help. Is there anything else you'd like to know?";
    }
    
    if (input.includes('help') || input.includes('what can you do')) {
      return "I can chat with you about anything! I love having conversations, answering questions, and just being a friendly companion. What would you like to talk about?";
    }
    
    if (input.includes('weather')) {
      return "I'd love to help with weather information, but I don't have access to real-time weather data right now. You might want to check a weather app or website for current conditions!";
    }
    
    if (input.includes('time') || input.includes('what time')) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      return `The current time is ${timeString}. Is there anything else you'd like to know?`;
    }
    
    if (input.includes('date') || input.includes('what date')) {
      const now = new Date();
      const dateString = now.toLocaleDateString();
      return `Today's date is ${dateString}. How can I help you with anything else?`;
    }
    
    // Default responses
    const defaultResponses = [
      "That's really interesting! Tell me more about that.",
      "I'd love to hear more about your thoughts on that topic.",
      "That sounds fascinating! Can you elaborate on that?",
      "I'm learning so much from our conversation! What else would you like to discuss?",
      "You have such interesting perspectives! What made you think about that?",
      "I find that really engaging! Is there more you'd like to share?",
      "That's a great point! I'd love to explore that topic further with you.",
      "You always have such thoughtful things to say! What's on your mind?",
      "I'm really enjoying our chat! What else would you like to talk about?",
      "That's wonderful! I love how you express your ideas. Tell me more!"
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  // Get model statistics for debugging
  getModelStats(): { [key: string]: { attempts: number; successes: number; avgResponseTime: number } } {
    const stats: { [key: string]: { attempts: number; successes: number; avgResponseTime: number } } = {};
    
    this.modelAttempts.forEach(attempt => {
      if (!stats[attempt.model]) {
        stats[attempt.model] = { attempts: 0, successes: 0, avgResponseTime: 0 };
      }
      
      stats[attempt.model].attempts++;
      if (attempt.success) {
        stats[attempt.model].successes++;
      }
      
      if (attempt.responseTime) {
        const currentAvg = stats[attempt.model].avgResponseTime;
        const totalAttempts = stats[attempt.model].attempts;
        stats[attempt.model].avgResponseTime = 
          (currentAvg * (totalAttempts - 1) + attempt.responseTime) / totalAttempts;
      }
    });
    
    return stats;
  }
}

// Export singleton instance
export const aiService = new AIService();