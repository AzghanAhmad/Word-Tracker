# Proxy Not Working - Fix Steps

## The Problem
Getting `404 (Not Found)` on `http://localhost:4200/api/auth/register` means the Angular proxy is not forwarding requests to the backend.

## Solution Steps

### Step 1: Stop Frontend Server
Press `Ctrl+C` in the terminal where frontend is running.

### Step 2: Verify Backend is Running
Open browser and go to: `http://localhost:8080/`
- ✅ Should see JSON with API info
- ❌ If 404 or connection error, start backend first:
  ```powershell
  cd backend\dotnet_migration_pending
  dotnet run
  ```

### Step 3: Restart Frontend with Proxy
```powershell
cd frontend
npm start
```

**Important:** The proxy only works when using `ng serve` (Angular dev server), not with a static file server.

### Step 4: Check Proxy is Active
When you start the frontend, you should see in the terminal:
```
** Angular Live Development Server is listening on localhost:4200 **
```

If you see proxy-related logs, that's good. The proxy should automatically forward `/api/*` requests.

### Step 5: Test Again
1. Open `http://localhost:4200/register`
2. Fill in the form
3. Click Register
4. Check Network tab - request should still show `localhost:4200/api/auth/register` but it should work now

## Alternative: Use Direct Backend URL (If Proxy Still Doesn't Work)

If proxy still doesn't work after restart, you can temporarily use direct backend URL:

### Update `environment.development.ts`:
```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080',  // Direct backend URL
    apiPrefix: ''
};
```

**Note:** This will cause CORS issues unless backend CORS is configured correctly (which it is).

## Verify Proxy Configuration

### Check `proxy.conf.json` exists:
- Location: `frontend/proxy.conf.json`
- Content should match what we set

### Check `angular.json`:
- Should have `"proxyConfig": "proxy.conf.json"` in serve options
- Should also be in development configuration

## Debug Proxy

### Check if proxy is working:
1. Open browser console
2. Run this:
```javascript
fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', email: 'test@test.com', password: 'test123' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

If this works, proxy is working. If it gives 404, proxy is not active.

## Common Issues

### Issue: Proxy config not found
**Error:** `Proxy config file not found`
**Solution:** Make sure `proxy.conf.json` is in the `frontend/` directory (same level as `angular.json`)

### Issue: Backend not running
**Error:** `ECONNREFUSED` or connection error
**Solution:** Start backend on port 8080

### Issue: Port conflict
**Error:** Port 4200 or 8080 already in use
**Solution:** 
- Kill process using the port
- Or change port in `angular.json` or backend config

## Quick Test Commands

### Test Backend Directly:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing
```

### Test Backend Register:
```powershell
$body = @{ username = "test"; email = "test@test.com"; password = "test123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/auth/register" -Method Post -Body $body -ContentType "application/json"
```

If these work, backend is fine. The issue is just the proxy connection.

