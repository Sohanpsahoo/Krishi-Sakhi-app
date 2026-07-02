# Temporarily disable Windows Firewall for all profiles to test Expo connectivity
# Run as Administrator

Write-Host "=== Temporarily Disabling Windows Firewall ===" -ForegroundColor Yellow
Write-Host "This is temporary - for testing Expo Go connectivity" -ForegroundColor Yellow
Write-Host ""

# Disable firewall for all profiles
netsh advfirewall set allprofiles state off

Write-Host ""
Write-Host "Firewall is now OFF for all profiles." -ForegroundColor Green
Write-Host "Test your Expo Go app now." -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to RE-ENABLE the firewall..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Re-enable firewall
netsh advfirewall set allprofiles state on
Write-Host ""
Write-Host "Firewall re-enabled." -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
