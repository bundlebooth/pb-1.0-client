import { useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import translations from '../locales';

/**
 * Custom hook for translations
 * Usage: const { t } = useTranslation();
 *        t('nav.home') => 'Home' or 'Accueil' depending on language
 */
export function useTranslation() {
  const { language } = useLocalization();

  const t = useCallback((key, fallback = '') => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found in current language
        value = translations['en'];
        for (const ek of keys) {
          if (value && typeof value === 'object' && ek in value) {
            value = value[ek];
          } else {
            return fallback || key;
          }
        }
        break;
      }
    }

    return typeof value === 'string' ? value : (fallback || key);
  }, [language]);

  return { t, language };
}

export default useTranslation;
