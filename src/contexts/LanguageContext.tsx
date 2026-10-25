import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Conversation language: what the mic listens for, what Lexi replies in, and which voice speaks
export type Language = 'en' | 'si';

interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
}

const STORAGE_KEY = 'lexi-language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStoredLanguage(): Language {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'si' ? 'si' : 'en';
    } catch {
        return 'en';
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(readStoredLanguage);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {
            // Storage blocked (private mode); the choice just won't persist
        }
        document.documentElement.lang = language;
    }, [language]);

    const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'si' : 'en'));

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
