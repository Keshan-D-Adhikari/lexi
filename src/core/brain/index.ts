import { intentParser } from './intentParser';
import { weatherPlugin } from '../plugins/weather';
import { newsPlugin } from '../plugins/news';
import { searchPlugin } from '../plugins/search';
import { youtubePlugin } from '../plugins/youtube';

export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
  type: 'weather' | 'news' | 'search' | 'youtube' | 'general';
  summary: string;
}

export interface BrainResponse {
  pluginUsed: string | null;
  result: PluginResult;
  shouldSpeak: boolean;
  shouldShowCard: boolean;
}

export class LexiBrain {
  private plugins = {
    weather: weatherPlugin,
    news: newsPlugin,
    search: searchPlugin,
    youtube: youtubePlugin,
  };

  async processUserInput(userInput: string): Promise<BrainResponse> {
    try {
      // Parse intent from user input
      const intent = await intentParser.parseIntent(userInput);
      
      if (!intent) {
        return {
          pluginUsed: null,
          result: {
            success: false,
            type: 'general',
            summary: 'I didn\'t understand that. Could you try rephrasing?',
          },
          shouldSpeak: true,
          shouldShowCard: false,
        };
      }

      // Route to the matching plugin (the switch keeps each plugin's parameters typed)
      let result: PluginResult;
      switch (intent.plugin) {
        case 'weather':
          result = await this.plugins.weather.execute(intent.parameters);
          break;
        case 'news':
          result = await this.plugins.news.execute(intent.parameters);
          break;
        case 'search':
          result = await this.plugins.search.execute(intent.parameters);
          break;
        case 'youtube':
          result = await this.plugins.youtube.execute(intent.parameters);
          break;
      }
      
      return {
        pluginUsed: intent.plugin,
        result,
        shouldSpeak: true,
        shouldShowCard: result.success,
      };
    } catch (error) {
      console.error('Brain processing error:', error);
      return {
        pluginUsed: null,
        result: {
          success: false,
          type: 'general',
          summary: 'I encountered an error processing your request. Please try again.',
        },
        shouldSpeak: true,
        shouldShowCard: false,
      };
    }
  }
}

export const lexiBrain = new LexiBrain();
