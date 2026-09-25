# Copies fidea.db to a timestamped backup, and prunes old backups beyond the retention count.
$dbPath = "C:\fidea-visa\server\data\fidea.db"
$backupDir = "C:\fidea-visa\server\data\backups"
$retentionCount = 60  # ~15 days of history at one backup every 6 hours

if (-not (Test-Path $dbPath)) {
    Write-Output "fidea.db not found, skipping backup."
    exit 0
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dest = Join-Path $backupDir "fidea_$stamp.db"
Copy-Item -Path $dbPath -Destination $dest -Force

$backups = Get-ChildItem -Path $backupDir -Filter "fidea_*.db" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt $retentionCount) {
    $backups | Select-Object -Skip $retentionCount | Remove-Item -Force
}

Write-Output "Backup written: $dest ($($backups.Count) backups retained)"
