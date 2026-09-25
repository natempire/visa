Set-Location -Path "C:\fidea-visa\server"
while ($true) {
    node index.js
    Start-Sleep -Seconds 5
}
