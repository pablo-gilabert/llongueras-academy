/** Spanish-first language and light/dark theme preferences. */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { setActiveLocale } from './Translations';
import type { Locale } from './Translations';
export type Theme = 'light' | 'dark';
interface PreferencesContextValue {
    locale: Locale;
    theme: Theme;
    setLocale: (locale: Locale) => void;
    toggleTheme: () => void;
}
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
function getPreference<Key extends 'locale' | 'theme'>(key: Key, fallback: Key extends 'locale' ? Locale : Theme) {
    try {
        const value = window.localStorage.getItem(`llongueras-academy:${key}`);
        if (key === 'locale' && (value === 'es' || value === 'en'))
            return value;
        if (key === 'theme' && (value === 'light' || value === 'dark'))
            return value;
    }
    catch { /* Private browsing may disallow persistent preferences. */ }
    return fallback;
}
export function PreferencesProvider({ children }: {
    children: ReactNode;
}) {
    // Restore preferences without depending on a remote account or API.
    const [locale, updateLocale] = useState<Locale>(() => getPreference('locale', 'es') as Locale);
    const [theme, updateTheme] = useState<Theme>(() => getPreference('theme', 'light') as Theme);
    setActiveLocale(locale);
    // Apply native HTML language and a CSS theme selector for all routes.
    useEffect(() => {
        document.documentElement.lang = locale;
        document.title = locale === 'es' ? 'Academia Llongueras | Formación profesional' : 'Academia Llongueras | Professional Education';
        try {
            localStorage.setItem('llongueras-academy:locale', locale);
        }
        catch { /* Optional preference persistence. */ }
    }, [locale]);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#172322' : '#f7f8f5');
        try {
            localStorage.setItem('llongueras-academy:theme', theme);
        }
        catch { /* Optional preference persistence. */ }
    }, [theme]);
    return <PreferencesContext.Provider value={{
        locale,
        theme,
        setLocale: updateLocale,
        toggleTheme: () => updateTheme(current => current === 'light' ? 'dark' : 'light'),
    }}>{children}</PreferencesContext.Provider>;
}
export function usePreferences(): PreferencesContextValue {
    const context = useContext(PreferencesContext);
    if (!context)
        throw new Error('PreferencesProvider is missing');
    return context;
}
