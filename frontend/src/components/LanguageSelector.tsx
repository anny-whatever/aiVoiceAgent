import React from "react";
import { Language } from "../types";

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}) => {
  if (languages.length === 0) {
    return null;
  }

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === selectedLanguage) || languages[0];
  };

  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={disabled}
        className="appearance-none px-3 py-2 text-sm text-white bg-black/30 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed pr-8"
      >
        {languages.map((language) => (
          <option
            key={language.code}
            value={language.code}
            className="bg-gray-900"
          >
            {language.code.toUpperCase()}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
};
