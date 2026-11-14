/** Persistent language selector for Spanish, English, and Brazilian Portuguese. */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { usePreferences } from '../../i18n/Preferences';
import { t, type Locale } from '../../i18n/Translations';
import Styles from './DisplayControls.module.css';

interface LanguageOption {
    locale: Locale;
    flag: string;
    label: string;
    name: string;
}

const Languages: LanguageOption[] = [
    { locale: 'es', flag: '/flags/Spain.svg', label: 'ESP', name: 'Español' },
    { locale: 'en', flag: '/flags/England.svg', label: 'EN', name: 'English' },
    { locale: 'pt-BR', flag: '/flags/Brazil.svg', label: 'PT', name: 'Português (Brasil)' },
];

export function DisplayControls() {
    const { locale, setLocale } = usePreferences();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const activeLanguage = Languages.find((language) => language.locale === locale)!;

    // Close the menu when the visitor clicks elsewhere or presses Escape.
    useEffect(() => {
        function handlePointerDown(event: PointerEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className={Styles.controls}>
            <div className={Styles.languageMenu} ref={menuRef}>
                <button
                    type="button"
                    className={Styles.languageButton}
                    onClick={() => setIsOpen((value) => !value)}
                    aria-label={t('Idioma')}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                >
                    <img src={activeLanguage.flag} alt="" className={Styles.flag} />
                    <span>{activeLanguage.label}</span>
                    <ChevronDown size={14} aria-hidden="true" />
                </button>

                {isOpen && (
                    <div className={Styles.options} role="menu" aria-label={t('Idioma')}>
                        {Languages.map((language) => (
                            <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={language.locale === locale}
                                key={language.locale}
                                onClick={() => {
                                    setLocale(language.locale);
                                    setIsOpen(false);
                                }}
                            >
                                <img src={language.flag} alt="" className={Styles.flag} />
                                <span className={Styles.optionText}>
                                    {language.name}
                                    <small>{language.label}</small>
                                </span>
                                {locale === language.locale && <Check size={14} aria-hidden="true" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
