import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { User } from '../types';

interface UserSelectorProps {
  users: User[];
  selectedUser: User | null;
  onUserChange: (user: User) => void;
  loading: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  selectedUser,
  onUserChange,
  loading,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select User</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUser?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.selectedUserItem,
        ]}
        onPress={() => onUserChange(item)}
      >
        <Text style={[
          styles.userName,
          isSelected && styles.selectedUserName,
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select User</Text>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        style={styles.userList}
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
  userList: {
    maxHeight: 200,
  },
  userItem: {
    backgroundColor: '#374151', // gray-700
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserItem: {
    backgroundColor: '#1e40af', // blue-800
    borderColor: '#60a5fa', // blue-400
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
  },
  selectedUserName: {
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    marginTop: 4,
  },
  selectedUserEmail: {
    color: '#dbeafe', // blue-100
  },
});