export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class TimeUtils {
  /**
   * Get the start and end of today
   */
  static getToday(): DateRange {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Get the start and end of yesterday
   */
  static getYesterday(): DateRange {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Get the start and end of the last 7 days (including today)
   */
  static getLastWeek(): DateRange {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  /**
   * Get the start and end of the last 30 days (including today)
   */
  static getLastMonth(): DateRange {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  /**
   * Get the start and end of a specific date
   */
  static getSpecificDate(dateString: string): DateRange {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Get a custom date range
   */
  static getDateRange(startDateString: string, endDateString: string): DateRange {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (startDate > endDate) {
      throw new Error('Start date cannot be after end date');
    }
    
    // Set to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Get the start and end of current week (Monday to Sunday)
   */
  static getCurrentWeek(): DateRange {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0
    
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + mondayOffset);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Get the start and end of current month
   */
  static getCurrentMonth(): DateRange {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Check if a date is within a range
   */
  static isDateInRange(date: Date, range: DateRange): boolean {
    return date >= range.startDate && date <= range.endDate;
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse various date formats and return a Date object
   */
  static parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // Handle common date formats
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateInput}`);
    }
    
    return date;
  }

  /**
   * Get relative time description (e.g., "today", "yesterday", "last week")
   */
  static getRelativeTimeDescription(date: Date): string {
    const now = new Date();
    const today = TimeUtils.getToday();
    const yesterday = TimeUtils.getYesterday();
    const lastWeek = TimeUtils.getLastWeek();
    
    if (TimeUtils.isDateInRange(date, today)) {
      return 'today';
    } else if (TimeUtils.isDateInRange(date, yesterday)) {
      return 'yesterday';
    } else if (TimeUtils.isDateInRange(date, lastWeek)) {
      return 'this week';
    } else {
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) {
        return `${daysDiff} days ago`;
      } else {
        return `in ${Math.abs(daysDiff)} days`;
      }
    }
  }
}