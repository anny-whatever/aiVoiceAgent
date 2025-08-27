import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Language } from '../types';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  loading?: boolean;
}

export function LanguageSelector({ languages, selectedLanguage, onLanguageChange, loading = false }: LanguageSelectorProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Languages</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      </View>
    );
  }

  if (languages.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Languages</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No languages available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {languages.map((language) => {
          const isSelected = language.code === selectedLanguage;
          return (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                isSelected && styles.selectedLanguageItem,
              ]}
              onPress={() => onLanguageChange(language.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{language.flag}</Text>
              <Text style={[
                styles.languageName,
                isSelected && styles.selectedLanguageName,
              ]}>
                {language.name}
              </Text>
              <Text style={[
                styles.nativeName,
                isSelected && styles.selectedNativeName,
              ]}>
                {language.nativeName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  scrollContainer: {
    paddingHorizontal: 4,
  },
  languageItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  selectedLanguageItem: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  flag: {
    fontSize: 24,
    marginBottom: 8,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedLanguageName: {
    color: '#4CAF50',
  },
  nativeName: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectedNativeName: {
    color: '#388E3C',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
});