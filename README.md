# 🤖 Talking Lexi

<div align="center">

**A production-ready 3D AI Assistant with voice interaction, AR capabilities, and intelligent plugin system**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.158.0-000000?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?logo=vite)](https://vitejs.dev/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Plugin System](#-plugin-system)
- [Visual Features](#-visual-features)
- [AI Models](#-ai-models)
- [Browser Support](#-browser-support)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Talking Lexi** is an immersive 3D AI assistant that combines cutting-edge web technologies to deliver a natural voice-interactive experience. Built with React, Three.js, and Web Speech API, Lexi features:

- **3D Visualization**: Interactive 3D robot character with smooth animations
- **Voice Interaction**: Real-time speech recognition and natural text-to-speech
- **Lip-Sync Animation**: Real-time mouth movement synchronized with audio
- **Emotion System**: Dynamic face color changes based on conversation context
- **AR Mode**: Live webcam integration with 3D robot overlay
- **Intelligent Plugins**: Weather, news, web search, and YouTube integration
- **Multi-Model AI**: Robust fallback system with multiple AI models
- **Modern UI**: Dark/light theme support with responsive design

---

## ✨ Features

### Core Capabilities

- 🎤 **Voice Input**: Real-time speech recognition using Web Speech API
- 🔊 **Voice Output**: Natural text-to-speech with multiple fallback strategies
- 🤖 **3D Robot**: Interactive 3D character with animations and state indicators
- 👄 **Mouth Sync**: Real-time mouth movement synchronized with audio levels
- 🎨 **Emotion-Based Colors**: Dynamic face color changes based on emotional state
- 📹 **AR Mode**: Live webcam integration with 3D robot overlay
- 🎨 **Modern UI**: Dark/light theme support with smooth transitions
- 📱 **Responsive**: Optimized for desktop and mobile devices
- ⚡ **Performance**: Optimized 60fps 3D rendering

### AI & Intelligence

- 🧠 **Multi-Model AI**: Intelligent fallback system with DeepSeek V3.1, Mistral, Gemini, Llama, and Qwen
- 🔄 **Automatic Fallback**: Seamless switching between models for 99.9% uptime
- ⚡ **Fast Responses**: Primary model typically responds in <2 seconds
- 📊 **Debug Panel**: Real-time model performance monitoring

### Plugin System

- 🌤️ **Weather Plugin**: Real-time weather information via OpenWeatherMap
- 📰 **News Plugin**: Latest headlines and articles via NewsAPI
- 🔍 **Web Search**: Google-like web searches via Serper.dev
- 📺 **YouTube**: Video discovery and playback via YouTube Data API

### Visual Features

- 👄 **Mouth Movement**: Real-time lip-sync using audio analysis and morph targets
- 🎨 **Face Color Changes**: Dynamic emissive colors that reflect emotional states
- ✨ **Smooth Animations**: Breathing effects, state transitions, and idle animations

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- Modern web browser with Web Speech API support
- (Optional) API keys for AI and plugins (see [Configuration](#-configuration))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys (see [Configuration](#-configuration) for details).

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Click "🚀 Click to Start Lexi" to initialize audio
   - If no AI key is configured on the server, Lexi runs in basic mode
   - Start talking with Lexi!

### Build for Production

```bash
npm run build
npm run preview
```

---

## ⚙️ Configuration

### Required API Keys

#### AI Brain (Required for conversations)

- **OpenRouter API Key** (Primary)
  - Get your free key: [OpenRouter.ai](https://openrouter.ai/keys)
  - Enables access to multiple AI models with fallback

- **Gemini API Key** (Optional, for direct Gemini access)
  - Generate from: [Google AI Studio](https://aistudio.google.com/app/apikey)
  - Provides direct Gemini access before OpenRouter fallback

### Optional Plugin API Keys

Each plugin is optional and requires its own API key:

| Plugin | Service | Free Tier | Get API Key |
|--------|---------|-----------|-------------|
| 🌤️ Weather | OpenWeatherMap | ✅ Yes | [openweathermap.org/api](https://openweathermap.org/api) |
| 📰 News | NewsAPI | ✅ Yes | [newsapi.org](https://newsapi.org/) |
| 🔍 Search | Serper.dev | ✅ Yes | [serper.dev](https://serper.dev/) |
| 📺 YouTube | YouTube Data API | ✅ Yes | [developers.google.com/youtube/v3](https://developers.google.com/youtube/v3) |

### Environment Variables

Create a `.env` file in the project root:

```env
# Required for AI conversations
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: Direct Gemini access
GEMINI_API_KEY=your_gemini_key_here

# Optional: Voice and sentiment
DEEPGRAM_API_KEY=your_deepgram_key_here
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Optional: Plugin APIs (add as needed)
WEATHER_API_KEY=your_openweathermap_key_here
NEWS_API_KEY=your_newsapi_key_here
SERPER_API_KEY=your_serper_key_here
YOUTUBE_API_KEY=your_youtube_key_here
```

> **Security**: API keys are server-side only. Do **not** prefix them with `VITE_`, which would bundle them into the browser JavaScript. The browser calls `/api/<service>/...` and the proxy in `server/apiProxy.ts` adds the key. In development the Vite dev server runs this proxy; on Vercel, `api/proxy.ts` runs it (add the keys under Project Settings → Environment Variables). Restart the dev server after changing `.env`.

---

## 📖 Usage Guide

### Basic Interaction

1. **Initialize Lexi**
   - Click the "🚀 Click to Start Lexi" button
   - Grant microphone permissions when prompted

2. **Start a Conversation**
   - Click the microphone button
   - Speak your question or command
   - Lexi will respond with voice and animations

3. **View Conversation History**
   - Click the "Chat" button in the header
   - View your conversation log
   - Toggle visibility as needed

### 3D Mode

- **Rotate**: Click and drag to rotate the 3D scene
- **Zoom**: Scroll to zoom in/out
- **Interact**: Watch Lexi animate during conversations
- **Visual Feedback**: 
  - Observe mouth movement synchronized with speech
  - Notice face color changes based on emotional state (positive/neutral/concerned)
  - Watch breathing animations during idle and listening states

### AR Mode

1. **Switch to AR**
   - Click the "3D" button in the header to switch to "AR" mode
   - Grant webcam permissions when prompted

2. **Experience AR**
   - The 3D robot appears overlaid on your live webcam feed
   - Use the same controls as 3D mode (drag to rotate, scroll to zoom)

3. **Return to 3D**
   - Click "✕ Close AR" to return to regular 3D mode

### Holographic Mode

- Click "Holographic" in the navigation to experience a holographic-style visualization
- Features enhanced visual effects and particle systems

### Example Conversations

#### Weather Plugin
```
👤 "What's the weather in Tokyo?"
🤖 "It's 22°C and partly cloudy in Tokyo, Japan. Humidity is 65% and wind speed is 3.2 m/s."
📊 Displays weather card with temperature, conditions, and forecast
```

#### News Plugin
```
👤 "Show me latest AI news"
🤖 "Here are the top 5 AI news articles: [headlines]"
📊 Displays article cards with thumbnails and links
```

#### Search Plugin
```
👤 "Search for React best practices"
🤖 "I found 10 results for 'React best practices'. Here are the top results: [summaries]"
📊 Displays search result cards with snippets and links
```

#### YouTube Plugin
```
👤 "Play machine learning tutorials on YouTube"
🤖 "I found 10 YouTube videos for 'machine learning tutorials'. Here's the top result: [video title]"
📊 Displays video cards with thumbnails and watch links
```

---

## 🏗️ Architecture

### System Overview

Talking Lexi follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (React Components: Scene, Robot, VoiceControls, etc.)  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Context Layer                           │
│  (Theme, Conversation, Voice State, Plugin Context)     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Service Layer                           │
│  (AI Service, Speech Service, Plugin System)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Core Layer                              │
│  (Brain: Intent Parser, Plugins: Weather, News, etc.)    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              External APIs                               │
│  (OpenRouter, Gemini, OpenWeatherMap, NewsAPI, etc.)     │
└─────────────────────────────────────────────────────────┘
```

### Key Components

- **React Context**: Manages global state (theme, conversation, voice, plugins)
- **Service Layer**: Handles business logic (AI, speech, audio)
- **Core Brain**: Intent parsing and plugin routing
- **Plugin System**: Modular, extensible plugin architecture
- **3D Rendering**: Three.js with React Three Fiber for 3D graphics

---

## 🛠️ Tech Stack

### Frontend Framework
- **React 18.3.1** - Modern React with hooks and context
- **TypeScript 5.5.3** - Full type safety
- **Vite 5.4.2** - Fast development and building

### 3D Graphics
- **Three.js 0.158.0** - 3D graphics engine
- **@react-three/fiber 8.15.19** - React renderer for Three.js
- **@react-three/drei 9.88.13** - Useful helpers and abstractions
- **@react-three/postprocessing 2.16.0** - Post-processing effects

### Voice Technology
- **Web Speech API** - Browser-native speech recognition and synthesis
- **AudioContext API** - Browser audio management

### Styling & UI
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Framer Motion 11.18.2** - Animation library
- **Lucide React 0.344.0** - Icon library

### State Management
- **React Context API** - Global state management
- **Custom Hooks** - Reusable logic (speech, plugins, audio)

### Build Tools
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **TypeScript** - Type checking

---

## 📁 Project Structure

```
project/
├── public/
│   ├── robot.glb              # 3D robot model
│   └── robggot.glb            # Alternative robot model
├── src/
│   ├── components/            # React components
│   │   ├── 3d/                # 3D-specific components
│   │   │   ├── HolographicCard.tsx
│   │   │   ├── HolographicScene.tsx
│   │   │   └── ParticleField.tsx
│   │   ├── ui/                # UI components
│   │   │   └── HolographicOverlay.tsx
│   │   ├── ARScene.tsx        # AR mode component
│   │   ├── Robot.tsx          # 3D robot model component
│   │   ├── Scene.tsx          # 3D scene setup
│   │   ├── VoiceControls.tsx  # Voice interaction UI
│   │   ├── ConversationLog.tsx # Chat history
│   │   ├── PluginCard.tsx     # Plugin result display
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   ├── ThemeContext.tsx   # Theme management
│   │   ├── ConversationContext.tsx # Chat state
│   │   ├── VoiceStateContext.tsx # Voice state
│   │   └── PluginContext.tsx # Plugin state
│   ├── core/                  # Core business logic
│   │   ├── brain/             # Intent parsing and routing
│   │   │   ├── index.ts       # Main brain controller
│   │   │   └── intentParser.ts # Intent detection
│   │   └── plugins/           # Plugin implementations
│   │       ├── weather.ts     # Weather plugin
│   │       ├── news.ts        # News plugin
│   │       ├── search.ts      # Search plugin
│   │       └── youtube.ts     # YouTube plugin
│   ├── hooks/                 # Custom React hooks
│   │   ├── useSpeechRecognition.ts # Speech input
│   │   ├── useTextToSpeech.ts # Speech output
│   │   ├── usePlugins.ts      # Plugin system hook
│   │   └── ...
│   ├── services/              # Business logic services
│   │   ├── aiService.ts       # AI service with multi-model fallback
│   │   ├── speechService.ts   # Speech recognition
│   │   └── ...
│   ├── utils/                 # Utility functions
│   │   └── env.ts             # Environment configuration
│   ├── App.tsx                # Main application component
│   └── main.tsx               # Application entry point
├── .env                       # Environment variables (create from env.example)
├── env.example                # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── README.md                  # This file
```

---

## 🔌 Plugin System

### Architecture

The plugin system uses an intent-based routing architecture:

1. **Intent Detection**: User input is analyzed to detect intent
2. **Plugin Routing**: Routes to the appropriate plugin based on intent
3. **Data Fetching**: Plugin fetches real-time data from external APIs
4. **Response Generation**: Lexi speaks a summary and displays rich data cards
5. **Fallback**: If no plugin matches, falls back to general AI conversation

### Available Plugins

#### Weather Plugin
- **Service**: OpenWeatherMap API
- **Capabilities**: Current weather, forecasts, location-based queries
- **Example**: "What's the weather in New York?"

#### News Plugin
- **Service**: NewsAPI
- **Capabilities**: Latest headlines, category-based news, search
- **Example**: "Show me latest tech news"

#### Search Plugin
- **Service**: Serper.dev (Google Search API)
- **Capabilities**: Web search, result summaries, link extraction
- **Example**: "Search for AI conferences 2025"

#### YouTube Plugin
- **Service**: YouTube Data API
- **Capabilities**: Video search, metadata, watch links
- **Example**: "Play funny cat videos on YouTube"

### Creating Custom Plugins

To create a new plugin:

1. Create a plugin file in `src/core/plugins/`
2. Implement the plugin interface:
   ```typescript
   export const myPlugin = {
     name: 'my-plugin',
     execute: async (params: any) => {
       // Plugin logic here
       return {
         success: true,
         type: 'my-plugin',
         summary: 'Plugin response',
         data: { /* plugin data */ }
       };
     }
   };
   ```
3. Register in `src/core/brain/index.ts`
4. Add intent patterns in `src/core/brain/intentParser.ts`

---

## 🎨 Visual Features

### Mouth Movement (Lip-Sync)

Lexi features advanced mouth movement synchronization that makes conversations feel natural and lifelike.

#### How It Works

- **Real-Time Audio Analysis**: Uses Web Audio API (`AnalyserNode`) to analyze speech audio in real-time
- **Morph Target Animation**: Controls mouth shape using 3D morph targets on the mouth mesh
- **Audio-Level Sync**: Mouth opening directly correlates with audio volume (0-1 normalized levels)
- **Smooth Transitions**: Applies smoothing algorithms to prevent jittery movements

#### Behavior

- **While Speaking**: 
  - Mouth opens and closes in sync with actual audio levels
  - Falls back to animated sine wave pattern if audio analysis unavailable
  - Maintains natural speech rhythm
  
- **When Not Speaking**:
  - Mouth smoothly closes to neutral position
  - Gradual fade-out prevents abrupt transitions

#### Technical Implementation

```typescript
// Audio analysis provides normalized levels (0-1)
currentAudioLevel: number // Real-time audio volume

// Morph target controls mouth shape
mouthMorphRef.current = currentAudioLevel // Direct sync
// OR
mouthMorphRef.current = Math.abs(Math.sin(time * 8)) * 0.5 + 0.3 // Fallback animation
```

### Face Color Changes (Emotion System)

Lexi's face dynamically changes color based on emotional state, providing visual feedback about the conversation context.

#### Emotion States

| Emotion | Description | Face Color | Eye Color | Use Case |
|---------|-------------|------------|-----------|----------|
| **Positive** | Optimistic, happy | Teal/Cyan (`#4FD3C4`) | Soft Mint (`#F7F7F7`) | Successful responses, friendly interactions |
| **Neutral** | Balanced, calm | Deep Navy (`#1E2430`) | Cool Blue (`#7AE2CF`) | Default state, normal conversations |
| **Concerned** | Empathetic, alert | Warm Coral (`#E5735C`) | Pale Amber (`#7AE2CF`) | Errors, warnings, empathetic responses |

#### Visual Effects

- **Emissive Materials**: Uses Three.js emissive materials for glowing effects
- **Dynamic Intensities**: Different glow intensities per emotion:
  - **Positive**: Higher intensity (1.5-1.8) for vibrant, energetic feel
  - **Neutral**: Moderate intensity (1.1-1.4) for balanced appearance
  - **Concerned**: Medium intensity (1.2-1.5) for gentle alertness

#### Affected Components

- **Face Background**: Main face panel color
- **Eyes**: Eye glow color and intensity
- **Mouth**: Mouth accent color
- **Body**: Subtle body accent (lower intensity)

#### Color Transitions

- **Smooth Updates**: Colors update only when emotion changes (not every frame)
- **Performance Optimized**: Prevents unnecessary material updates
- **Visual Feedback**: Provides immediate visual context about conversation state

#### Example Scenarios

```
User: "What's the weather today?"
→ Emotion: Neutral (blue tones)
→ Lexi responds with weather data

User: "Thank you so much!"
→ Emotion: Positive (teal/cyan tones)
→ Lexi's face glows warmly

User: "I'm having an error"
→ Emotion: Concerned (coral/orange tones)
→ Lexi shows empathetic concern
```

### Animation States

Lexi's animations adapt to different interaction states:

- **Idle**: Gentle breathing animation (subtle up/down movement)
- **Listening**: Breathing continues while waiting for input
- **Speaking**: Static position (only mouth moves for lip-sync)
- **Processing**: Breathing animation while thinking/processing

---

## 🧠 AI Models

### Multi-Model Fallback System

Lexi uses a sophisticated multi-model fallback system for maximum reliability:

#### Fallback Chain

1. **Primary**: Gemini 1.5 Pro (Direct) - if Gemini API key is configured
2. **OpenRouter Models** (in order):
   - Llama 3.3 70B (Free tier)
   - Qwen 3 14B (Free tier)
   - DeepSeek V3.1 (Free tier)
   - Mistral Small 3.2 24B (Free tier)
   - Gemini 2.0 Flash (Free tier)

#### Features

- **Automatic Fallback**: If one model fails, automatically tries the next
- **Timeout Protection**: 3-8 second timeout per model prevents hanging
- **Performance Tracking**: Real-time model performance monitoring
- **99.9% Uptime**: Multiple models ensure responses even if some are down

#### Model Configuration

Models are configured in `src/services/aiService.ts` with:
- Timeout settings
- Max tokens
- Temperature
- Model identifiers

---

## 🌐 Browser Support

### Desktop Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 80+ | ✅ Full support |
| Edge | 80+ | ✅ Full support |
| Firefox | 75+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |

### Mobile Browsers

| Platform | Browser | Status |
|----------|---------|--------|
| iOS | Safari 14+ | ✅ Full support |
| Android | Chrome 80+ | ✅ Full support |

### Required Features

- Web Speech API (Speech Recognition & Synthesis)
- WebGL (for 3D rendering)
- MediaDevices API (for AR mode)
- ES6+ JavaScript support

---

## 🔧 Troubleshooting

### Common Issues

#### Voice Recognition Not Working

**Problem**: Microphone button doesn't respond or recognition fails.

**Solutions**:
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Edge recommended)
- Try refreshing the page and re-initializing
- Check browser console for errors

#### AI Responses Not Working

**Problem**: Lexi doesn't respond or shows "AI keys not configured".

**Solutions**:
- Verify API keys are set in the server `.env` (without the `VITE_` prefix)
- Check API key validity
- Ensure internet connection is active
- Check browser console for API errors

#### 3D Model Not Loading

**Problem**: Robot model doesn't appear or shows as black.

**Solutions**:
- Check browser console for loading errors
- Verify `robot.glb` exists in `public/` directory
- Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check WebGL support in browser

#### AR Mode Not Working

**Problem**: Webcam doesn't activate or AR overlay doesn't appear.

**Solutions**:
- Grant webcam permissions when prompted
- Ensure no other application is using the webcam
- Check browser supports MediaDevices API
- Try refreshing the page

#### Plugin Not Responding

**Problem**: Plugin doesn't activate or returns errors.

**Solutions**:
- Verify plugin API key is configured
- Check API key validity and quota
- Review browser console for API errors
- Ensure plugin service is accessible

### Debug Mode

Enable debug mode to see detailed logging:
- Open browser DevTools (F12)
- Check Console tab for detailed logs
- Model attempts and performance metrics are logged
- Plugin execution details are available

---

## 🤝 Contributing

Contributions are welcome! This project is complete and functional, but feel free to extend it with additional features.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add TypeScript types
   - Update documentation as needed
4. **Test your changes**
   ```bash
   npm run dev
   npm run lint
   npm run typecheck
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add comments for complex logic
- Update README for new features
- Test on multiple browsers

### Potential Enhancements

- Additional plugins (calendar, email, etc.)
- More 3D animations and expressions
- Voice command system
- Multi-language support
- Custom robot appearance
- Conversation history persistence
- Performance optimizations

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **OpenRouter** - Multi-model AI API
- **Web Speech API** - Browser-native speech recognition
- All plugin API providers (OpenWeatherMap, NewsAPI, Serper, YouTube)

---

## 📚 Additional Documentation

- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview and current status
- **[PROBLEMS_AND_SOLUTIONS.md](PROBLEMS_AND_SOLUTIONS.md)** - Major issues faced and resolutions

---

<div align="center">

**Built with ❤️ using React, Three.js, and modern web technologies**

**Enjoy your conversations with Lexi!** 🤖✨

</div>
