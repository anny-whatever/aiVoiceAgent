import { useState } from 'react';
import { Language } from '../types';

const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

export const useLanguages = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English

  const getLanguageName = (code: string): string => {
    const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === code);
    return language ? language.name : 'English';
  };

  const getLanguageNativeName = (code: string): string => {
    const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === code);
    return language ? language.nativeName : 'English';
  };

  const getCurrentLanguage = (): Language => {
    return (
      AVAILABLE_LANGUAGES.find((lang) => lang.code === selectedLanguage) ||
      AVAILABLE_LANGUAGES[0]
    );
  };

  return {
    languages: AVAILABLE_LANGUAGES,
    selectedLanguage,
    setSelectedLanguage,
    getLanguageName,
    getLanguageNativeName,
    getCurrentLanguage,
  };
};