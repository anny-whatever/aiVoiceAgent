import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  user_id: string;
  firebase_id: string;
  vehicle_name: string;
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
  insurance_details?: {
    policy_number: string;
    provider: string;
    expiry_date: Date;
    coverage_type: string;
  };
  registration_certificate?: {
    rc_number: string;
    registered_owner: string;
    registration_date: Date;
    validity_until: Date;
  };
  odometer_reading?: number;
  service_interval_km?: number;
  condition_rating?: number;
  known_issues?: string[];
  ownership_type?: string;
  is_primary_vehicle: boolean;
  is_active: boolean;
  usual_location?: {
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  average_monthly_km?: number;
  usage_type?: string;
  vehicle_images?: string[];
  created_at: Date;
  updated_at: Date;
}

const VehicleSchema: Schema = new Schema({
  user_id: {
    type: String,
    required: true
  },
    firebase_id: {
    type: String,
    required: true
  },
  vehicle_name: {
    type: String,
    required: true
  },
  make: {
    type: String,
    required: true
  },
  vehicle_model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  variant: {
    type: String
  },
  color: {
    type: String
  },
  fuel_type: {
    type: String,
    enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'petrol', 'cng']
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic', 'cvt']
  },
  registration_number: {
    type: String
  },
  chassis_number: {
    type: String
  },
  engine_number: {
    type: String
  },
  insurance_details: {
    policy_number: {
      type: String
    },
    provider: {
      type: String
    },
    expiry_date: {
      type: Date
    },
    coverage_type: {
      type: String
    }
  },
  registration_certificate: {
    rc_number: {
      type: String
    },
    registered_owner: {
      type: String
    },
    registration_date: {
      type: Date
    },
    validity_until: {
      type: Date
    }
  },
  odometer_reading: {
    type: Number,
    default: 0
  },
  service_interval_km: {
    type: Number,
    default: 10000
  },
  condition_rating: {
    type: Number,
    min: 1,
    max: 10
  },
  known_issues: [{
    type: String
  }],
  ownership_type: {
    type: String,
    enum: ['owned', 'leased', 'financed']
  },
  is_primary_vehicle: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  usual_location: {
    city: {
      type: String
    },
    state: {
      type: String
    },
    coordinates: {
      lat: {
        type: Number
      },
      lng: {
        type: Number
      }
    }
  },
  average_monthly_km: {
    type: Number,
    default: 0
  },
  usage_type: {
    type: String,
    enum: ['personal', 'commercial', 'mixed']
  },
  vehicle_images: [{
    type: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'vehicles'
});

// Indexes for performance
VehicleSchema.index({ firebase_id: 1 });
VehicleSchema.index({ user_id: 1 });
VehicleSchema.index({ firebase_id: 1, is_active: 1 });
VehicleSchema.index({ created_at: -1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);