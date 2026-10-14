# Chaque nuit (tâche planifiée FIDEA-VISA-Rapatriement, 04:00) : copie au cabinet des données du
# cabinet FIDEA hébergées sur le serveur (base + documents des missions), en plus de la sauvegarde
# chiffrée faite sur le serveur. Si le serveur ou l'hébergeur disparaît, le cabinet garde tout.
#
# La base est toujours écrite d'un bloc par l'application (fichier temporaire puis renommage) :
# une archive prise pendant l'utilisation est cohérente.
$ErrorActionPreference = 'Stop'
$cible = 'C:\fidea-visa\server\data\copies-vps'
$garder = 14
New-Item -ItemType Directory -Force -Path $cible | Out-Null

$fichier = Join-Path $cible ("fidea_{0}.tar.gz" -f (Get-Date -Format 'yyyyMMdd_HHmm'))
$partiel = "$fichier.partiel"
# cmd /c : PowerShell 5.1 abîmerait un flux binaire redirigé avec >.
cmd /c "C:\Windows\System32\OpenSSH\ssh.exe -o BatchMode=yes fidea-vps ""sudo tar -czf - -C /srv/fidea-visa fidea"" > ""$partiel"""
if ($LASTEXITCODE -ne 0) { Remove-Item -Force $partiel -ErrorAction SilentlyContinue; throw "Copie échouée (code $LASTEXITCODE)" }
if ((Get-Item $partiel).Length -lt 1MB) { Remove-Item -Force $partiel; throw 'Copie anormalement petite' }
Move-Item -Force $partiel $fichier

Get-ChildItem $cible -Filter 'fidea_*.tar.gz' | Sort-Object Name -Descending | Select-Object -Skip $garder | Remove-Item -Force
Write-Output "Copie : $fichier ($([math]::Round((Get-Item $fichier).Length / 1MB)) Mo)"
