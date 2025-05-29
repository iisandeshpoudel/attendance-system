# 🚀 Vercel Deployment Guide

## Prerequisites

Before deploying to Vercel, make sure you have:

1. ✅ **Neon Database** set up with the schema from `database-schema.sql`
2. ✅ **GitHub Repository** with your code
3. ✅ **Vercel Account** (free at vercel.com)

## Step-by-Step Deployment

### 1. **Prepare Your Repository**

First, commit and push your code to GitHub:

```bash
git add .
git commit -m "Initial attendance system with working styles"
git push origin main
```

### 2. **Deploy to Vercel**

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project or create new? Create new
# - Project name: attendance-system (or your preferred name)
# - Directory: ./ (current directory)
# - Want to override settings? No
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Choose "Vite" as framework preset
5. Deploy!

### 3. **Configure Environment Variables**

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```env
NEON_DATABASE_URL=your_actual_neon_connection_string
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
VITE_API_URL=https://your-project-name.vercel.app
```

**Important Notes:**
- `NEON_DATABASE_URL`: Your actual Neon database connection string
- `JWT_SECRET`: Generate a secure 32+ character secret
- `VITE_API_URL`: Will be your Vercel app URL (e.g., `https://attendance-system.vercel.app`)

### 4. **Update API URL After First Deploy**

After your first deployment:

1. **Note your Vercel URL** (e.g., `https://attendance-system-abc123.vercel.app`)
2. **Update environment variable**:
   - Go to Vercel dashboard → Settings → Environment Variables
   - Update `VITE_API_URL` to your actual Vercel URL
3. **Redeploy**:
   ```bash
   vercel --prod
   ```

### 5. **Verify Deployment**

After deployment, test:

1. ✅ **Visit your Vercel URL** - should see the login page
2. ✅ **Test login** with `admin@company.com` / `admin123`
3. ✅ **Check styles** - glassmorphism should work
4. ✅ **Test API calls** - check browser network tab

## Automatic Deployments

Vercel will automatically redeploy when you push to your main branch:

```bash
# Make changes, then:
git add .
git commit -m "Your changes"
git push origin main
# Vercel automatically deploys!
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEON_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | `my-super-secret-jwt-key-for-production-use` |
| `VITE_API_URL` | Your Vercel app URL | `https://attendance-system.vercel.app` |

## Troubleshooting

### Common Issues:

1. **API calls fail**
   - Check `VITE_API_URL` matches your Vercel domain
   - Ensure environment variables are set correctly

2. **Database connection fails**
   - Verify `NEON_DATABASE_URL` is correct
   - Check if Neon database is running
   - Ensure you've run the database schema

3. **Build fails**
   - Check for TypeScript errors
   - Ensure all dependencies are in `package.json`

4. **Styles not loading**
   - This should be fixed now with Tailwind CSS v3.4.0
   - Check browser console for CSS errors

### Debug Commands:

```bash
# Check deployment logs
vercel logs

# Force redeploy
vercel --prod --force

# Check environment variables
vercel env ls
```

## Production Checklist

Before going live:

- [ ] Database schema deployed to Neon
- [ ] Environment variables configured in Vercel
- [ ] Default admin user created
- [ ] SSL/HTTPS working (automatic with Vercel)
- [ ] API endpoints responding correctly
- [ ] Authentication flow working
- [ ] Employee dashboard functional

## Next Steps After Deployment

Once deployed successfully:

1. **Test the live system** thoroughly
2. **Create employee users** via admin dashboard (when built)
3. **Continue with Phase 3** - Admin Dashboard development
4. **Add custom domain** (optional, available in Vercel settings)

---

🎉 **Your attendance system will be live and accessible to your team!** 