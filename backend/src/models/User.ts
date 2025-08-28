import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebase_uid: string;
  email: string;
  is_active: boolean;
  successful_referrals_count: number;
  role_id: string;
  custom_permissions: string[];
  mfa_enabled: boolean;
  session_preferences: {
    timeout_minutes: number;
    device_restrictions: string[];
    ip_whitelist: string[];
  };
  profile_completion: {
    basic_info: boolean;
    contact_verified: boolean;
    car_info: boolean;
    license_verified: boolean;
    emergency_contact: boolean;
    preferences: boolean;
    completion_percentage: number;
  };
  achievements: {
    welcome_bonus: boolean;
    first_drive: boolean;
    first_review: boolean;
    social_connections: string[];
    one_time_achievements: string[];
  };
  streak_data: {
    current_daily_streak: number;
    longest_daily_streak: number;
    last_activity_date: Date;
  };
  driving_stats: {
    total_distance_km: number;
    total_trips: number;
    eco_score_average: number;
    safety_violations: number;
    night_drives: number;
    weekend_drives: number;
  };
  created_at: Date;
  role_assigned_at: Date;
  last_permission_update: Date;
  createdAt: Date;
  updatedAt: Date;
  last_sign_in: Date;
}

const UserSchema: Schema = new Schema({
  firebase_uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  successful_referrals_count: {
    type: Number,
    default: 0
  },
  role_id: {
    type: String,
    required: true
  },
  custom_permissions: [{
    type: String
  }],
  mfa_enabled: {
    type: Boolean,
    default: false
  },
  session_preferences: {
    timeout_minutes: {
      type: Number,
      default: 60
    },
    device_restrictions: [{
      type: String
    }],
    ip_whitelist: [{
      type: String
    }]
  },
  profile_completion: {
    basic_info: {
      type: Boolean,
      default: false
    },
    contact_verified: {
      type: Boolean,
      default: false
    },
    car_info: {
      type: Boolean,
      default: false
    },
    license_verified: {
      type: Boolean,
      default: false
    },
    emergency_contact: {
      type: Boolean,
      default: false
    },
    preferences: {
      type: Boolean,
      default: false
    },
    completion_percentage: {
      type: Number,
      default: 0
    }
  },
  achievements: {
    welcome_bonus: {
      type: Boolean,
      default: false
    },
    first_drive: {
      type: Boolean,
      default: false
    },
    first_review: {
      type: Boolean,
      default: false
    },
    social_connections: [{
      type: String
    }],
    one_time_achievements: [{
      type: String
    }]
  },
  streak_data: {
    current_daily_streak: {
      type: Number,
      default: 0
    },
    longest_daily_streak: {
      type: Number,
      default: 0
    },
    last_activity_date: {
      type: Date
    }
  },
  driving_stats: {
    total_distance_km: {
      type: Number,
      default: 0
    },
    total_trips: {
      type: Number,
      default: 0
    },
    eco_score_average: {
      type: Number,
      default: 0
    },
    safety_violations: {
      type: Number,
      default: 0
    },
    night_drives: {
      type: Number,
      default: 0
    },
    weekend_drives: {
      type: Number,
      default: 0
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  role_assigned_at: {
    type: Date,
    default: Date.now
  },
  last_permission_update: {
    type: Date,
    default: Date.now
  },
  last_sign_in: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ firebase_uid: 1 });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);