# Troubleshooting Guide

## 500 Errors - Database Connection Issues

If you're getting 500 errors from the API endpoints, it's likely due to database connection issues. Here's how to fix them:

### 1. Check Database Connection

First, test if your database is accessible:

```bash
# Test the health endpoint
curl https://ai-launcher-backend-v1.vercel.app/api/health
```

If this returns a 503 error with "database disconnected", you need to set up your database.

### 2. Set Up Database

#### Option A: Use Docker (Recommended for Development)

```bash
# Start the database services
npm run docker:up

# Wait for services to start, then run migrations
npx prisma migrate deploy

# Set up test data
npm run setup:db
```

#### Option B: Use External Database

1. Set up a PostgreSQL database (e.g., on Railway, Supabase, or Neon)
2. Set the `DATABASE_URL` environment variable in Vercel:
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add `DATABASE_URL` with your database connection string

### 3. Environment Variables

Make sure these environment variables are set in Vercel:

```env
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
JWT_SECRET="your-secret-key"
NODE_ENV="production"
```

### 4. Test Your Setup

```bash
# Test database connection
npm run setup:db

# Test API endpoints
npm run test:api
```

### 5. Common Issues

#### Issue: "Database connection failed"
**Solution**: Check your `DATABASE_URL` and ensure the database is running.

#### Issue: "PrismaClientValidationError"
**Solution**: Run database migrations:
```bash
npx prisma migrate deploy
```

#### Issue: "Table does not exist"
**Solution**: The database schema hasn't been created. Run:
```bash
npx prisma db push
```

### 6. Vercel Deployment

For Vercel deployment, make sure:

1. **Environment Variables**: Set all required environment variables in Vercel dashboard
2. **Database**: Use a production-ready database (not localhost)
3. **Build Command**: The build should include Prisma generation:
   ```json
   {
     "scripts": {
       "vercel-build": "npx prisma generate"
     }
   }
   ```

### 7. Debug Steps

1. **Check Vercel Logs**: Go to your Vercel dashboard and check the function logs
2. **Test Health Endpoint**: Use the `/api/health` endpoint to diagnose issues
3. **Check Database**: Ensure your database is accessible from Vercel's servers

### 8. Quick Fix for Testing

If you just want to test the frontend without a real database, you can temporarily modify the API to return mock data:

```javascript
// In api/index.js, replace database queries with mock data
const mockProducts = [
  {
    id: '1',
    title: 'Test Product',
    price: 29.99,
    // ... other fields
  }
]

// Return mock data instead of database queries
```

### 9. Support

If you're still having issues:

1. Check the Vercel function logs
2. Test the health endpoint: `https://ai-launcher-backend-v1.vercel.app/api/health`
3. Ensure all environment variables are set correctly
4. Verify your database is accessible from Vercel's servers
