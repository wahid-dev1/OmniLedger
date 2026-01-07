# Using Database Configuration - User Guide

## Overview

This guide explains how to use the database configuration after it's been set up. The application now includes enhanced connection verification and initialization to ensure your database is ready to use.

---

## Using an Existing Configuration

When you click **"Use Existing Configuration"**, the application will:

### Step 1: Verify Connection ✅
- Tests the database connection to ensure it's accessible
- Verifies network connectivity (for remote databases)
- Checks authentication credentials
- Shows real-time progress indicators

### Step 2: Check Database Schema 📋
- Verifies that all required database tables exist
- Checks if the database is properly initialized
- Shows migration status

### Step 3: Initialize if Needed 🔧
- If tables don't exist, prompts you to initialize
- Creates all required tables for OmniLedger
- Optionally seeds with sample data (first time only)

### Step 4: Ready to Use 🎉
- Once verified and initialized, navigates to the main screen
- You can now create companies and start using the application

---

## Connection Process Flow

```
┌─────────────────────────────────────┐
│  Click "Use Existing Configuration" │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  1. Test Connection                 │
│     ⏳ Testing connection...         │
│     ✓ Connection successful         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Check Database Schema           │
│     ⏳ Checking database schema...   │
│     ✓ Database schema verified       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Initialize (if needed)         │
│     ⏳ Initializing database...     │
│     ✓ Database initialized          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Ready!                          │
│     ✅ Database ready to use        │
│     → Navigate to main screen       │
└─────────────────────────────────────┘
```

---

## What Happens Behind the Scenes

### Connection Testing
- **SQLite**: Validates file path and accessibility
- **Remote Databases**: Tests network connectivity, authentication, and database access

### Schema Verification
- Checks if core tables exist (companies, users, products, etc.)
- Verifies database structure is correct
- Identifies if initialization is needed

### Initialization
- Creates all required tables
- Sets up relationships and constraints
- Optionally loads sample data for testing

---

## Error Handling

If any step fails, you'll see:

### Connection Errors
- **Network Issues**: "Cannot connect to database server"
  - Check if database server is running
  - Verify host and port settings
  - Check firewall settings

- **Authentication Errors**: "Authentication failed"
  - Verify username and password
  - Check user permissions
  - Ensure user exists in database

- **Database Errors**: "Database not found"
  - Verify database name is correct
  - Create database if it doesn't exist
  - Check user has access permissions

### Schema Errors
- **Tables Missing**: Prompt to initialize database
- **Migration Issues**: Clear error message with troubleshooting steps

---

## Visual Indicators

### Connection Status
- 🟢 **Connected**: Database is ready
- 🟡 **Testing**: Connection in progress
- 🔴 **Disconnected**: Connection failed

### Progress Steps
- ⏳ **In Progress**: Step is being executed
- ✓ **Success**: Step completed successfully
- ❌ **Failed**: Step encountered an error

---

## Best Practices

### Before Using Configuration
1. **Test Connection First**: Use "Test Connection" button to verify settings
2. **Check Migration Status**: Ensure database is up to date
3. **Verify Credentials**: Make sure username/password are correct

### For Production
1. **Use SSL/TLS**: Enable SSL for secure connections
2. **Backup First**: Always backup before initializing
3. **Test in Staging**: Test configuration in staging environment first

### Troubleshooting
1. **Check Logs**: Review console for detailed error messages
2. **Verify Settings**: Double-check all connection parameters
3. **Test Manually**: Try connecting with database client tools
4. **Copy Error Details**: Use "Copy Error Details" button for support

---

## Quick Actions

### Test Connection
- Click "Test Connection" to verify without initializing
- Shows step-by-step progress
- Displays detailed error messages if failed

### Sync Tables
- Click "Sync Tables" to update database schema
- Creates missing tables
- Updates existing structure if needed

### Edit Configuration
- Click "Edit Configuration" to modify settings
- Update connection parameters
- Change database type or credentials

---

## Connection Profiles

If you have multiple connection profiles:

1. **Switch Profile**: Click "Switch" on any profile
2. **Active Profile**: Highlighted profile is currently active
3. **Delete Profile**: Remove unused profiles
4. **Save as Profile**: Save current config as new profile

---

## Next Steps After Configuration

Once your database is connected and ready:

1. **Create Company**: Set up your first company
2. **Add Products**: Start adding inventory items
3. **Configure Accounts**: Set up chart of accounts
4. **Start Using**: Begin managing inventory and sales

---

## Support

If you encounter issues:

1. Check error messages for specific guidance
2. Use "Copy Error Details" to share with support
3. Verify database server is accessible
4. Check network and firewall settings
5. Review database logs for additional information

---

## Technical Details

### Database Initialization
- Creates ~24 core tables
- Sets up foreign key relationships
- Configures indexes for performance
- Optionally seeds sample data

### Connection Management
- Connections are cached for performance
- Automatic reconnection on failure
- Connection pooling for remote databases
- SQLite optimized with WAL mode

### Security
- Passwords are encrypted in storage
- SSL/TLS support for secure connections
- Connection strings are masked in logs
- No credentials in error messages

