import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect, useMemo, useRef, type ComponentType } from 'react';
import { Scene } from './components/Scene';
import { ARScene } from './components/ARScene';
import { HolographicScene } from './components/3d/HolographicScene';
import { HolographicOverlay } from './components/ui/HolographicOverlay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { VoiceStateProvider } from './contexts/VoiceStateContext';
import { VoiceControls } from './components/VoiceControls';
import { ConversationLog } from './components/ConversationLog';
import { StartLexiButton } from './components/StartLexiButton';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PluginProvider, usePluginContextSafe } from './contexts/PluginContext';
import { PluginCardSimple } from './components/PluginCardSimple';
import { ARPluginCard } from './components/ARPluginCard';
import { MessageSquare, Box as BoxIcon, Sparkles, Camera, Info, X } from 'lucide-react';

type ViewMode = '3d' | 'holographic' | 'ar';

function VoiceControlsWithConversation() {
  const { addMessage } = useConversation();

  return (
    <VoiceControls
      onMessage={(message) => addMessage(message)}
    />
  );
}

function AppContent() {
  const { theme } = useTheme();
  const { toggleVisibility, isVisible: isChatOpen } = useConversation();
  const pluginContext = usePluginContextSafe();
  const [isLexiInitialized, setIsLexiInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [showAbout, setShowAbout] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const aboutCloseRef = useRef<HTMLButtonElement>(null);
  const isARMode = viewMode === 'ar';
  const isHolographicMode = viewMode === 'holographic';
  const isDark = theme === 'dark';

  // Generate particle positions once instead of on every render
  const particles = useMemo(() => Array.from({ length: 20 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 3}s`,
    animationDuration: `${2 + Math.random() * 3}s`,
  })), []);

  // About dialog: focus the close button and close on Escape
  useEffect(() => {
    if (!showAbout) return;
    aboutCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowAbout(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAbout]);


  const handleLexiInitialized = () => {
    setIsLexiInitialized(true);
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const getCanvasBackground = () => {
    if (isARMode) return 'transparent';
    if (theme === 'dark') {
      return 'transparent';
    }
    return 'transparent';
  };

  return (
    <div className={`h-screen w-full overflow-hidden relative transition-colors duration-300 ${isHolographicMode ? 'holographic-bg' :
      theme === 'dark' ? 'holographic-bg' : 'holographic-bg-light'
      }`}>
      {/* Animated Background (disabled in AR to keep webcam visible) */}
      {!isARMode && (
        <AnimatedBackground className="pointer-events-none" isARMode={false} />
      )}

      {/* Floating particles effect (3D mode only) */}
      {!isARMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((style, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-pulse"
              style={style}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 px-3 py-3 sm:px-6 sm:py-4">
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-2xl px-3 py-2 sm:px-5 sm:py-3 flex items-center justify-between gap-2 border backdrop-blur-md shadow-lg ${isDark
            ? 'bg-slate-950/50 border-white/10'
            : 'bg-white/70 border-slate-200'
            }`}>
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-lg" aria-hidden="true">🤖</span>
              </div>
              <span className={`hidden md:inline text-xl font-bold whitespace-nowrap ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>
                Talking Lexi
              </span>
            </div>

            {/* View modes + panels. Labels collapse to icons on small screens */}
            <nav aria-label="Main" className={`flex items-center gap-1 rounded-xl p-1 border ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100/80'}`}>
              <NavButton icon={BoxIcon} label="3D" active={viewMode === '3d'} isDark={isDark} onClick={() => setViewMode('3d')} />
              <NavButton icon={Sparkles} label="Holographic" active={viewMode === 'holographic'} isDark={isDark} onClick={() => setViewMode('holographic')} />
              <NavButton icon={Camera} label="AR" active={viewMode === 'ar'} isDark={isDark} onClick={() => setViewMode('ar')} />
              <span className={`w-px h-6 mx-0.5 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} aria-hidden="true" />
              <NavButton icon={MessageSquare} label="Chat" active={isChatOpen} isDark={isDark} onClick={() => toggleVisibility()} />
              <NavButton icon={Info} label="About" active={showAbout} isDark={isDark} onClick={() => setShowAbout(true)} />
            </nav>

            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* 3D Canvas, AR Scene, or Holographic Scene */}
      {isARMode ? (
        <ARScene className="w-full h-full" />
      ) : isHolographicMode ? (
        <div className="w-full h-full relative">
          <HolographicScene />
          <HolographicOverlay isMobile={isMobile} />
        </div>
      ) : (
        <Suspense fallback={<LoadingSpinner />}>
          <Canvas
            camera={{
              position: [0, 1, 5],
              fov: 50,
              near: 0.1,
              far: 1000
            }}
            shadows
            className="w-full h-full"
            style={{
              background: getCanvasBackground()
            }}
            dpr={[1, 2]}
            onCreated={({ gl }) => {
              // Slightly lower exposure for crisper highlights in 3D
              try { (gl as any).toneMappingExposure = 0.95; } catch { }
            }}
          >
            <Scene isARMode={isARMode} />
          </Canvas>
        </Suspense>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAbout(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className={`relative rounded-2xl border p-6 w-[28rem] max-w-full shadow-2xl ${isDark
              ? 'bg-slate-900 border-white/10 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800'
              }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="about-title" className="text-lg font-semibold">About Talking Lexi</h3>
              <button
                ref={aboutCloseRef}
                aria-label="Close"
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                onClick={() => setShowAbout(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Talking Lexi is a 3D AI assistant experience. Switch between 3D, Holographic and AR views
              in the top bar, talk with the mic or type a message, and open Chat to see the conversation history.
            </p>
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <VoiceControlsWithConversation />

      {/* Conversation Log */}
      <ConversationLog />

      {/* Start Lexi Button - Show if not initialized */}
      {!isLexiInitialized && (
        <StartLexiButton onInitialized={handleLexiInitialized} />
      )}


      {/* Plugin Card - Display results from test panel */}
      {pluginContext?.currentResult && (
        isARMode ? (
          <ARPluginCard
            result={pluginContext.currentResult}
            onClose={pluginContext.clearResult}
          />
        ) : (
          <PluginCardSimple
            result={pluginContext.currentResult}
            onClose={pluginContext.clearResult}
          />
        )
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active = false, isDark, onClick }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const tone = active
    ? isDark ? 'bg-indigo-500/30 text-white' : 'bg-white text-indigo-700 shadow-sm'
    : isDark ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70';

  return (
    <button
      className={`flex items-center gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-sm font-medium transition-colors ${tone}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <VoiceStateProvider>
          <PluginProvider>
            <AppContent />
          </PluginProvider>
        </VoiceStateProvider>
      </ConversationProvider>
    </ThemeProvider>
  );
}

export default App;
