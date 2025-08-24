import React from "react";
import { User } from "../types";

interface UserSelectorProps {
  users: User[];
  selectedUser: string;
  onUserChange: (userId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  selectedUser,
  onUserChange,
  disabled = false,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
        <p className="text-red-400 text-sm">Failed to load users: {error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <label className="block mb-3 text-sm font-medium text-gray-300">
        Select User:
      </label>
      <div className="relative">
        <select
          value={selectedUser}
          onChange={(e) => onUserChange(e.target.value)}
          disabled={disabled}
          className="appearance-none px-4 py-3 w-full text-white bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id} className="bg-gray-900">
              {user.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
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
    </div>
  );
};
