import { Vehicle, IVehicle } from '../models/Vehicle.js';
import { mongoConnection } from '../database/mongodb.js';

export interface VehicleQueryOptions {
  is_active?: boolean;
  limit?: number;
  skip?: number;
  sortBy?: 'created_at' | 'year' | 'make' | 'vehicle_model';
  sortOrder?: 'asc' | 'desc';
}

export class VehicleService {
  /**
   * Ensure MongoDB connection before operations
   */
  private static async ensureConnection(): Promise<void> {
    await mongoConnection.ensureConnection();
  }

  /**
   * Get all vehicles for a user
   */
  static async getVehiclesByUserId(firebase_uid: string, options: VehicleQueryOptions = {}): Promise<IVehicle[]> {
    await this.ensureConnection();
    
    const {
      is_active,
      limit = 50,
      skip = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const query: any = { firebase_id: firebase_uid };
    
    if (is_active !== undefined) {
      query.is_active = is_active;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Vehicle.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get only active vehicles for a user
   */
  static async getActiveVehicles(firebase_uid: string): Promise<IVehicle[]> {
    await this.ensureConnection();
    
    return this.getVehiclesByUserId(firebase_uid, { is_active: true });
  }

  /**
   * Get a specific vehicle by ID for a user
   */
  static async getVehicleById(vehicleId: string, firebase_uid: string): Promise<IVehicle | null> {
    await this.ensureConnection();
    
    return await Vehicle.findOne({ _id: vehicleId, firebase_id: firebase_uid }).exec();
  }

  /**
   * Create a new vehicle
   */
  static async createVehicle(vehicleData: {
    firebase_id: string;
    user_id?: string;
    vehicle_name?: string;
    make: string;
    vehicle_model: string;
    year: number;
    variant?: string;
    color?: string;
    fuel_type?: string;
    transmission?: string;
    registration_number?: string;
    chassis_number?: string;
    engine_number?: string;
    insurance_details?: any;
    registration_certificate?: string;
    odometer_reading?: number;
    service_interval_km?: number;
    condition_rating?: number;
    known_issues?: string[];
    ownership_type?: string;
    is_primary_vehicle?: boolean;
    is_active?: boolean;
    usual_location?: any;
    average_monthly_km?: number;
    usage_type?: string;
    vehicle_images?: string[];
  }): Promise<IVehicle> {
    await this.ensureConnection();
    
    const vehicle = new Vehicle(vehicleData);
    return await vehicle.save();
  }

  /**
   * Update vehicle information
   */
  static async updateVehicle(vehicleId: string, firebase_uid: string, updateData: {
    user_id?: string;
    vehicle_name?: string;
    make?: string;
    vehicle_model?: string;
    year?: number;
    variant?: string;
    color?: string;
    fuel_type?: string;
    transmission?: string;
    registration_number?: string;
    chassis_number?: string;
    engine_number?: string;
    insurance_details?: any;
    registration_certificate?: string;
    odometer_reading?: number;
    service_interval_km?: number;
    condition_rating?: number;
    known_issues?: string[];
    ownership_type?: string;
    is_primary_vehicle?: boolean;
    is_active?: boolean;
    usual_location?: any;
    average_monthly_km?: number;
    usage_type?: string;
    vehicle_images?: string[];
  }): Promise<IVehicle | null> {
    await this.ensureConnection();
    
    return await Vehicle.findOneAndUpdate(
      { _id: vehicleId, firebase_id: firebase_uid },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete a vehicle (soft delete by setting isActive to false)
   */
  static async deactivateVehicle(vehicleId: string, firebase_uid: string): Promise<IVehicle | null> {
    await this.ensureConnection();
    
    return await this.updateVehicle(vehicleId, firebase_uid, { is_active: false });
  }

  /**
   * Permanently delete a vehicle
   */
  static async deleteVehicle(vehicleId: string, firebase_uid: string): Promise<boolean> {
    await this.ensureConnection();
    
    const result = await Vehicle.deleteOne({ _id: vehicleId, firebase_uid }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Reactivate a vehicle
   */
  static async reactivateVehicle(vehicleId: string, firebase_uid: string): Promise<IVehicle | null> {
    await this.ensureConnection();
    
    return await this.updateVehicle(vehicleId, firebase_uid, { is_active: true });
  }

  /**
   * Search vehicles by make, model, or license plate
   */
  static async searchVehicles(firebase_uid: string, searchText: string, options: VehicleQueryOptions = {}): Promise<IVehicle[]> {
    await this.ensureConnection();
    
    const {
      is_active,
      limit = 50,
      skip = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const searchRegex = new RegExp(searchText, 'i');
    
    const query: any = {
      firebase_id: firebase_uid,
      $or: [
        { make: searchRegex },
        { vehicle_model: searchRegex },
        { registration_number: searchRegex },
        { color: searchRegex }
      ]
    };

    if (is_active !== undefined) {
      query.is_active = is_active;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Vehicle.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get vehicles by make
   */
  static async getVehiclesByMake(firebase_uid: string, make: string, options: VehicleQueryOptions = {}): Promise<IVehicle[]> {
    await this.ensureConnection();
    
    const {
      is_active,
      limit = 50,
      skip = 0,
      sortBy = 'year',
      sortOrder = 'desc'
    } = options;

    const query: any = { firebase_id: firebase_uid, make: new RegExp(make, 'i') };
    
    if (is_active !== undefined) {
      query.is_active = is_active;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Vehicle.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get vehicles by year range
   */
  static async getVehiclesByYearRange(firebase_uid: string, minYear: number, maxYear: number, options: VehicleQueryOptions = {}): Promise<IVehicle[]> {
    await this.ensureConnection();
    
    const {
      is_active,
      limit = 50,
      skip = 0,
      sortBy = 'year',
      sortOrder = 'desc'
    } = options;

    const query: any = {
      firebase_id: firebase_uid,
      year: { $gte: minYear, $lte: maxYear }
    };
    
    if (is_active !== undefined) {
      query.is_active = is_active;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return await Vehicle.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Update vehicle mileage
   */
  static async updateMileage(vehicleId: string, firebase_uid: string, odometer_reading: number): Promise<IVehicle | null> {
    await this.ensureConnection();
    
    return await this.updateVehicle(vehicleId, firebase_uid, { odometer_reading });
  }

  /**
   * Get vehicle count for user
   */
  static async getVehicleCount(firebase_uid: string, is_active?: boolean): Promise<number> {
    await this.ensureConnection();
    
    const query: any = { firebase_id: firebase_uid };
    
    if (is_active !== undefined) {
      query.is_active = is_active;
    }

    return await Vehicle.countDocuments(query).exec();
  }

  /**
   * Get vehicle summary for user
   */
  static async getVehicleSummary(firebase_uid: string): Promise<{
    totalVehicles: number;
    activeVehicles: number;
    inactiveVehicles: number;
    makes: string[];
    averageYear: number;
  }> {
    await this.ensureConnection();
    
    const vehicles = await this.getVehiclesByUserId(firebase_uid);
    
    const summary = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.is_active).length,
      inactiveVehicles: vehicles.filter(v => !v.is_active).length,
      makes: [...new Set(vehicles.map(v => v.make))],
      averageYear: 0
    };

    if (vehicles.length > 0) {
      const totalYears = vehicles.reduce((sum, v) => sum + v.year, 0);
      summary.averageYear = Math.round(totalYears / vehicles.length);
    }

    return summary;
  }
}