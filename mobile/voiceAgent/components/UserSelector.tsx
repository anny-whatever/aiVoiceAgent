import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { User } from '../types';

interface UserSelectorProps {
  users: User[];
  selectedUser: string;
  onUserChange: (userId: string) => void;
  loading?: boolean;
}

export function UserSelector({ users, selectedUser, onUserChange, loading = false }: UserSelectorProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Users</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Users</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select User</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {users.map((user) => {
          const isSelected = user.id === selectedUser;
          return (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userItem,
                isSelected && styles.selectedUserItem,
              ]}
              onPress={() => onUserChange(user.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.userAvatar,
                isSelected && styles.selectedUserAvatar,
              ]}>
                <Text style={[
                  styles.userInitial,
                  isSelected && styles.selectedUserInitial,
                ]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[
                styles.userName,
                isSelected && styles.selectedUserName,
              ]}>
                {user.name}
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
  userItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserItem: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BDC3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedUserAvatar: {
    backgroundColor: '#2196F3',
  },
  userInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedUserInitial: {
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },
  selectedUserName: {
    color: '#2196F3',
    fontWeight: '600',
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