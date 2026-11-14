/** Spanish-first language preferences with a permanent light appearance. */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { setActiveLocale } from './Translations';
import type { Locale } from './Translations';

interface PreferencesContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function getSavedLocale(): Locale {
    try {
        const saved = window.localStorage.getItem('llongueras-academy:locale');
        if (saved === 'es' || saved === 'en') return saved;
    } catch { /* Storage may be unavailable in private browsing. */ }
    return 'es';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>(getSavedLocale);
    setActiveLocale(locale);

    // Keep the document and browser controls in light mode for every visitor.
    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dataset.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
        document.title = locale === 'es'
            ? 'Academia Llongueras | Formación profesional'
            : 'Academia Llongueras | Professional Education';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7f8f5');
        try {
            localStorage.setItem('llongueras-academy:locale', locale);
            localStorage.removeItem('llongueras-academy:theme');
        } catch { /* Preference persistence is optional. */ }
    }, [locale]);

    return <PreferencesContext.Provider value={{ locale, setLocale }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
    const context = useContext(PreferencesContext);
    if (!context) throw new Error('PreferencesProvider is missing');
    return context;
}
