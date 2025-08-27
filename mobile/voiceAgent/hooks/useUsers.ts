import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface UseUsersProps {
  backendUrl: string;
}

export function useUsers({ backendUrl }: UseUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      
      // Auto-select first user if none selected
      if (data.users && data.users.length > 0 && !selectedUser) {
        setSelectedUser(data.users[0].id);
      }
    } catch (err) {
      console.error('❌ Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      
      // Fallback to default users if API fails
      const defaultUsers: User[] = [
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
        { id: 'user3', name: 'Charlie' },
      ];
      setUsers(defaultUsers);
      
      if (!selectedUser) {
        setSelectedUser(defaultUsers[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [backendUrl, selectedUser]);

  const createUser = useCallback(async (name: string): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newUser = data.user;
      
      setUsers(prev => [...prev, newUser]);
      
      return newUser;
    } catch (err) {
      console.error('❌ Failed to create user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      return null;
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      // If deleted user was selected, select another user
      if (selectedUser === userId) {
        const remainingUsers = users.filter(user => user.id !== userId);
        if (remainingUsers.length > 0) {
          setSelectedUser(remainingUsers[0].id);
        } else {
          setSelectedUser('');
        }
      }
      
      return true;
    } catch (err) {
      console.error('❌ Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, selectedUser, users]);

  const selectUser = useCallback((userId: string) => {
    setSelectedUser(userId);
  }, []);

  const getSelectedUser = useCallback((): User | null => {
    return users.find(user => user.id === selectedUser) || null;
  }, [users, selectedUser]);

  const refreshUsers = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    selectedUser,
    loading,
    error,
    createUser,
    deleteUser,
    selectUser,
    getSelectedUser,
    refreshUsers,
  };
}