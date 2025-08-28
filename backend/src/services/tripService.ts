import { Trip, ITrip } from '../models/Trip.js';
import { TimeUtils, DateRange } from '../utils/timeUtils.js';
import { mongoConnection } from '../database/mongodb.js';

export interface TripQueryOptions {
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'start_time' | 'createdAt' | 'distance' | 'duration_seconds';
  sortOrder?: 'asc' | 'desc';
}

export interface TripStats {
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  totalRewardPoints: number;
  averageDistance: number;
  averageDuration: number;
  statusCounts: Record<string, number>;
  averageEcoScore: number;
  totalCoins: number;
}

export class TripService {
  /**
   * Ensure MongoDB connection before operations
   */
  private static async ensureConnection(): Promise<void> {
    await mongoConnection.ensureConnection();
  }

  /**
   * Get the latest trip for a user
   */
  static async getLatestTrip(firebase_uid: string): Promise<ITrip | null> {
    await this.ensureConnection();
    
    return await Trip.findOne({ firebase_uid })
      .sort({ start_time: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Get trips from the last week
   */
  static async getTripsLastWeek(firebase_uid: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const dateRange = TimeUtils.getLastWeek();
    return await this.getTripsByDateRange(firebase_uid, dateRange, options);
  }

  /**
   * Get trips for a specific date
   */
  static async getTripsByDate(firebase_uid: string, dateString: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const dateRange = TimeUtils.getSpecificDate(dateString);
    return await this.getTripsByDateRange(firebase_uid, dateRange, options);
  }

  /**
   * Get trips within a date range
   */
  static async getTripsByDateRange(firebase_uid: string, dateRange: DateRange, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const {
      status,
      limit = 100,
      skip = 0,
      sortBy = 'start_time',
      sortOrder = 'desc'
    } = options;

    const query: any = {
      firebase_uid,
      start_time: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      }
    };

    if (status) {
      query.status = status;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Trip.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get trips for today
   */
  static async getTripsToday(firebase_uid: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const dateRange = TimeUtils.getToday();
    return await this.getTripsByDateRange(firebase_uid, dateRange, options);
  }

  /**
   * Get trips for yesterday
   */
  static async getTripsYesterday(firebase_uid: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const dateRange = TimeUtils.getYesterday();
    return await this.getTripsByDateRange(firebase_uid, dateRange, options);
  }

  /**
   * Get trips for current month
   */
  static async getTripsThisMonth(firebase_uid: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const dateRange = TimeUtils.getCurrentMonth();
    return await this.getTripsByDateRange(firebase_uid, dateRange, options);
  }

  /**
   * Get recent trips (last N trips)
   */
  static async getRecentTrips(firebase_uid: string, limit: number = 10): Promise<ITrip[]> {
    await this.ensureConnection();
    
    return await Trip.find({ firebase_uid })
      .sort({ start_time: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get trips by status
   */
  static async getTripsByStatus(firebase_uid: string, status: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const {
      limit = 100,
      skip = 0,
      sortBy = 'start_time',
      sortOrder = 'desc'
    } = options;

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Trip.find({ firebase_uid, status })
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get trip statistics for a date range
   */
  static async getTripStats(firebase_uid: string, dateRange?: DateRange): Promise<TripStats> {
    await this.ensureConnection();
    
    const query: any = { firebase_uid };
    
    if (dateRange) {
      query.start_time = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      };
    }

    const trips = await Trip.find(query).exec();
    
    const stats: TripStats = {
      totalTrips: trips.length,
      totalDistance: 0,
      totalDuration: 0,
      totalRewardPoints: 0,
      averageDistance: 0,
      averageDuration: 0,
      statusCounts: {},
      averageEcoScore: 0,
      totalCoins: 0
    };

    let totalEcoScore = 0;
    trips.forEach(trip => {
      stats.totalDistance += trip.distance;
      stats.totalDuration += trip.duration_seconds;
      stats.totalRewardPoints += trip.rewardPoints || 0;
      stats.totalCoins += trip.coins || 0;
      totalEcoScore += trip.eco_score || 0;
      
      stats.statusCounts[trip.status] = (stats.statusCounts[trip.status] || 0) + 1;
    });

    if (stats.totalTrips > 0) {
      stats.averageEcoScore = totalEcoScore / stats.totalTrips;
    }

    if (stats.totalTrips > 0) {
      stats.averageDistance = stats.totalDistance / stats.totalTrips;
      stats.averageDuration = stats.totalDuration / stats.totalTrips;
    }

    return stats;
  }

  /**
   * Create a new trip
   */
  static async createTrip(tripData: Partial<ITrip>): Promise<ITrip> {
    await this.ensureConnection();
    
    if (!tripData.firebase_uid) {
      throw new Error('firebase_uid is required');
    }

    const trip = new Trip(tripData);
    return await trip.save();
  }

  /**
   * Update a trip
   */
  static async updateTrip(tripId: string, firebase_uid: string, updateData: Partial<ITrip>): Promise<ITrip | null> {
    await this.ensureConnection();
    
    return await Trip.findOneAndUpdate(
      { tripId, firebase_uid },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete a trip
   */
  static async deleteTrip(tripId: string, firebase_uid: string): Promise<boolean> {
    await this.ensureConnection();
    
    const result = await Trip.deleteOne({ tripId, firebase_uid }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Get trip by ID
   */
  static async getTripById(tripId: string, firebase_uid: string): Promise<ITrip | null> {
    await this.ensureConnection();
    
    return await Trip.findOne({ tripId, firebase_uid }).exec();
  }

  /**
   * Search trips by text (addresses, session ID)
   */
  static async searchTrips(firebase_uid: string, searchText: string, options: TripQueryOptions = {}): Promise<ITrip[]> {
    await this.ensureConnection();
    
    const {
      limit = 50,
      skip = 0,
      sortBy = 'start_time',
      sortOrder = 'desc'
    } = options;

    const searchRegex = new RegExp(searchText, 'i');
    
    const query = {
      firebase_uid,
      $or: [
        { startAddress: searchRegex },
        { endAddress: searchRegex },
        { sid: searchRegex }
      ]
    };

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Trip.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }
}