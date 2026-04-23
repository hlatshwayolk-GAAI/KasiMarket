# Robust Kasi Market Launcher
$projectDir = "C:\Users\lenovo\Documents\AI GAAI projects\Kasi Market"
Set-Location $projectDir

$port = 5173
$portActive = netstat -ano | findstr ":$port " | findstr "LISTENING"

if (!$portActive) {
    # Start via CMD
    Start-Process cmd -ArgumentList "/c npm run dev" -WindowStyle Hidden -WorkingDirectory $projectDir
    
    $timeout = 60
    while (!(netstat -ano | findstr ":$port " | findstr "LISTENING") -and $timeout -gt 0) {
        Start-Sleep -Seconds 1
        $timeout--
    }
}

Start-Process "msedge.exe" -ArgumentList "--app=http://localhost:$port"
