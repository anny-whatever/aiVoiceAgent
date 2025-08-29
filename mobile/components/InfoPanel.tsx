import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InfoPanelProps {
  className?: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.infoButton}
        activeOpacity={0.7}
      >
        <Text style={styles.infoIcon}>i</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.emoji}>💡</Text>
                <Text style={styles.title}>Getting Started</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.description}>
              Ask about driving tips, traffic rules, or your trip history. I can
              help you analyze your driving patterns and provide personalized
              recommendations.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  infoButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)', // gray-600/30
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1f2937', // gray-900
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)', // gray-700/50
    padding: 24,
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb', // gray-200
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    lineHeight: 20,
  },
});