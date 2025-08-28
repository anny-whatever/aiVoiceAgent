import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const STORAGE_KEY = 'users';
const SELECTED_USER_KEY = 'selectedUser';

const DEFAULT_USERS: User[] = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' },
  { id: 'diana', name: 'Diana' },
];

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [selectedUser, setSelectedUser] = useState<string>('alice');
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEY);
      const storedSelectedUser = await AsyncStorage.getItem(SELECTED_USER_KEY);
      
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers) as User[];
        setUsers(parsedUsers);
      }
      
      if (storedSelectedUser) {
        setSelectedUser(storedSelectedUser);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUsers = async (newUsers: User[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const selectUser = async (userId: string) => {
    try {
      await AsyncStorage.setItem(SELECTED_USER_KEY, userId);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  };

  const addUser = async (user: User) => {
    try {
      const newUsers = [...users, user];
      await saveUsers(newUsers);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const removeUser = async (userId: string) => {
    try {
      const newUsers = users.filter(user => user.id !== userId);
      await saveUsers(newUsers);
      
      // If the removed user was selected, select the first available user
      if (selectedUser === userId && newUsers.length > 0) {
        await selectUser(newUsers[0].id);
      }
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const updateUser = async (userId: string, updatedUser: Partial<User>) => {
    try {
      const newUsers = users.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      );
      await saveUsers(newUsers);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const getSelectedUserData = () => {
    return users.find(user => user.id === selectedUser) || users[0];
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    selectedUser,
    isLoading,
    selectUser,
    addUser,
    removeUser,
    updateUser,
    getSelectedUserData,
    loadUsers,
  };
};