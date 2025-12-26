$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:8080"
$email = "apitest@example.com"
$password = "password123"

Write-Host "1. Registering User..."
try {
    $body = @{
        username = "apitest"
        email = $email
        password = $password
    } | ConvertTo-Json

    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Registration Response: $($regResponse | ConvertTo-Json -Depth 2)"
} catch {
    Write-Host "Registration failed (user likely exists): $_"
}

Write-Host "`n2. Logging in..."
try {
    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    
    if ($loginResponse.success) {
        $token = $loginResponse.token
        Write-Host "Login Successful! Token: $token"
        
        Write-Host "`n3. Testing Get Plans..."
        $headers = @{ Authorization = "Bearer $token" }
        $plans = Invoke-RestMethod -Uri "$baseUrl/plans" -Method Get -Headers $headers
        Write-Host "Plans: $($plans | ConvertTo-Json -Depth 2)"

        if ($plans.success -eq $true -or $plans.data) {
             Write-Host "API Audit Passed: Login and Get Plans successful."
        } else {
             Write-Host "API Audit Failed: Get Plans returned unexpected structure."
        }

    } else {
        Write-Host "Login Failed: $($loginResponse.message)"
    }
} catch {
    Write-Host "Login/Plans Request Failed: $_"
    exit 1
}
