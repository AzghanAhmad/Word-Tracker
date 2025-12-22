$baseUrl = "shuttle.proxy.rlwy.net"
$d = Get-Date -Format "yyyyMMddHHmmss"
$userEmail = "audit_$d@test.com"
$userPass = "WiGhctjnxmSBDWukfTiCLzvLGrXRmQdt"

function Test-Endpoint {
    param($Method, $Url, $Body, $Token)
    Write-Host " testing $Method $Url ... " -NoNewline
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Method $Method -Uri $Url -Body $json -ContentType "application/json" -Headers $headers -ErrorAction Stop
        }
        else {
            $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
        }
        Write-Host "[OK]" -ForegroundColor Green
        return $response
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        $msg = $_.Exception.Message
        Write-Host "[FAILED] $status - $msg" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== API 2.0 AUDIT ===" -ForegroundColor Cyan
Write-Host "User: $userEmail"

# 1. Auth exhaust
$reg = Test-Endpoint "POST" "$baseUrl/auth/register" @{username = "audituser"; email = $userEmail; password = $userPass }
$login = Test-Endpoint "POST" "$baseUrl/auth/login" @{email = $userEmail; password = $userPass }
$token = $login.token
if (-not $token) { Write-Host "No Token!"; exit }

# 2. Plans CRUD
$p = Test-Endpoint "POST" "$baseUrl/plans" @{title = "My Novel"; total_word_count = 50000; start_date = "2025-01-01"; end_date = "2025-12-31"; algorithm_type = "linear" } $token
$pid = $p.id
Write-Host "Created Plan ID: $pid"

$plans = Test-Endpoint "GET" "$baseUrl/plans" $null $token
if ($plans.Count -ge 1) { Write-Host "List Plans Passed" -ForegroundColor Green }

$onePlan = Test-Endpoint "GET" "$baseUrl/plans?id=$pid" $null $token
if ($onePlan.title -eq "My Novel") { Write-Host "Get Single Plan Passed" -ForegroundColor Green }

$del = Test-Endpoint "DELETE" "$baseUrl/plans?id=$pid" $null $token
# Verify Delete
$check = Test-Endpoint "GET" "$baseUrl/plans?id=$pid" $null $token
if (-not $check) { Write-Host "Delete Plan Verified (404)" -ForegroundColor Green }

# 3. Checklists
$cl = Test-Endpoint "POST" "$baseUrl/checklists" @{name = "My List" } $token
$clid = $cl.id
$listCL = Test-Endpoint "GET" "$baseUrl/checklists" $null $token
if ($listCL.Count -ge 1) { Write-Host "List Checklists Passed" -ForegroundColor Green }

# 4. Challenges
$c = Test-Endpoint "POST" "$baseUrl/challenges" @{title = "NaNoWriMo"; type = "month"; goal_count = 50000; start_date = "2025-11-01" } $token
$cid = $c.id
$listC = Test-Endpoint "GET" "$baseUrl/challenges" $null $token
if ($listC.Count -ge 1) { Write-Host "Challenges Listed" -ForegroundColor Green }

Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
