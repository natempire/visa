Set-Location -Path "C:\fidea-visa\server"
while ($true) {
    # Avant de lancer, on vérifie qu'aucun autre serveur n'écoute déjà sur le port 3001.
    # Sans ce contrôle, un redémarrage manuel (ex. pour charger du nouveau code pendant un
    # développement) fait tourner deux instances en même temps : chacune garde sa propre copie
    # de la base en mémoire, et celle qui enregistre en dernier écrase silencieusement les
    # changements de l'autre — c'est ce qui a corrompu des données de test en septembre 2026.
    $portOccupe = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
    if (-not $portOccupe) {
        node index.js
    }
    Start-Sleep -Seconds 5
}
