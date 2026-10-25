import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Mic, MicOff, Brain, Volume2, Pause, Play, Square, Send, X, Globe } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { speechService } from '../services/speechService';
import { aiService, AIResponse } from '../services/aiService';
import { useTheme } from '../contexts/ThemeContext';
import { useVoiceState } from '../contexts/VoiceStateContext';
import { usePluginContextSafe } from '../contexts/PluginContext';
import { useConversation } from '../contexts/ConversationContext';
import { getServiceStatus } from '../utils/env';
import { BROWSER_PROGRESS_EVENT, stopBrowserTask, type BrowserTaskState } from '../core/plugins/browser';

interface VoiceControlsProps {
    onMessage?: (message: { text: string; isUser: boolean; timestamp: Date }) => void;
}

export function VoiceControls({ onMessage }: VoiceControlsProps) {
    const { theme } = useTheme();
    const { setVoiceState, updateAudioLevel, analyzeSentiment } = useVoiceState();
    const pluginContext = usePluginContextSafe();
    const [aiReady, setAiReady] = useState(aiService.isReady());
    const [showSetupNotice, setShowSetupNotice] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [lastModelUsed, setLastModelUsed] = useState<string>('');
    const [modelAttempts, setModelAttempts] = useState<string[]>([]);
    const [showDebugPanel, setShowDebugPanel] = useState(false);
    const [pluginsAvailable, setPluginsAvailable] = useState(false);
    const [textInput, setTextInput] = useState('');
    const textInputRef = useRef<HTMLInputElement>(null);
    const { pendingPrompt, consumePrompt } = useConversation();
    const isDark = theme === 'dark';
    const [browserTask, setBrowserTask] = useState<BrowserTaskState | null>(null);

    // Live progress of a browser task started by the browser plugin
    useEffect(() => {
        const onProgress = (event: Event) => setBrowserTask((event as CustomEvent<BrowserTaskState | null>).detail);
        window.addEventListener(BROWSER_PROGRESS_EVENT, onProgress);
        return () => window.removeEventListener(BROWSER_PROGRESS_EVENT, onProgress);
    }, []);

    const speechRecognition = useSpeechRecognition({
        continuous: false,
        interimResults: true,
        onResult: (transcript, isFinal) => {
            if (isFinal && transcript.trim()) {
                handleUserInput(transcript.trim());
            }
        },
        onStart: () => {
            setVoiceState({ isListening: true });
        },
        onEnd: () => {
            setVoiceState({ isListening: false });
        },
        onError: (error) => {
            console.error('Speech recognition error:', error);
            setVoiceState({ isListening: false });
        }
    });

    const textToSpeech = useTextToSpeech({
        useDeepgram: speechService.isReady(),
        onStart: () => {
            setIsProcessing(false);
            setVoiceState({ isSpeaking: true });
        },
        onEnd: () => {
            setIsProcessing(false);
            setVoiceState({ isSpeaking: false });
        },
        onError: (error) => {
            console.error('Text-to-speech error:', error);
            setIsProcessing(false);
            setVoiceState({ isSpeaking: false });
        },
        onAudioLevelChange: (level) => {
            updateAudioLevel(level);
        }
    });

    useEffect(() => {
        // Ask the server whether an AI key (OpenRouter or Gemini) is configured
        aiService.init().then((ready) => {
            setAiReady(ready);
            setShowSetupNotice(!ready);
        });
        // Only advertise plugins when the server has at least one plugin key
        getServiceStatus().then((status) => {
            setPluginsAvailable(status.weather || status.news || status.search || status.youtube);
        });
    }, []);

    const handleUserInput = async (userText: string) => {
        if (!userText.trim()) return;

        console.log('User input received:', userText);
        setIsProcessing(true);

        // Add user message to conversation
        if (onMessage) {
            onMessage({
                text: userText,
                isUser: true,
                timestamp: new Date()
            });
        }

        // Update emotion immediately based on user input (before processing)
        try {
            console.log('🎨 Analyzing sentiment for:', userText);
            const emotion = await analyzeSentiment(userText);
            console.log('🎨 Emotion set to:', emotion);
        } catch (error) {
            console.error('🎨 Sentiment analysis failed:', error);
            // Sentiment analysis failed, continue with neutral emotion
        }

        try {
            // Show thinking indicator immediately
            setIsThinking(true);
            setVoiceState({ isThinking: true });
            console.log('🤔 Starting AI processing...');

            let response = '';
            let usedPlugin = false;

            // Try plugin system first (if available)
            if (pluginContext) {
                try {
                    const pluginResponse = await pluginContext.processUserInput(userText);
                    if (pluginResponse.pluginUsed) {
                        // Plugin handled the request
                        console.log('Plugin response:', pluginResponse);
                        response = pluginResponse.result.summary;
                        usedPlugin = true;
                    }
                } catch (error) {
                    console.log('Plugin system not available or failed, falling back to AI');
                }
            }

            // Fall back to AI if no plugin was used
            if (!usedPlugin) {
                console.log('🧠 Calling AI service...');
                const aiResponse: AIResponse = await aiService.getAIResponse(userText);
                console.log('✅ AI response received:', aiResponse);

                // Update model information
                if (aiResponse.modelUsed) {
                    setLastModelUsed(aiResponse.modelUsed);
                }

                // Update model attempts for debugging
                const attempts = aiService.getModelAttempts();
                setModelAttempts(attempts.map(attempt =>
                    `${attempt.model}: ${attempt.success ? '✅' : '❌'} (${attempt.responseTime}ms)`
                ));

                // Use AI response or fallback
                response = aiResponse.success
                    ? aiResponse.content
                    : aiService.generateFallbackResponse(userText);
            }

            // Add response to conversation
            if (onMessage) {
                onMessage({
                    text: response,
                    isUser: false,
                    timestamp: new Date()
                });
            }

            // Hide thinking indicator
            setIsThinking(false);
            setVoiceState({ isThinking: false });

            // Speak the response
            console.log('Attempting to speak response...');
            await textToSpeech.speak(response);
            console.log('Speech completed');

        } catch (error) {
            console.error('Error processing user input:', error);
            setIsThinking(false);
            setIsProcessing(false);
            setVoiceState({ isThinking: false, isProcessing: false });
        }
    };

    const isBusy = isProcessing || isThinking || !!pluginContext?.isProcessing || textToSpeech.isSpeaking;

    useEffect(() => {
        if (!pendingPrompt) return;
        consumePrompt();
        if (pendingPrompt.draft || isBusy) {
            // Let the user finish the sentence (or wait until Lexi is done talking)
            setTextInput(pendingPrompt.text);
            textInputRef.current?.focus();
        } else {
            handleUserInput(pendingPrompt.text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingPrompt]);

    const handleTextSubmit = (event: FormEvent) => {
        event.preventDefault();
        const text = textInput.trim();
        if (!text || isBusy) return;
        setTextInput('');
        handleUserInput(text);
    };

    // Status label/style for compact text-only chip (no icons)
    const getStatusLabel = () => {
        if (speechRecognition.isListening) return 'Listening';
        if (isThinking || pluginContext?.isProcessing) return 'Thinking';
        if (isProcessing) return 'Processing';
        if (textToSpeech.isSpeaking) return 'Speaking';
        return 'Ready';
    };

    const getStatusClass = () => {
        const tone = theme === 'dark'
            ? {
                base: 'px-2 py-1 rounded-full text-xs',
                listening: 'bg-rose-500/20 text-rose-200',
                thinking: 'bg-violet-500/25 text-violet-200',
                processing: 'bg-amber-500/20 text-amber-200',
                speaking: 'bg-emerald-500/20 text-emerald-200',
                ready: 'bg-indigo-500/20 text-indigo-200',
            }
            : {
                base: 'px-2 py-1 rounded-full text-xs',
                listening: 'bg-rose-600/10 text-rose-700',
                thinking: 'bg-violet-600/10 text-violet-700',
                processing: 'bg-amber-600/10 text-amber-700',
                speaking: 'bg-emerald-600/10 text-emerald-700',
                ready: 'bg-indigo-600/10 text-indigo-700',
            };

        if (speechRecognition.isListening) return `${tone.base} ${tone.listening}`;
        if (isThinking || pluginContext?.isProcessing) return `${tone.base} ${tone.thinking}`;
        if (isProcessing) return `${tone.base} ${tone.processing}`;
        if (textToSpeech.isSpeaking) return `${tone.base} ${tone.speaking}`;
        return `${tone.base} ${tone.ready}`;
    };

    return (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-[440px] max-w-[calc(100vw-2rem)]">
            {/* AI setup notice: keys live in the server .env, so this only explains where to put them */}
            {showSetupNotice && (
                <div
                    role="status"
                    className={`mb-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md ${isDark
                        ? 'bg-slate-900/90 border-white/10 text-slate-200'
                        : 'bg-white/95 border-slate-200 text-slate-800'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <Brain className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? 'text-violet-300' : 'text-violet-600'}`} />
                        <div className="flex-1 text-sm">
                            <p className="font-semibold">AI Brain is not set up</p>
                            <p className={`mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                Add <code className="font-mono text-xs">OPENROUTER_API_KEY</code> (or <code className="font-mono text-xs">GEMINI_API_KEY</code>) to the server <code className="font-mono text-xs">.env</code> and restart. Until then Lexi uses basic replies.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSetupNotice(false)}
                            aria-label="Dismiss AI setup notice"
                            className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {browserTask && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`mb-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md flex items-center gap-3 ${isDark
                        ? 'bg-slate-900/90 border-white/10 text-slate-200'
                        : 'bg-white/95 border-slate-200 text-slate-800'
                        }`}
                >
                    <Globe className={`w-5 h-5 shrink-0 animate-pulse ${isDark ? 'text-sky-300' : 'text-sky-600'}`} />
                    <div className="flex-1 min-w-0 text-sm">
                        <p className="font-semibold">Using the browser…</p>
                        <p className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {browserTask.steps[browserTask.steps.length - 1]?.detail ?? 'Thinking about the first step'}
                        </p>
                    </div>
                    <button
                        onClick={() => stopBrowserTask(browserTask.id)}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium bg-rose-500 text-white hover:bg-rose-600"
                    >
                        Stop
                    </button>
                </div>
            )}

            <div className={`ar-floating-card rounded-2xl px-4 py-4 sm:px-5 ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-white/70 text-slate-800'}`}>
                {/* Layout: avatar | content | controls */}
                <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 sm:gap-5">
                    {/* Mic button */}
                    <button
                        aria-label={speechRecognition.isListening ? 'Stop listening' : 'Start listening'}
                        onClick={speechRecognition.toggleListening}
                        disabled={isProcessing || isThinking || pluginContext?.isProcessing || textToSpeech.isSpeaking}
                        className={`relative w-12 h-12 rounded-xl flex items-center justify-center glow-effect ${speechRecognition.isListening
                            ? 'bg-rose-500'
                            : (isThinking || pluginContext?.isProcessing)
                                ? 'bg-violet-500'
                                : 'bg-indigo-500'
                            } ${isProcessing || isThinking || pluginContext?.isProcessing || textToSpeech.isSpeaking ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
                    >
                        {speechRecognition.isListening ? <MicOff className="w-5 h-5 text-white" /> : (isThinking || pluginContext?.isProcessing) ? <Brain className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                        {speechRecognition.isListening && <div className="absolute inset-0 rounded-xl border-2 border-rose-300 animate-ping" />}
                        {(isThinking || pluginContext?.isProcessing) && <div className="absolute inset-0 rounded-xl border-2 border-violet-300 animate-pulse" />}
                    </button>

                    {/* Content */}
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={getStatusClass()}>{getStatusLabel()}</span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-600/10 text-violet-700'}`}>
                                <Brain className="w-3 h-3" />
                                <span className="font-medium">{aiReady ? 'AI Brain' : 'Basic Mode'}</span>
                            </span>
                            {pluginContext && pluginsAvailable && (
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/25 text-green-200' : 'bg-green-600/10 text-green-700'}`}>
                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    <span className="font-medium">Plugins</span>
                                </span>
                            )}
                            {/* Model name removed per design */}
                        </div>
                        {/* Transcript preview removed per design */}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {textToSpeech.isSpeaking && (
                            <button
                                aria-label={textToSpeech.isPaused ? 'Resume' : 'Pause'}
                                onClick={textToSpeech.togglePause}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                                {textToSpeech.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                        )}
                        {textToSpeech.isSpeaking && (
                            <button
                                aria-label="Stop"
                                onClick={textToSpeech.stop}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        )}
                        {!textToSpeech.isSpeaking && (
                            <div aria-hidden="true" className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-300 text-slate-600'}`}>
                                <Volume2 className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Text input: works without a microphone or Web Speech support */}
                <form onSubmit={handleTextSubmit} className="mt-3 flex items-center gap-2">
                    <label htmlFor="lexi-text-input" className="sr-only">Message Lexi</label>
                    <input
                        id="lexi-text-input"
                        ref={textInputRef}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={speechRecognition.isSupported ? 'Type a message or tap the mic' : 'Type a message (voice not supported here)'}
                        autoComplete="off"
                        className={`flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${isDark
                            ? 'bg-slate-800/80 border-white/10 text-slate-100 placeholder-slate-400'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                            }`}
                    />
                    <button
                        type="submit"
                        aria-label="Send message"
                        disabled={!textInput.trim() || isBusy}
                        className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>

                {/* Footer actions */}
                <div className="mt-2 flex items-center justify-end">
                    {aiReady && (
                        <button onClick={() => setShowDebugPanel(!showDebugPanel)} className="text-xs text-blue-300 hover:text-blue-200 font-medium">
                            {showDebugPanel ? 'Hide' : 'Show'} Model Debug
                        </button>
                    )}
                </div>

                {/* Error */}
                {(speechRecognition.error || textToSpeech.error) && (
                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                        <p className="text-xs text-red-400">{speechRecognition.error || textToSpeech.error}</p>
                        <button onClick={() => { speechRecognition.clearError(); textToSpeech.clearError(); }} className="text-xs text-red-300 hover:text-red-200 mt-1">Dismiss</button>
                    </div>
                )}
            </div>

            {/* Debug Panel */}
            {showDebugPanel && aiReady && (
                <div className={`absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 p-3 rounded-lg ar-floating-card transition-colors duration-300 max-w-md`}>
                    <div className="text-xs">
                        <div className="font-semibold mb-2">🧠 AI Model Debug</div>
                        {modelAttempts.length > 0 ? (
                            <div className="space-y-1">
                                {modelAttempts.map((attempt, index) => (
                                    <div key={index} className="opacity-80">
                                        {attempt}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="opacity-60">No attempts yet</div>
                        )}
                        <div className="mt-2 pt-2 border-t border-opacity-20">
                            <div className="opacity-60">
                                Last used: {lastModelUsed || 'None'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
