import { useState, useEffect } from "react";
import { User } from "../types";
import { fakeAuth } from "../services/fakeAuth";

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("firebase_user_001_john_doe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get fake users from fake auth service
    const fakeUsers = fakeAuth.getAvailableUsers();
    const formattedUsers: User[] = fakeUsers.map(user => ({
      id: user.uid,
      name: user.displayName,
      email: user.email
    }));
    
    setUsers(formattedUsers);
    // Set the first user as default selected
    if (formattedUsers.length > 0) {
      setSelectedUser(formattedUsers[0].id);
    }
    setLoading(false);
    setError(null);
  }, []);

  return {
    users,
    selectedUser,
    setSelectedUser,
    loading,
    error,
  };
};
