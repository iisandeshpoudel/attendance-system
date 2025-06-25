# 📋 Employee Attendance System

## 🎯 Quick Start Guide

### For Employees
1. **Check In**: Start your work day by clicking "Check In"
2. **Take Breaks**: Use the break timer for lunch and coffee breaks
3. **Check Out**: End your day with a detailed work log (minimum 30 characters)
4. **Real-Time Tracking**: Your dashboard updates every 30 seconds

### For Admins
1. **Monitor Team**: Real-time view of all employee activities
2. **Manage Users**: Create and delete employee accounts
3. **Export Data**: Download attendance reports in CSV/JSON format
4. **System Settings**: Configure work policies and break limits

---

## 📊 Current Features

### ✅ **Employee Dashboard**
- **Time Tracking**: Check-in/out with live timer (accurate, persistent, and seconds-precise)
- **Break Management**: Start/end breaks with live break timer
- **Work Log**: Required detailed notes for checkout
- **Status Display**: Real-time working time and break time
- **Policy Info**: Current work mode and break limits shown

### ✅ **Admin Dashboard** 
- **Live Monitoring**: See all employees' status in real-time
- **Employee Management**: Create/delete accounts
- **Data Export**: Export attendance data with filtering
- **Analytics**: Productivity insights with charts and metrics
- **System Control**: Configure work hours, break limits, and policies
- **Audit Trail**: View all system actions with color-coded, readable logs (pagination coming soon)

### ✅ **System Modes**
- **Standard Mode**: Normal work hours (9-5), 60min break limit, weekend restrictions
- **Flexible Mode**: No time restrictions, unlimited breaks, weekend work allowed
- **Admin Control**: Toggle between modes instantly for holidays/special projects

---

## 🚀 Final Sprint Improvements (2025)
- **Timer Logic Refactor**: All timers (Total Time, Net Working, Breaks) now use backend timestamps and a live ticking clock for perfect accuracy, even after refresh or tab switch.
- **Consistent Time Formatting**: All durations use a shared `formatHMS` utility for `hh:mm:ss` display across dashboards and exports.
- **Live Break Timer**: Break timer ticks in real-time during active breaks.
- **Reduced Polling**: Dashboard only refreshes on load and after actions, not every 30s.
- **Bug Fixes**: Fixed camelCase/snake_case mismatch, timer persistence, and break timer issues.
- **Audit Trail Polish**: Logs are now readable, color-coded, and pretty-printed with clear section headers and cards. Fixed frontend crash on log parsing.
- **Scalability**: Audit trail pagination (Next/Previous) is planned to handle large datasets.

---

## 🔧 System Settings

### **Work Policies** (Admin Configurable)
- **Work Hours**: Default 9:00 AM - 5:00 PM
- **Break Limit**: Maximum 60 minutes per day in Standard Mode
- **Weekend Work**: Restricted in Standard Mode, allowed in Flexible Mode
- **Work Log**: Required 30+ character description at checkout

### **System Modes**
- **Standard Mode**: ✅ All policies enforced
- **Flexible Mode**: 🍃 No restrictions (holidays/projects)

---

## 🚀 Access Information

### **Login**
- **Admin**: admin@bichitras.com / sandeshisdone
- **Employees**: Created by admin through user management

### **Live System**
- **URL**: https://attendance-5ql1jrmc7-sandesh-poudels-projects-b7a3c8c6.vercel.app
- **Updates**: Real-time refresh every 30 seconds (now only on load/action)
- **Export**: Available in CSV and JSON formats

---

## 💡 Quick Tips

### **For Employees**
- Check-in as soon as you start work
- Use break timer for accurate tracking
- Write detailed work logs (what you accomplished)
- Check your status card for current policies

### **For Admins**
- Use Flexible Mode for holidays or special projects
- Export data regularly for payroll and reporting
- Monitor break patterns in analytics dashboard
- Set appropriate work policies for your team
- Use the audit trail for system activity review (pagination coming soon)

---

**Last Updated**: June 2025  
**Status**: Production-Ready ✅