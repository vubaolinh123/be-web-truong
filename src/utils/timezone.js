/**
 * Timezone Utility Module
 * Handles timezone conversion for Vietnam timezone (UTC+7)
 */

import moment from 'moment-timezone';

// Vietnam timezone constant
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Convert UTC date to Vietnam timezone
 * @param {Date|string} date - Date to convert
 * @returns {string} - ISO string with Vietnam timezone offset
 */
export const toVietnamTime = (date) => {
  if (!date) return null;
  
  try {
    return moment(date).tz(VIETNAM_TIMEZONE).format();
  } catch (error) {
    console.error('Error converting to Vietnam timezone:', error);
    return null;
  }
};

/**
 * Convert Vietnam timezone to UTC for database storage
 * @param {Date|string} date - Date to convert
 * @returns {Date} - UTC Date object
 */
export const toUTC = (date) => {
  if (!date) return null;
  
  try {
    return moment.tz(date, VIETNAM_TIMEZONE).utc().toDate();
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return null;
  }
};

/**
 * Get current time in Vietnam timezone
 * @returns {string} - Current time in Vietnam timezone ISO format
 */
export const getCurrentVietnamTime = () => {
  return moment().tz(VIETNAM_TIMEZONE).format();
};

/**
 * Get current UTC time for database operations
 * @returns {Date} - Current UTC Date object
 */
export const getCurrentUTC = () => {
  return new Date();
};

/**
 * Format date for Vietnam locale
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment.js format string (default: 'DD/MM/YYYY HH:mm:ss')
 * @returns {string} - Formatted date string
 */
export const formatVietnamDate = (date, format = 'DD/MM/YYYY HH:mm:ss') => {
  if (!date) return null;
  
  try {
    return moment(date).tz(VIETNAM_TIMEZONE).format(format);
  } catch (error) {
    console.error('Error formatting Vietnam date:', error);
    return null;
  }
};

/**
 * Transform timestamps in object to Vietnam timezone
 * @param {Object} obj - Object containing timestamp fields
 * @param {Array} fields - Array of field names to transform (default: ['createdAt', 'updatedAt'])
 * @returns {Object} - Object with transformed timestamps
 */
export const transformTimestamps = (obj, fields = ['createdAt', 'updatedAt']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const transformed = { ...obj };
  
  fields.forEach(field => {
    if (transformed[field]) {
      transformed[field] = toVietnamTime(transformed[field]);
    }
  });
  
  return transformed;
};

/**
 * Transform timestamps in array of objects
 * @param {Array} array - Array of objects
 * @param {Array} fields - Array of field names to transform
 * @returns {Array} - Array with transformed timestamps
 */
export const transformTimestampsArray = (array, fields = ['createdAt', 'updatedAt']) => {
  if (!Array.isArray(array)) return array;
  
  return array.map(item => transformTimestamps(item, fields));
};

/**
 * Middleware function to transform response timestamps
 * @param {Array} additionalFields - Additional timestamp fields to transform
 * @returns {Function} - Express middleware function
 */
export const timestampTransformMiddleware = (additionalFields = []) => {
  const defaultFields = ['createdAt', 'updatedAt'];
  const allFields = [...defaultFields, ...additionalFields];

  // Safe recursive function to transform timestamps with circular reference protection
  const transformNestedTimestamps = (obj, visited = new WeakSet()) => {
    if (!obj || typeof obj !== 'object') return obj;

    // Prevent circular references
    if (visited.has(obj)) return obj;
    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => transformNestedTimestamps(item, visited));
    }

    // Create a new object to avoid modifying the original
    const transformed = {};

    // Only process plain objects and avoid Mongoose-specific properties
    Object.keys(obj).forEach(key => {
      // Skip Mongoose internal properties and functions
      if (key.startsWith('_') || key.startsWith('$') || typeof obj[key] === 'function') {
        transformed[key] = obj[key];
        return;
      }

      const value = obj[key];

      // Transform timestamp fields
      if (allFields.includes(key) && value) {
        transformed[key] = toVietnamTime(value);
      }
      // Recursively transform nested objects and arrays
      else if (value && typeof value === 'object') {
        // Only recurse into plain objects and arrays, not complex objects like Mongoose documents
        if (Array.isArray(value) || value.constructor === Object || value.constructor === undefined) {
          transformed[key] = transformNestedTimestamps(value, visited);
        } else {
          transformed[key] = value;
        }
      }
      // Copy primitive values
      else {
        transformed[key] = value;
      }
    });

    return transformed;
  };

  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      if (data && typeof data === 'object') {
        try {
          data = transformNestedTimestamps(data);
        } catch (error) {
          console.error('Error transforming timestamps:', error);
          // If transformation fails, return original data
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Mongoose transform function for JSON output
 * @param {Object} doc - Mongoose document
 * @param {Object} ret - Plain object representation
 * @param {Array} additionalFields - Additional timestamp fields to transform
 * @returns {Object} - Transformed object
 */
export const mongooseTimestampTransform = (additionalFields = []) => {
  const defaultFields = ['createdAt', 'updatedAt'];
  const allFields = [...defaultFields, ...additionalFields];

  return function(doc, ret) {
    // Transform timestamps to Vietnam timezone
    allFields.forEach(field => {
      if (ret[field]) {
        ret[field] = toVietnamTime(ret[field]);
      }
    });

    // Remove version key
    delete ret.__v;

    return ret;
  };
};

/**
 * Validate timezone offset for Vietnam
 * @param {string} dateString - ISO date string
 * @returns {boolean} - True if date has correct Vietnam timezone offset
 */
export const isVietnamTimezone = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = moment(dateString);
    const vietnamDate = moment().tz(VIETNAM_TIMEZONE);
    const offset = vietnamDate.utcOffset();
    
    return date.utcOffset() === offset;
  } catch (error) {
    return false;
  }
};

/**
 * Get timezone info for Vietnam
 * @returns {Object} - Timezone information
 */
export const getVietnamTimezoneInfo = () => {
  const now = moment().tz(VIETNAM_TIMEZONE);
  
  return {
    timezone: VIETNAM_TIMEZONE,
    offset: now.format('Z'),
    offsetMinutes: now.utcOffset(),
    isDST: now.isDST(),
    abbreviation: now.format('z'),
    currentTime: now.format()
  };
};

export default {
  VIETNAM_TIMEZONE,
  toVietnamTime,
  toUTC,
  getCurrentVietnamTime,
  getCurrentUTC,
  formatVietnamDate,
  transformTimestamps,
  transformTimestampsArray,
  timestampTransformMiddleware,
  mongooseTimestampTransform,
  isVietnamTimezone,
  getVietnamTimezoneInfo
};
