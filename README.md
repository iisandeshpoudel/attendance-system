# Remote Employee Attendance Tracking System

A modern, glassmorphism-styled attendance tracking system built for remote teams. Features real-time check-in/out, break tracking, admin dashboard, and CSV exports.

## 🚀 Features

### Employee Features
- ✅ Check-in/Check-out with timestamps
- ⏰ Multiple break tracking (start/stop)
- 📝 Daily notes and remarks
- 📊 Personal attendance history
- 🔒 Secure authentication

### Admin Features
- 👥 Real-time employee monitoring
- 📈 Attendance dashboard and analytics
- 👤 Employee management (add/remove)
- 📄 CSV export functionality
- 📊 Comprehensive reports

### Technical Features
- 🌙 Dark theme with purple glassmorphism UI
- 📱 Mobile-responsive design
- 🔐 JWT authentication with bcrypt
- ⚡ Serverless architecture (Vercel)
- 🗄️ PostgreSQL database (Neon DB)
- 🆓 Completely free deployment

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Vercel Serverless Functions
- **Database**: Neon DB (PostgreSQL)
- **Authentication**: JWT + bcrypt
- **Styling**: Tailwind CSS v3
- **Deployment**: Vercel (free tier)

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Neon DB account (free)
- Vercel account (free)

### Setup Steps

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd attendance-system
npm install
```

2. **Environment Setup:**
```bash
# Copy environment template
cp env.example .env

# Add your environment variables:
NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
VITE_API_URL=http://localhost:3000
```

3. **Database Setup:**
- Create a Neon DB database
- Run the SQL schema from `database-schema.sql`
- Default admin login: `admin@company.com` / `admin123`

4. **Development:**
```bash
npm run dev
```

5. **Production Deployment:**
```bash
# Deploy to Vercel
vercel --prod

# Or build locally
npm run build
npm run preview
```

## 🏗️ Project Structure

```
attendance-system/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── auth/          # Login components
│   │   ├── employee/      # Employee dashboard
│   │   ├── admin/         # Admin dashboard
│   │   └── shared/        # Reusable components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── context/           # React Context providers
│   ├── utils/             # Utility functions
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── api/
│   ├── auth/             # Authentication endpoints
│   ├── attendance/       # Attendance endpoints
│   ├── breaks/           # Break tracking endpoints
│   └── admin/            # Admin endpoints
├── vercel.json           # Vercel configuration
├── tailwind.config.js    # Tailwind configuration
└── database-schema.sql   # Database schema
```

## 🔐 Authentication

### Default Users
- **Admin**: `admin@company.com` / `admin123`
- **Employee**: Create via admin dashboard

### API Authentication
All API routes (except login) require JWT token:
```javascript
Authorization: Bearer <jwt-token>
```

## 📊 Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `name` - Full name
- `password` - Bcrypt hashed password
- `role` - 'admin' or 'employee'
- `created_at` - Timestamp

### Attendance Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `date` - Date (unique per user)
- `check_in` - Check-in timestamp
- `check_out` - Check-out timestamp
- `total_hours` - Calculated hours
- `notes` - Daily notes
- `status` - Record status

### Breaks Table
- `id` - Primary key
- `attendance_id` - Foreign key to attendance
- `break_start` - Break start timestamp
- `break_end` - Break end timestamp
- `break_duration` - Duration in minutes
- `break_note` - Break notes

## 🎨 Design System

### Colors
- **Primary Purple**: `#8b5cf6`, `#7c3aed`, `#6d28d9`
- **Background**: Dark gradient (`#1e1b4b` to `#312e81`)
- **Glass Effects**: `bg-white/10` with backdrop blur

### Components
- `.glass` - Base glassmorphism effect
- `.glass-button` - Interactive buttons
- `.glass-input` - Form inputs
- `.glass-card` - Content cards

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Attendance
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out
- `GET /api/attendance/today` - Today's record
- `GET /api/attendance/history` - User history

### Breaks
- `POST /api/breaks/start` - Start break
- `POST /api/breaks/end` - End break

### Admin
- `GET /api/admin/employees` - All employees
- `GET /api/admin/reports` - Attendance reports
- `GET /api/admin/export` - CSV export
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users` - Delete user

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Standards
- Modern React hooks (useState, useEffect, useContext)
- Proper error handling with try-catch
- Loading states for all async operations
- Tailwind utility classes (no custom CSS)
- TypeScript for type safety

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables (Vercel)
```
NEON_DATABASE_URL=your-neon-db-url
JWT_SECRET=your-jwt-secret
VITE_API_URL=https://your-vercel-domain.vercel.app
```

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with 24h expiration
- Input validation on all forms
- SQL injection prevention
- CORS configuration
- Environment variable protection

## 📈 Business Logic

- **Auto-checkout**: Automatic checkout at midnight if forgotten
- **Break tracking**: Break time subtracted from total hours
- **Unique records**: One attendance record per user per day
- **Role-based access**: Admins can modify past records
- **Data integrity**: Foreign key constraints and validations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email your-email@company.com or create an issue on GitHub.

---

**Built with ❤️ for remote teams**
