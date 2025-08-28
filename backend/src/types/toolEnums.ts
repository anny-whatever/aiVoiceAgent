/**
 * Tool parameter enums for AI agent function calling
 * Based on OpenAI function calling best practices
 */

// Driving data query types
export enum DrivingDataQueryType {
  RECENT_TRIPS = "recent_trips",
  LAST_N_TRIPS = "last_n_trips", 
  TODAY = "today",
  YESTERDAY = "yesterday",
  THIS_WEEK = "this_week",
  LAST_WEEK = "last_week",
  THIS_MONTH = "this_month",
  DRIVING_HISTORY = "driving_history"
}

// User info query types
export enum UserInfoQueryType {
  STREAK = "streak",
  DRIVING_STATS = "driving_stats",
  PROFILE = "profile",
  ACHIEVEMENTS = "achievements",
  GENERAL = "general"
}

// Vehicle info query types
export enum VehicleInfoQueryType {
  PRIMARY_VEHICLE = "primary_vehicle",
  ALL_VEHICLES = "all_vehicles",
  INSURANCE = "insurance",
  CONDITION = "condition",
  GENERAL = "general"
}

// Mood assessment response types
export enum MoodResponseType {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  EXCITED = "excited",
  TIRED = "tired",
  STRESSED = "stressed",
  HAPPY = "happy",
  FRUSTRATED = "frustrated"
}

// Tool parameter validation schemas
export const TOOL_PARAMETER_SCHEMAS = {
  get_driving_data: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The firebase_uid of the user whose trip data to retrieve"
      },
      queryType: {
        type: "string",
        enum: Object.values(DrivingDataQueryType),
        description: "Type of driving data query to execute"
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Number of trips to retrieve (only for recent/last_n queries)",
        default: 5
      }
    },
    required: ["userId", "queryType"]
  },
  
  get_user_info: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The firebase_uid of the user whose data to retrieve"
      },
      queryType: {
        type: "string",
        enum: Object.values(UserInfoQueryType),
        description: "Type of user information to retrieve"
      }
    },
    required: ["userId", "queryType"]
  },
  
  get_vehicle_info: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The firebase_uid of the user whose vehicle data to retrieve"
      },
      queryType: {
        type: "string",
        enum: Object.values(VehicleInfoQueryType),
        description: "Type of vehicle information to retrieve"
      }
    },
    required: ["userId", "queryType"]
  },
  
  assess_user_mood: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The firebase_uid of the user"
      },
      userResponse: {
        type: "string",
        description: "The user's response text to analyze for mood"
      },
      sessionId: {
        type: "string",
        description: "The current session identifier"
      },
      expectedMoodType: {
        type: "string",
        enum: Object.values(MoodResponseType),
        description: "Expected mood category based on response analysis"
      }
    },
    required: ["userId", "userResponse", "sessionId"]
  }
};

// Query type mapping for backward compatibility
export const QUERY_TYPE_MAPPINGS = {
  // Driving data mappings
  "recent trips": DrivingDataQueryType.RECENT_TRIPS,
  "recent": DrivingDataQueryType.RECENT_TRIPS,
  "last trips": DrivingDataQueryType.LAST_N_TRIPS,
  "last": DrivingDataQueryType.LAST_N_TRIPS,
  "today": DrivingDataQueryType.TODAY,
  "yesterday": DrivingDataQueryType.YESTERDAY,
  "this week": DrivingDataQueryType.THIS_WEEK,
  "week": DrivingDataQueryType.LAST_WEEK,
  "last week": DrivingDataQueryType.LAST_WEEK,
  "this month": DrivingDataQueryType.THIS_MONTH,
  "month": DrivingDataQueryType.THIS_MONTH,
  "driving history": DrivingDataQueryType.DRIVING_HISTORY,
  
  // User info mappings
  "streak": UserInfoQueryType.STREAK,
  "driving stats": UserInfoQueryType.DRIVING_STATS,
  "stats": UserInfoQueryType.DRIVING_STATS,
  "profile": UserInfoQueryType.PROFILE,
  "achievements": UserInfoQueryType.ACHIEVEMENTS,
  
  // Vehicle info mappings
  "primary vehicle": VehicleInfoQueryType.PRIMARY_VEHICLE,
  "primary": VehicleInfoQueryType.PRIMARY_VEHICLE,
  "main vehicle": VehicleInfoQueryType.PRIMARY_VEHICLE,
  "all vehicles": VehicleInfoQueryType.ALL_VEHICLES,
  "vehicles": VehicleInfoQueryType.ALL_VEHICLES,
  "insurance": VehicleInfoQueryType.INSURANCE,
  "condition": VehicleInfoQueryType.CONDITION,
  "issues": VehicleInfoQueryType.CONDITION
};

/**
 * Maps a natural language query to a structured query type
 */
export function mapQueryToType(query: string, toolName: string): string {
  const queryLower = query.toLowerCase();
  
  // Check direct mappings first
  for (const [key, value] of Object.entries(QUERY_TYPE_MAPPINGS)) {
    if (queryLower.includes(key)) {
      return value;
    }
  }
  
  // Default fallbacks based on tool
  switch (toolName) {
    case 'get_driving_data':
      return DrivingDataQueryType.RECENT_TRIPS;
    case 'get_user_info':
      return UserInfoQueryType.GENERAL;
    case 'get_vehicle_info':
      return VehicleInfoQueryType.GENERAL;
    default:
      return 'general';
  }
}

/**
 * Extracts number from query string for limit parameter
 */
export function extractLimitFromQuery(query: string): number {
  const numberMatch = query.match(/\b(\d+)\b/);
  return numberMatch ? Math.min(parseInt(numberMatch[1]), 10) : 5;
}