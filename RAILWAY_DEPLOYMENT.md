# Railway Deployment Guide

## Common 502 Error Fixes

If you're getting a 502 Bad Gateway error on Railway, check the following:

### 1. Environment Variables (CRITICAL)

Make sure these environment variables are set in your Railway project:

#### Required:
- **`DB_CONNECTION`**: Your MySQL connection string from Railway
  - Format: `Server=HOST;Port=PORT;Database=DATABASE;User=USER;Password=PASSWORD;SslMode=Required;`
  - Get this from Railway's MySQL service → Connect → MySQL URL

- **`JWT_SECRET`**: A secure random string for JWT token signing
  - Generate one: `openssl rand -base64 32` or use any long random string
  - Example: `my-super-secret-jwt-key-change-this-in-production-12345`

#### Optional (Railway provides automatically):
- **`PORT`**: Railway automatically sets this - don't override it

### 2. Check Railway Logs

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Deployments" tab
4. Click on the latest deployment
5. Check the "Logs" tab for errors

Common errors to look for:
- `No database connection string found!` → Set `DB_CONNECTION`
- `Database initialization failed` → Check your MySQL connection string
- `Port already in use` → Railway handles this automatically
- `Connection refused` → Database might not be ready yet

### 3. Database Connection String Format

Your `DB_CONNECTION` should look like this:
```
Server=containers-us-west-xxx.railway.app;Port=xxxxx;Database=railway;User=root;Password=xxxxx;SslMode=Required;
```

**Important**: 
- Use `SslMode=Required` (not `None`)
- The host should be the Railway-provided MySQL host
- Don't use `localhost` or `127.0.0.1`

### 4. Verify Service is Running

After deployment:
1. Check that the service shows as "Active" in Railway
2. Check the logs for: `🚀 Word Tracker API starting on http://0.0.0.0:PORT`
3. If you see this message, the server started successfully

### 5. Health Check

The application should respond to:
- `GET /` - Should serve the Angular frontend
- `GET /api/auth/register` - Should return API response (even if error)

### 6. Common Issues

#### Issue: "Application failed to respond"
**Solution**: Check Railway logs. The app might be crashing on startup due to:
- Missing `DB_CONNECTION` environment variable
- Invalid database connection string
- Database not accessible

#### Issue: "502 Bad Gateway"
**Solution**: 
- Server isn't starting → Check logs for startup errors
- Port binding issue → Should be fixed in latest code (uses Railway's PORT)
- Database connection failing → Check `DB_CONNECTION` format

#### Issue: Database connection timeout
**Solution**:
- Verify MySQL service is running in Railway
- Check connection string format
- Ensure `SslMode=Required` is set

### 7. Testing Locally with Railway Database

To test with Railway's database locally:
1. Get your Railway MySQL connection string
2. Set it as `DB_CONNECTION` environment variable
3. Run: `dotnet run --project backend/dotnet_migration_pending`

### 8. Rebuild After Changes

If you make changes to the code:
1. Push to your connected Git repository
2. Railway will automatically rebuild
3. Check the new deployment logs

## Quick Checklist

- [ ] `DB_CONNECTION` environment variable is set in Railway
- [ ] `JWT_SECRET` environment variable is set in Railway
- [ ] MySQL service is running and accessible in Railway
- [ ] Connection string uses `SslMode=Required`
- [ ] Connection string doesn't use `localhost` or `127.0.0.1`
- [ ] Latest code is deployed (check deployment logs)
- [ ] No errors in Railway deployment logs
- [ ] Service shows as "Active" in Railway dashboard

## Need More Help?

Check Railway logs first - they will show exactly what's failing. The most common issue is missing or incorrect `DB_CONNECTION` environment variable.

