import { User, IUser } from '../models/User.js';
import { mongoConnection } from '../database/mongodb.js';

export class UserService {
  /**
   * Ensure MongoDB connection before operations
   */
  private static async ensureConnection(): Promise<void> {
    await mongoConnection.ensureConnection();
  }

  /**
   * Get user by Firebase UID
   */
  static async getUserByFirebaseUid(firebase_uid: string): Promise<IUser | null> {
    await this.ensureConnection();
    
    return await User.findOne({ firebase_uid }).exec();
  }

  /**
   * Create a new user
   */
  static async createUser(userData: {
    firebase_uid: string;
    email: string;
    role_id?: string;
    is_active?: boolean;
  }): Promise<IUser> {
    await this.ensureConnection();
    
    // Check if user already exists
    const existingUser = await this.getUserByFirebaseUid(userData.firebase_uid);
    if (existingUser) {
      throw new Error(`User with firebase_uid ${userData.firebase_uid} already exists`);
    }

    const user = new User(userData);
    return await user.save();
  }

  /**
   * Update user information
   */
  static async updateUser(firebase_uid: string, updateData: {
    email?: string;
    is_active?: boolean;
    streak_data?: any;
    driving_stats?: any;
    profile_completion?: any;
    achievements?: any;
    last_sign_in?: Date;
  }): Promise<IUser | null> {
    await this.ensureConnection();
    
    return await User.findOneAndUpdate(
      { firebase_uid },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete a user
   */
  static async deleteUser(firebase_uid: string): Promise<boolean> {
    await this.ensureConnection();
    
    const result = await User.deleteOne({ firebase_uid }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Get or create user (useful for session management)
   */
  static async getOrCreateUser(userData: {
    firebase_uid: string;
    email: string;
    role_id?: string;
    is_active?: boolean;
  }): Promise<IUser> {
    await this.ensureConnection();
    
    let user = await this.getUserByFirebaseUid(userData.firebase_uid);
    
    if (!user) {
      user = await this.createUser(userData);
    } else {
      // Update user data if provided
      const updateData: any = {};
      if (userData.email && userData.email !== user.email) {
        updateData.email = userData.email;
      }
      if (userData.is_active !== undefined && userData.is_active !== user.is_active) {
        updateData.is_active = userData.is_active;
      }
      
      if (Object.keys(updateData).length > 0) {
        user = await this.updateUser(userData.firebase_uid, updateData) || user;
      }
    }
    
    return user;
  }

  /**
   * Check if user exists
   */
  static async userExists(firebase_uid: string): Promise<boolean> {
    await this.ensureConnection();
    
    const count = await User.countDocuments({ firebase_uid }).exec();
    return count > 0;
  }

  /**
   * Get all users (admin function - use with caution)
   */
  static async getAllUsers(limit: number = 100, skip: number = 0): Promise<IUser[]> {
    await this.ensureConnection();
    
    return await User.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get user count
   */
  static async getUserCount(): Promise<number> {
    await this.ensureConnection();
    
    return await User.countDocuments({}).exec();
  }

  /**
   * Search users by email
   */
  static async searchUsersByEmail(searchText: string, limit: number = 50): Promise<IUser[]> {
    await this.ensureConnection();
    
    return await User.find({
      email: { $regex: searchText, $options: 'i' }
    })
    .limit(limit)
    .sort({ createdAt: -1 })
    .exec();
  }

  /**
   * Update user driving stats
   */
  static async updateDrivingStats(firebase_uid: string, stats: {
    total_distance_km?: number;
    total_trips?: number;
    eco_score_average?: number;
    safety_violations?: number;
    night_drives?: number;
    weekend_drives?: number;
  }): Promise<IUser | null> {
    await this.ensureConnection();
    
    return await User.findOneAndUpdate(
      { firebase_uid },
      { $set: { 'driving_stats': stats } },
      { new: true }
    ).exec();
  }

  /**
   * Update user streak data
   */
  static async updateStreakData(firebase_uid: string, streakData: {
    current_daily_streak?: number;
    longest_daily_streak?: number;
    last_activity_date?: Date;
  }): Promise<IUser | null> {
    await this.ensureConnection();
    
    return await User.findOneAndUpdate(
      { firebase_uid },
      { $set: { 'streak_data': streakData } },
      { new: true }
    ).exec();
  }

  /**
   * Update last sign in
   */
  static async updateLastSignIn(firebase_uid: string): Promise<IUser | null> {
    await this.ensureConnection();
    
    return await User.findOneAndUpdate(
      { firebase_uid },
      { last_sign_in: new Date() },
      { new: true }
    ).exec();
  }

  /**
   * Get user profile (safe version without sensitive data)
   */
  static async getUserProfile(firebase_uid: string): Promise<Partial<IUser> | null> {
    await this.ensureConnection();
    
    const user = await this.getUserByFirebaseUid(firebase_uid);
    
    if (!user) {
      return null;
    }
    
    return {
      firebase_uid: user.firebase_uid,
      email: user.email,
      is_active: user.is_active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}