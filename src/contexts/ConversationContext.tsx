import { createContext, useContext, useState, ReactNode } from 'react';
import { VoiceMessage } from '../services/speechService';

interface ConversationContextType {
    messages: VoiceMessage[];
    addMessage: (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => void;
    clearMessages: () => void;
    isVisible: boolean;
    toggleVisibility: () => void;
    // Text queued from outside VoiceControls (e.g. Holographic tiles). VoiceControls consumes it:
    // a draft is put in the text box for the user to finish, otherwise it is sent to Lexi.
    pendingPrompt: PendingPrompt | null;
    sendPrompt: (text: string, options?: { draft?: boolean }) => void;
    consumePrompt: () => void;
}

export interface PendingPrompt {
    id: number;
    text: string;
    draft: boolean;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<VoiceMessage[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);

    const addMessage = (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => {
        const newMessage: VoiceMessage = {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
    };

    const clearMessages = () => {
        setMessages([]);
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    };

    const sendPrompt = (text: string, options?: { draft?: boolean }) => {
        setPendingPrompt({ id: Date.now(), text, draft: options?.draft ?? false });
    };

    const consumePrompt = () => {
        setPendingPrompt(null);
    };

    return (
        <ConversationContext.Provider value={{
            messages,
            addMessage,
            clearMessages,
            isVisible,
            toggleVisibility,
            pendingPrompt,
            sendPrompt,
            consumePrompt
        }}>
            {children}
        </ConversationContext.Provider>
    );
}

export function useConversation() {
    const context = useContext(ConversationContext);
    if (context === undefined) {
        throw new Error('useConversation must be used within a ConversationProvider');
    }
    return context;
}
