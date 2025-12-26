$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080"

# 1. Login to get token
$loginBody = @{
    email    = "apitest2@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Got Token: $token"
}
catch {
    Write-Host "Login Failed. Attempting to register apitest3..."
    $regBody = @{
        username = "apitest3"
        email    = "apitest3@example.com"
        password = "password123"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    
    $loginBody2 = @{
        email    = "apitest3@example.com"
        password = "password123"
    } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody2 -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Got Token (new user): $token"
}

# 2. Create Plan
$planBody = @{
    title                  = "Test Plan PowerShell"
    total_word_count       = 50000
    start_date             = "2024-01-01"
    end_date               = "2024-02-01"
    algorithm_type         = "steady"
    description            = "A test plan created via script"
    is_private             = $false
    starting_point         = 0
    measurement_unit       = "words"
    is_daily_target        = $true
    fixed_deadline         = $true
    strategy_intensity     = "Average"
    weekend_approach       = "The Usual"
    reserve_days           = 0
    display_view_type      = "Calendar"
    week_start_day         = "Monday"
    grouping_type          = "Day"
    dashboard_color        = "#6366f1"
    show_historical_data   = $true
    progress_tracking_type = "Daily Goals"
} | ConvertTo-Json

Write-Host "Sending Plan Payload..."
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/plans" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $planBody -ContentType "application/json"
    Write-Host "Create Plan Response: $($response | ConvertTo-Json -Depth 5)"
}
catch {
    Write-Host "Create Plan Failed: $_"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Error Body: $responseBody"
}
