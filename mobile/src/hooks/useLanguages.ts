import { useState, useEffect } from 'react';
import { Language } from '../types';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const useLanguages = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [isLoading, setIsLoading] = useState(false);

  const selectLanguage = async (language: Language) => {
    setIsLoading(true);
    try {
      setSelectedLanguage(language);
      // Store in AsyncStorage for persistence
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('selectedLanguage', JSON.stringify(language));
    } catch (error) {
      console.error('Error saving language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedLanguage = async () => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const saved = await AsyncStorage.default.getItem('selectedLanguage');
      if (saved) {
        const language = JSON.parse(saved) as Language;
        setSelectedLanguage(language);
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return {
    languages: LANGUAGES,
    selectedLanguage,
    selectLanguage,
    isLoading,
  };
};