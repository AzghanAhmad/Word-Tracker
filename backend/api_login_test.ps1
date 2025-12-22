param(
  [string]$BaseUrl = "http://127.0.0.1:8080"
)

function Test-Endpoint {
  param([string]$Url)
  try {
    Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10 | Out-Null
    return $true
  } catch {
    return $false
  }
}

$fallback = "https://word-tracker-production.up.railway.app"
$fallback2 = "https://shuttle.proxy.rlwy.net"
if (-not (Test-Endpoint "$BaseUrl/")) {
  Write-Host "Base '$BaseUrl' not reachable, using fallback '$fallback'" -ForegroundColor Yellow
  $BaseUrl = $fallback
  if (-not (Test-Endpoint "$BaseUrl/")) {
    Write-Host "Fallback '$fallback' not reachable, trying '$fallback2'" -ForegroundColor Yellow
    $BaseUrl = $fallback2
  }
}

$ts = Get-Date -Format 'yyyyMMddHHmmss'
$user = [pscustomobject]@{
  username = "user_$ts"
  email    = "user_$ts@example.com"
  password = "TestPass123!"
}

Write-Host "Registering: $($user.email) at $BaseUrl" -ForegroundColor Cyan
try {
  $reg = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -ContentType "application/json" -Body ($user | ConvertTo-Json)
  $reg | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Register failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.Content) {
    Write-Host $_.Exception.Response.Content
  }
  exit 1
}

Write-Host "Logging in..." -ForegroundColor Cyan
$loginBody = [pscustomobject]@{
  email    = $user.email
  password = $user.password
}
try {
  $login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body ($loginBody | ConvertTo-Json)
  $login | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.Content) {
    Write-Host $_.Exception.Response.Content
  }
  exit 1
}

if ($login.token) {
  $token = $login.token
} elseif ($login.data -and $login.data.token) {
  $token = $login.data.token
} else {
  Write-Host "No token in login response" -ForegroundColor Red
  exit 1
}

Write-Host "Calling /plans with Bearer token..." -ForegroundColor Cyan
try {
  $headers = @{ Authorization = "Bearer $token" }
  $plans = Invoke-RestMethod -Uri "$BaseUrl/plans" -Method Get -Headers $headers
  $plans | ConvertTo-Json -Depth 5
  Write-Host "API test complete." -ForegroundColor Green
} catch {
  Write-Host "Plans fetch failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.Content) {
    Write-Host $_.Exception.Response.Content
  }
  exit 1
}
