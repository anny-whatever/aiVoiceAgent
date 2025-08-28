import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  sid: string;
  firebase_uid: string;
  startLat: number;
  startLong: number;
  startAddress: string;
  endLat: number;
  endLong: number;
  endAddress: string;
  distance: number;
  coins: number;
  totalDistance: number;
  pointsPerKm: number;
  rewardPoints: number;
  start_time: Date;
  end_time: Date;
  duration_seconds: number;
  max_speed_kmh: number;
  average_speed_kmh: number;
  eco_score: number;
  safety_violations: number;
  harsh_braking_count: number;
  harsh_acceleration_count: number;
  sharp_turn_count: number;
  speeding_violations: number;
  is_first_drive_today: boolean;
  is_weekend_drive: boolean;
  is_night_drive: boolean;
  is_morning_commute: boolean;
  status: string;
  bonus_multipliers_applied: {
    eco_driving: number;
    first_drive: boolean;
    long_distance: number;
    night_driving: number;
    weekend: number;
    safety_penalty: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema: Schema = new Schema({
  sid: {
    type: String,
    required: true,
    index: true
  },
  firebase_uid: {
    type: String,
    required: true,
    index: true
  },
  startLat: {
    type: Number,
    required: true
  },
  startLong: {
    type: Number,
    required: true
  },
  startAddress: {
    type: String,
    required: true
  },
  endLat: {
    type: Number,
    required: true
  },
  endLong: {
    type: Number,
    required: true
  },
  endAddress: {
    type: String,
    required: true
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  coins: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    required: true,
    min: 0
  },
  pointsPerKm: {
    type: Number,
    default: 10
  },
  rewardPoints: {
    type: Number,
    default: 0
  },
  start_time: {
    type: Date,
    required: true,
    index: true
  },
  end_time: {
    type: Date,
    required: true
  },
  duration_seconds: {
    type: Number,
    required: true,
    min: 0
  },
  max_speed_kmh: {
    type: Number,
    default: 0
  },
  average_speed_kmh: {
    type: Number,
    default: 0
  },
  eco_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  safety_violations: {
    type: Number,
    default: 0
  },
  harsh_braking_count: {
    type: Number,
    default: 0
  },
  harsh_acceleration_count: {
    type: Number,
    default: 0
  },
  sharp_turn_count: {
    type: Number,
    default: 0
  },
  speeding_violations: {
    type: Number,
    default: 0
  },
  is_first_drive_today: {
    type: Boolean,
    default: false
  },
  is_weekend_drive: {
    type: Boolean,
    default: false
  },
  is_night_drive: {
    type: Boolean,
    default: false
  },
  is_morning_commute: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  bonus_multipliers_applied: {
    eco_driving: {
      type: Number,
      default: 1
    },
    first_drive: {
      type: Boolean,
      default: false
    },
    long_distance: {
      type: Number,
      default: 1
    },
    night_driving: {
      type: Number,
      default: 1
    },
    weekend: {
      type: Number,
      default: 1
    },
    safety_penalty: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  collection: 'trips'
});

// Compound indexes for efficient time-based queries// Indexes for performance
TripSchema.index({ firebase_uid: 1, start_time: -1 });
TripSchema.index({ firebase_uid: 1, status: 1, start_time: -1 });
TripSchema.index({ firebase_uid: 1, createdAt: -1 });
TripSchema.index({ sid: 1 });
TripSchema.index({ start_time: -1 });
TripSchema.index({ firebase_uid: 1, is_first_drive_today: 1 });
TripSchema.index({ firebase_uid: 1, is_weekend_drive: 1 });
TripSchema.index({ firebase_uid: 1, is_morning_commute: 1 });

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);