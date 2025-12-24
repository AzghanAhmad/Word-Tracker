# Test API endpoints
Write-Host "Testing Word Tracker API..." -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method Get
    Write-Host "   ✓ Health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure the backend is running on port 8080" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test register endpoint
Write-Host "2. Testing register endpoint..." -ForegroundColor Yellow
$registerBody = @{
    username = "testuser"
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "   ✓ Register successful: $($register.message)" -ForegroundColor Green
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   Response: $($errorResponse.message)" -ForegroundColor $(if ($_.Exception.Response.StatusCode -eq 409) { "Yellow" } else { "Red" })
}

Write-Host ""

# Test login endpoint
Write-Host "3. Testing login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "   ✓ Login successful: $($login.user.username)" -ForegroundColor Green
    Write-Host "   Token received: $($login.token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   ✗ Login failed: $($errorResponse.message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan

