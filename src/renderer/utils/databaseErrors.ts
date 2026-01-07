/**
 * Database Error Message Utility
 * Provides user-friendly, actionable error messages for database connection issues
 */

export interface ErrorDetails {
  message: string;
  suggestion?: string;
  action?: string;
  category: 'network' | 'authentication' | 'database' | 'permission' | 'configuration' | 'unknown';
}

/**
 * Parse database error and return user-friendly message with suggestions
 */
export function parseDatabaseError(error: unknown): ErrorDetails {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network/Connection Errors
  if (
    lowerMessage.includes('connection refused') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('cannot connect') ||
    lowerMessage.includes('connection timeout') ||
    lowerMessage.includes('etimedout')
  ) {
    return {
      message: 'Cannot connect to database server',
      suggestion: 'The database server is not reachable. Please check:',
      action: '• Is the database server running?\n• Is the host address correct?\n• Is the port number correct?\n• Is there a firewall blocking the connection?',
      category: 'network',
    };
  }

  // Authentication Errors
  if (
    lowerMessage.includes('authentication failed') ||
    lowerMessage.includes('password authentication failed') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('login failed') ||
    lowerMessage.includes('password') && lowerMessage.includes('incorrect')
  ) {
    return {
      message: 'Authentication failed',
      suggestion: 'Invalid username or password. Please verify your credentials.',
      action: '• Check your username and password\n• Ensure the user account exists in the database\n• Verify the user has proper permissions\n• If you forgot your password, contact your database administrator',
      category: 'authentication',
    };
  }

  // Database Not Found Errors
  if (
    lowerMessage.includes('database') && lowerMessage.includes('does not exist') ||
    lowerMessage.includes('unknown database') ||
    lowerMessage.includes('database not found') ||
    lowerMessage.includes('catalog') && lowerMessage.includes('does not exist')
  ) {
    return {
      message: 'Database not found',
      suggestion: 'The specified database does not exist on the server.',
      action: '• Verify the database name is correct\n• Create the database if it doesn\'t exist\n• Check if you have permission to access this database',
      category: 'database',
    };
  }

  // Permission Errors
  if (
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('insufficient privileges') ||
    lowerMessage.includes('not authorized')
  ) {
    return {
      message: 'Permission denied',
      suggestion: 'Your user account does not have sufficient permissions.',
      action: '• Contact your database administrator to grant necessary permissions\n• Verify your user role has access to this database\n• Check if you need specific privileges (CREATE, ALTER, etc.)',
      category: 'permission',
    };
  }

  // SSL/TLS Errors
  if (
    lowerMessage.includes('ssl') ||
    lowerMessage.includes('tls') ||
    lowerMessage.includes('certificate')
  ) {
    return {
      message: 'SSL/TLS connection error',
      suggestion: 'There was an issue with the secure connection.',
      action: '• Check SSL/TLS configuration\n• Verify certificate settings\n• Ensure the server supports SSL connections',
      category: 'configuration',
    };
  }

  // SQLite Specific Errors
  if (
    lowerMessage.includes('sqlite') ||
    lowerMessage.includes('no such file') ||
    lowerMessage.includes('cannot open database')
  ) {
    if (lowerMessage.includes('locked')) {
      return {
        message: 'Database is locked',
        suggestion: 'The SQLite database file is currently in use by another process.',
        action: '• Close other applications using this database\n• Wait a few seconds and try again\n• Check if another instance of OmniLedger is running',
        category: 'database',
      };
    }
    if (lowerMessage.includes('no such file') || lowerMessage.includes('cannot open')) {
      return {
        message: 'Database file not found',
        suggestion: 'The SQLite database file does not exist at the specified path.',
        action: '• Verify the file path is correct\n• Check if the directory exists\n• Ensure you have read/write permissions to the file location',
        category: 'database',
      };
    }
  }

  // Port/Configuration Errors
  if (
    lowerMessage.includes('port') ||
    lowerMessage.includes('address already in use') ||
    lowerMessage.includes('bind')
  ) {
    return {
      message: 'Port configuration error',
      suggestion: 'There is an issue with the port configuration.',
      action: '• Verify the port number is correct\n• Check if the port is already in use\n• Ensure the port is not blocked by firewall',
      category: 'configuration',
    };
  }

  // Generic/Unknown Errors
  return {
    message: 'Connection failed',
    suggestion: 'An unexpected error occurred while connecting to the database.',
    action: `Error details: ${errorMessage}\n\n• Verify all connection settings are correct\n• Check database server logs for more information\n• Ensure network connectivity is working`,
    category: 'unknown',
  };
}

/**
 * Format error details for display in UI
 */
export function formatErrorForDisplay(errorDetails: ErrorDetails): string {
  let formatted = `❌ ${errorDetails.message}\n\n`;
  
  if (errorDetails.suggestion) {
    formatted += `${errorDetails.suggestion}\n\n`;
  }
  
  if (errorDetails.action) {
    formatted += `${errorDetails.action}`;
  }
  
  return formatted;
}

/**
 * Get error category icon/color
 */
export function getErrorCategoryColor(category: ErrorDetails['category']): string {
  switch (category) {
    case 'network':
      return 'text-orange-600 dark:text-orange-400';
    case 'authentication':
      return 'text-red-600 dark:text-red-400';
    case 'database':
      return 'text-blue-600 dark:text-blue-400';
    case 'permission':
      return 'text-purple-600 dark:text-purple-400';
    case 'configuration':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

