# 🗄️ Neon Database Console Cleanup Guide

## 🎯 Direct Database Cleanup Method
This is the most efficient way to clean your database - directly through Neon's web console.

## 🔧 Step-by-Step Process

### Step 1: Access Neon Console
1. Go to [Neon Console](https://console.neon.tech)
2. Sign in to your account
3. Select your attendance system project
4. Click on **"SQL Editor"** in the left sidebar

### Step 2: Clean All Data
Run these SQL commands in order (respecting foreign key constraints):

```sql
-- 1. Clear audit logs first (references users)
DELETE FROM audit_logs;

-- 2. Clear breaks (references attendance)
DELETE FROM breaks;

-- 3. Clear attendance records (references users)
DELETE FROM attendance;

-- 4. Clear work policies (references users)
DELETE FROM work_policies;

-- 5. Clear system settings (references users)
DELETE FROM system_settings;

-- 6. Clear all users (including old admin)
DELETE FROM users;
```

### Step 3: Reset Sequences
Reset all auto-increment sequences to start from 1:

```sql
-- Reset all sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
ALTER SEQUENCE breaks_id_seq RESTART WITH 1;
ALTER SEQUENCE system_settings_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE work_policies_id_seq RESTART WITH 1;
```

### Step 4: Create New Admin
Create the new admin user with secure credentials:

```sql
-- Create new admin user (password will be hashed by the app)
INSERT INTO users (email, name, password, role) 
VALUES ('admin@bichitras.com', 'Admin User', '$2b$12$your_hashed_password_here', 'admin');
```

**Note**: The password needs to be hashed. You can either:
- Use the `/api/setup` endpoint after cleanup to create admin
- Or hash the password manually using bcrypt

### Step 5: Restore System Settings
Add default system settings:

```sql
-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, updated_by)
VALUES 
  ('system_configuration_enabled', 'true', 1),
  ('work_start_time', '09:00', 1),
  ('work_end_time', '17:00', 1),
  ('break_duration_limit', '60', 1),
  ('overtime_threshold', '8', 1),
  ('auto_checkout_time', '18:00', 1),
  ('weekend_work_allowed', 'false', 1),
  ('break_reminders_enabled', 'true', 1),
  ('auto_refresh_interval', '30', 1);
```

## 🚀 Alternative: One-Command Cleanup

If you want to do everything in one go, you can use this single command:

```sql
-- Complete cleanup and reset in one transaction
BEGIN;

-- Clear all data
DELETE FROM audit_logs;
DELETE FROM breaks;
DELETE FROM attendance;
DELETE FROM work_policies;
DELETE FROM system_settings;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
ALTER SEQUENCE breaks_id_seq RESTART WITH 1;
ALTER SEQUENCE system_settings_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE work_policies_id_seq RESTART WITH 1;

COMMIT;
```

Then run the setup API once to create admin and settings:

```bash
curl -X POST https://attendance-5ql1jrmc7-sandesh-poudels-projects-b7a3c8c6.vercel.app/api/setup
```

## ✅ Advantages of Neon Console Method

### 🎯 **Zero API Usage**
- No Vercel API calls consumed
- No function execution time used
- No cold start delays

### 🚀 **Faster Execution**
- Direct database access
- No HTTP overhead
- Immediate results

### 🔧 **More Control**
- See exactly what's happening
- Can verify each step
- Can rollback if needed

### 💰 **Cost Effective**
- No serverless function costs
- No API call limits
- No execution time limits

## 🛡️ Safety Tips

### ⚠️ **Before You Start**
1. **Backup** (if needed) - though this is a fresh start
2. **Verify** you're in the correct database
3. **Test** on a copy first if unsure

### ✅ **Verification Commands**
After cleanup, verify the database is clean:

```sql
-- Check if tables are empty
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM attendance;
SELECT COUNT(*) FROM breaks;
SELECT COUNT(*) FROM system_settings;
SELECT COUNT(*) FROM audit_logs;
SELECT COUNT(*) FROM work_policies;

-- All should return 0
```

## 🎯 Expected Results

After completing the cleanup:

1. **✅ All tables empty** - No existing data
2. **✅ Sequences reset** - All IDs start from 1
3. **✅ New admin ready** - admin@bichitras.com / sandeshisdone
4. **✅ System ready** - Default settings restored
5. **✅ Zero API cost** - No Vercel function calls used

## 🔄 After Cleanup

1. **Create Admin**: Use `/api/setup` endpoint once
2. **Test Login**: admin@bichitras.com / sandeshisdone
3. **Create Employees**: Through admin dashboard
4. **Configure Settings**: As needed

---

**Status**: Most Efficient Method ✅  
**API Usage**: Zero ✅  
**Cost**: Free ✅  
**Last Updated**: January 2025 