param(
    [int]$MySqlPort = 3306,
    [string]$ApiMode = "auto"
)

function Wait-MySql {
    Write-Host "Waiting for MySQL on port $MySqlPort..."
    for ($i=0; $i -lt 60; $i++) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect("127.0.0.1", $MySqlPort)
            $client.Close()
            Write-Host "MySQL is ready."
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "MySQL not detected on port $MySqlPort."
    return $false
}

function Start-DotNetApi {
    $proj = "d:\0\1\word-t-main\word-t-main\backend\dotnet\WordTracker.Api\WordTracker.Api.csproj"
    if (Test-Path $proj) {
        Write-Host "Starting ASP.NET Core API..."
        dotnet run --project $proj --urls http://0.0.0.0:8080
        return $LASTEXITCODE -eq 0
    }
    return $false
}

function Start-ServerExe {
    $exe = "d:\0\1\word-t-main\word-t-main\backend\server.exe"
    if (Test-Path $exe) {
        Write-Host "Starting Windows backend EXE..."
        & $exe
        return $LASTEXITCODE -eq 0
    }
    return $false
}

function Start-WslServer {
    Write-Host "Starting WSL backend..."
    wsl bash -c "cd /mnt/d/0/1/word-t-main/word-t-main/backend && ./server"
    return $LASTEXITCODE -eq 0
}

if (-not (Wait-MySql)) {
    Write-Host "Warning: MySQL not ready. Continuing anyway..."
}

switch ($ApiMode) {
    "dotnet" { Start-DotNetApi | Out-Null }
    "exe"    { Start-ServerExe  | Out-Null }
    "wsl"    { Start-WslServer  | Out-Null }
    default  {
        if (Get-Command dotnet -ErrorAction SilentlyContinue) {
            Start-DotNetApi | Out-Null
        } elseif (Test-Path "d:\0\1\word-t-main\word-t-main\backend\server.exe") {
            Start-ServerExe | Out-Null
        } else {
            Start-WslServer | Out-Null
        }
    }
}
