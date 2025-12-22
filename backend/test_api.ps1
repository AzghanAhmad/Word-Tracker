$baseUrl = "https://word-tracker-production.up.railway.app"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$username = "User$timestamp"
$email = "user$timestamp@example.com"
$password = "Test123!"

# Function to handle requests
function Test-Endpoint {
    param (
        [string]$Method,
        [string]$Url,
        [string]$Body,
        [hashtable]$Headers = @{}
    )
    Write-Host " Testing $Method $Url..." -NoNewline
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Body $Body -ContentType "application/json" -Headers $Headers -ErrorAction Stop
        }
        else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        }
        Write-Host " OK" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "Details: $($reader.ReadToEnd())"
        }
        return $null
    }
}

# 1. Register
Write-Host "`n=== 1. Authentication ==="
$registerBody = @{
    username = $username
    email    = $email
    password = $password
} | ConvertTo-Json

$regResponse = Test-Endpoint -Method "POST" -Url "$baseUrl/auth/register" -Body $registerBody

# 2. Login
$loginBody = @{
    email    = $email
    password = $password
} | ConvertTo-Json

$loginResponse = Test-Endpoint -Method "POST" -Url "$baseUrl/auth/login" -Body $loginBody

if (-not $loginResponse -or -not $loginResponse.success -or -not $loginResponse.token) {
    Write-Host "Login failed, cannot proceed with protected endpoints." -ForegroundColor Red
    exit
}

$token = $loginResponse.token
$headers = @{
    "Authorization" = "Bearer $token"
}
Write-Host "Token acquired."

# 3. Create Plan
Write-Host "`n=== 2. Plans ==="
$planBody = @{
    title                  = "Test Plan $timestamp"
    total_word_count       = 50000
    start_date             = (Get-Date).ToString("yyyy-MM-dd")
    end_date               = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    algorithm_type         = "steady"
    description            = "A test plan description"
    is_private             = $false
    starting_point         = 0
    measurement_unit       = "words"
    is_daily_target        = $false
    fixed_deadline         = $true
    target_finish_date     = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    strategy_intensity     = "Average"
    weekend_approach       = "The Usual"
    reserve_days           = 0
    display_view_type      = "Table"
    week_start_day         = "Mondays"
    grouping_type          = "Day"
    dashboard_color        = "#000000"
    show_historical_data   = $true
    progress_tracking_type = "Daily Goals"
} | ConvertTo-Json

$createPlanResponse = Test-Endpoint -Method "POST" -Url "$baseUrl/plans" -Body $planBody -Headers $headers

# 4. Get Plans
$getPlansResponse = Test-Endpoint -Method "GET" -Url "$baseUrl/plans" -Headers $headers

# 5. Create Checklist
Write-Host "`n=== 3. Checklists ==="
$checklistBody = @{
    name = "Test Checklist $timestamp"
} | ConvertTo-Json

$createChecklistResponse = Test-Endpoint -Method "POST" -Url "$baseUrl/checklists" -Body $checklistBody -Headers $headers

# 6. Get Checklists
$getChecklistsResponse = Test-Endpoint -Method "GET" -Url "$baseUrl/checklists" -Headers $headers

Write-Host "`n=== Test Complete ==="
