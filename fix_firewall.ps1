# Run this script as Administrator to fix firewall for Expo + Backend
# Removes old rules and creates fresh ones for all profiles

Write-Host "=== Fixing Windows Firewall for Expo & Backend ===" -ForegroundColor Cyan

# Remove any old rules first
$ruleNames = @("Expo Metro 8081", "Expo Metro 8082", "Expo Metro 8087", "Backend API 8083", "Node.js Expo", "Node.js Backend")
foreach ($name in $ruleNames) {
    netsh advfirewall firewall delete rule name="$name" 2>$null | Out-Null
}
Write-Host "[1/4] Cleaned old firewall rules" -ForegroundColor Green

# Add inbound TCP rules for all profiles (Domain, Private, Public)
$ports = @(
    @{Name="Expo Metro 8081"; Port=8081},
    @{Name="Expo Metro 8082"; Port=8082},
    @{Name="Expo Metro 8087"; Port=8087},
    @{Name="Backend API 8083"; Port=8083}
)

foreach ($p in $ports) {
    netsh advfirewall firewall add rule name="$($p.Name)" dir=in action=allow protocol=TCP localport=$($p.Port) profile=any | Out-Null
    netsh advfirewall firewall add rule name="$($p.Name) OUT" dir=out action=allow protocol=TCP localport=$($p.Port) profile=any | Out-Null
    Write-Host "  Opened port $($p.Port) (in+out, all profiles)" -ForegroundColor Yellow
}
Write-Host "[2/4] Added firewall rules" -ForegroundColor Green

# Also allow Node.js through firewall entirely
$nodePath = (Get-Command node).Source
Write-Host "  Node.js path: $nodePath"
netsh advfirewall firewall add rule name="Node.js (Expo/Backend)" dir=in action=allow program="$nodePath" profile=any enable=yes | Out-Null
netsh advfirewall firewall add rule name="Node.js (Expo/Backend) OUT" dir=out action=allow program="$nodePath" profile=any enable=yes | Out-Null
Write-Host "[3/4] Allowed node.exe through firewall" -ForegroundColor Green

# Verify
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
netsh advfirewall firewall show rule name="Expo Metro 8081" | Select-String "Rule Name|Enabled|Action|LocalPort|Profiles"
netsh advfirewall firewall show rule name="Backend API 8083" | Select-String "Rule Name|Enabled|Action|LocalPort|Profiles"
netsh advfirewall firewall show rule name="Node.js (Expo/Backend)" | Select-String "Rule Name|Enabled|Action|Program|Profiles"

Write-Host "`n[4/4] All done! You can close this window." -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
