// Fake Firebase Authentication Service
// Simulates Firebase user authentication with hardcoded users

const FAKE_USERS = [
  {
    uid: 'firebase_user_001_john_doe',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    photoURL: null,
    emailVerified: true
  },
  {
    uid: 'firebase_user_002_jane_smith', 
    email: 'jane.smith@example.com',
    displayName: 'Jane Smith',
    photoURL: null,
    emailVerified: true
  }
];

class FakeAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    
    // Auto-login first user on initialization
    setTimeout(() => {
      this.signIn(FAKE_USERS[0].email);
    }, 100);
  }

  // Simulate Firebase auth state listener
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Simulate sign in
  async signIn(email) {
    const user = FAKE_USERS.find(u => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }
    
    this.currentUser = user;
    this.notifyAuthStateListeners();
    return user;
  }

  // Simulate sign out
  async signOut() {
    this.currentUser = null;
    this.notifyAuthStateListeners();
  }

  // Switch between users (for testing)
  async switchUser(userIndex = 0) {
    if (userIndex >= 0 && userIndex < FAKE_USERS.length) {
      this.currentUser = FAKE_USERS[userIndex];
      this.notifyAuthStateListeners();
      return this.currentUser;
    }
    throw new Error('Invalid user index');
  }

  // Get all available users (for UI selection)
  getAvailableUsers() {
    return FAKE_USERS.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    }));
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Notify all listeners of auth state change
  notifyAuthStateListeners() {
    this.authStateListeners.forEach(callback => {
      callback(this.currentUser);
    });
  }
}

// Export singleton instance
export const fakeAuth = new FakeAuthService();
export default fakeAuth;