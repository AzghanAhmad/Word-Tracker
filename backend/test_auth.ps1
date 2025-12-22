# Test authentication and database
Write-Host "=== Testing Word Tracker API ===" -ForegroundColor Cyan

# Test 1: Check if server is running
Write-Host "`n1. Testing server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "shuttle.proxy.rlwy.net:8080/" -Method GET -UseBasicParsing
    $content = $response.Content | ConvertFrom-Json
    Write-Host "✓ Server is running: $($content.message)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Server is not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Try to access /plans without auth (should fail)
Write-Host "`n2. Testing /plans without authentication..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "shuttle.proxy.rlwy.net/plans" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "✗ Unexpected success - should have been unauthorized" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Correctly returned 401 Unauthorized" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Check if we can register a test user
Write-Host "`n3. Attempting to register a test user..." -ForegroundColor Yellow
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$testUser = @{
    username = "testuser_$timestamp"
    email    = "test_$timestamp@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://word-tracker-production.up.railway.app/auth/register" -Method POST -Body $testUser -ContentType "application/json" -UseBasicParsing
    Write-Host "✓ User registered successfully" -ForegroundColor Green
    
    # Test 4: Login with the new user
    Write-Host "`n4. Logging in with test user..." -ForegroundColor Yellow
    $userObj = $testUser | ConvertFrom-Json
    $loginData = @{
        email    = $userObj.email
        password = $userObj.password
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "https://word-tracker-production.up.railway.app/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing
    $loginResult = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginResult.success -and $loginResult.data.token) {
        Write-Host "✓ Login successful!" -ForegroundColor Green
        Write-Host "  Token: $($loginResult.data.token.Substring(0, 20))..." -ForegroundColor Gray
        Write-Host "  User ID: $($loginResult.data.user_id)" -ForegroundColor Gray
        
        # Test 5: Access /plans with auth token
        Write-Host "`n5. Testing /plans with authentication..." -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $($loginResult.data.token)"
        }
        
        $plansResponse = Invoke-WebRequest -Uri "https://word-tracker-production.up.railway.app/plans" -Method GET -Headers $headers -UseBasicParsing
        $plansResult = $plansResponse.Content | ConvertFrom-Json
        
        if ($plansResult.success) {
            Write-Host "✓ Successfully accessed /plans endpoint" -ForegroundColor Green
            Write-Host "  Plans found: $($plansResult.data.Count)" -ForegroundColor Gray
        }
        else {
            Write-Host "✗ Failed to access /plans" -ForegroundColor Red
        }
    }
    else {
        Write-Host "✗ Login failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Registration/Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
