export type EmotionLabel = 'positive' | 'neutral' | 'concerned';

import { getServiceStatus } from '../utils/env';

// Hugging Face Inference API - Free tier: 1000 requests/month
// Called through the server-side proxy, which adds HUGGINGFACE_TOKEN
const HUGGINGFACE_API_URL = '/api/huggingface/models/cardiffnlp/twitter-roberta-base-sentiment-latest';

interface HuggingFaceResponse {
  label: 'positive' | 'neutral' | 'negative';
  score: number;
}

export async function analyzeSentimentAPI(text: string): Promise<EmotionLabel> {
  try {
    // Check if token is available
    if (!(await getServiceStatus()).sentiment) {
      return analyzeSentimentSimple(text);
    }

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true, // Wait for model to load if needed
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json() as HuggingFaceResponse[][];
    
    // Handle nested array structure
    const sentimentArray = result[0]; // Get the first (and only) array
    
    // Find the result with the highest score
    let sentiment = sentimentArray[0];
    for (let i = 1; i < sentimentArray.length; i++) {
      if (sentimentArray[i].score > sentiment.score) {
        sentiment = sentimentArray[i];
      }
    }

    // Map Hugging Face labels to our emotions
    let emotion: EmotionLabel;
    
    switch (sentiment.label) {
      case 'positive':
        emotion = 'positive';
        break;
      case 'negative':
        emotion = 'concerned';
        break;
      case 'neutral':
      default:
        emotion = 'neutral';
        break;
    }

    return emotion;

  } catch (error) {
    // Fallback to simple rules if API fails
    return analyzeSentimentSimple(text);
  }
}

// Fallback simple sentiment analysis
function analyzeSentimentSimple(text: string): EmotionLabel {
  const positiveWords = ['happy', 'great', 'amazing', 'wonderful', 'excellent', 'love', 'like', 'good', 'fantastic', 'awesome', 'joy', 'excited', 'pleased', 'delighted', 'thrilled', 'cheerful', 'glad', 'content', 'satisfied', 'positive'];
  const negativeWords = ['sad', 'terrible', 'awful', 'hate', 'bad', 'worried', 'concerned', 'angry', 'frustrated', 'disappointed', 'upset', 'mad', 'annoyed', 'depressed', 'miserable', 'negative', 'unhappy', 'displeased'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  console.log('🎨 Simple sentiment analysis:', { text, positiveCount, negativeCount });
  
  if (positiveCount > negativeCount) {
    console.log('🎨 Simple analysis result: positive');
    return 'positive';
  }
  if (negativeCount > positiveCount) {
    console.log('🎨 Simple analysis result: concerned');
    return 'concerned';
  }
  console.log('🎨 Simple analysis result: neutral');
  return 'neutral';
}
