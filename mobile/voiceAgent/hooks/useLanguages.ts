import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

interface UseLanguagesProps {
  backendUrl: string;
}

export function useLanguages({ backendUrl }: UseLanguagesProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLanguages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/languages`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLanguages(data.languages || []);
      
      // Auto-select English if available and none selected
      if (data.languages && data.languages.length > 0) {
        const englishLang = data.languages.find((lang: Language) => lang.code === 'en');
        if (englishLang && !selectedLanguage) {
          setSelectedLanguage(englishLang.code);
        } else if (!selectedLanguage) {
          setSelectedLanguage(data.languages[0].code);
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch languages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch languages');
      
      // Fallback to default languages if API fails
      const defaultLanguages: Language[] = [
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
        { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
      ];
      setLanguages(defaultLanguages);
      
      if (!selectedLanguage) {
        setSelectedLanguage('en');
      }
    } finally {
      setLoading(false);
    }
  }, [backendUrl, selectedLanguage]);

  const selectLanguage = useCallback((languageCode: string) => {
    setSelectedLanguage(languageCode);
  }, []);

  const getSelectedLanguage = useCallback((): Language | null => {
    return languages.find(lang => lang.code === selectedLanguage) || null;
  }, [languages, selectedLanguage]);

  const getLanguageByCode = useCallback((code: string): Language | null => {
    return languages.find(lang => lang.code === code) || null;
  }, [languages]);

  const refreshLanguages = useCallback(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const getSupportedLanguageCodes = useCallback((): string[] => {
    return languages.map(lang => lang.code);
  }, [languages]);

  const isLanguageSupported = useCallback((code: string): boolean => {
    return languages.some(lang => lang.code === code);
  }, [languages]);

  // Load languages on mount
  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  return {
    languages,
    selectedLanguage,
    loading,
    error,
    selectLanguage,
    getSelectedLanguage,
    getLanguageByCode,
    refreshLanguages,
    getSupportedLanguageCodes,
    isLanguageSupported,
  };
}