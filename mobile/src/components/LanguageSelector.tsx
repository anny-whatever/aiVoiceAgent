import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Language } from '../types';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  loading: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
  loading,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Language</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      </View>
    );
  }

  const renderLanguage = ({ item }: { item: Language }) => {
    const isSelected = selectedLanguage.code === item.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem,
        ]}
        onPress={() => onLanguageChange(item)}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[
            styles.languageName,
            isSelected && styles.selectedLanguageName,
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.languageNative,
            isSelected && styles.selectedLanguageNative,
          ]}>
            {item.nativeName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language</Text>
      <FlatList
        data={languages}
        renderItem={renderLanguage}
        keyExtractor={(item) => item.code}
        style={styles.languageList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937', // gray-800
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#9ca3af', // gray-400
    marginTop: 8,
  },
  languageList: {
    maxHeight: 200,
  },
  languageItem: {
    backgroundColor: '#374151', // gray-700
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLanguageItem: {
    backgroundColor: '#1e40af', // blue-800
    borderColor: '#60a5fa', // blue-400
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
  },
  selectedLanguageName: {
    color: '#ffffff',
  },
  languageNative: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    marginTop: 2,
  },
  selectedLanguageNative: {
    color: '#dbeafe', // blue-100
  },
});