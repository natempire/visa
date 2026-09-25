Set-Location -Path "C:\fidea-visa"
$ngrokConfig = "C:\Users\Administrator\AppData\Local\ngrok\ngrok.yml"
while ($true) {
    & ".\ngrok.exe" http 3001 --url=https://grove-dictator-enforced.ngrok-free.dev --config="$ngrokConfig"
    Start-Sleep -Seconds 5
}
