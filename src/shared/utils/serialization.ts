/**
 * Serialization utilities for IPC communication
 * Converts Prisma types to JSON-serializable formats
 */

/**
 * Check if a value is a Prisma Decimal type
 */
function isDecimal(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  
  // Check for Decimal-specific methods
  if (typeof value.toNumber === 'function' && typeof value.toString === 'function') {
    // Additional check: Decimal has specific properties
    if (value.d !== undefined || value.e !== undefined || value.s !== undefined) {
      return true;
    }
    // Try to detect by constructor name
    if (value.constructor?.name === 'Decimal' || value.constructor?.name === 'default') {
      return true;
    }
  }
  
  return false;
}

/**
 * Serialize a Prisma result for IPC transmission
 * Converts Decimal to number and Date to ISO string
 */
export function serializeForIPC(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Date objects first (before other object checks)
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Decimal types (from Prisma) - must check before general object handling
  if (isDecimal(data)) {
    try {
      return parseFloat(data.toString());
    } catch {
      // Fallback to 0 if conversion fails
      return 0;
    }
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeForIPC(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key) && key !== 'toNumber' && key !== 'toFixed') {
        try {
          serialized[key] = serializeForIPC(data[key]);
        } catch (error) {
          // Skip properties that can't be serialized
          console.warn(`Skipping non-serializable property: ${key}`, error);
        }
      }
    }
    return serialized;
  }

  // Primitive types pass through
  return data;
}
