#!/usr/bin/env bash
# Sauvegarde chiffrée de tous les cabinets (restic), chaque nuit par fidea-visa-sauvegarde.timer.
# Utilise le dépôt restic de FIDEA Saisie (/etc/fidea-saisie/serveur.env), sous l'étiquette
# « visa » : ses rotations ne touchent pas aux sauvegardes de FIDEA Saisie.
#
#   sudo /opt/fidea-visa/bin/sauvegarder.sh
#
# La base (fidea.db) est toujours écrite d'un bloc (fichier temporaire puis renommage, db.js) :
# une copie du fichier est donc cohérente même pendant l'utilisation. Son intégrité est vérifiée
# avant l'envoi.
#
# Restauration d'un cabinet (cabinet arrêté) :
#   sudo bash -c 'set -a; source /etc/fidea-saisie/serveur.env; restic snapshots --tag visa'
#   ... restic restore <snapshot> --target /tmp/restauration --include /srv/fidea-visa/<code>
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source /etc/fidea-saisie/serveur.env
set +a
[[ -n "${RESTIC_REPOSITORY:-}" ]] || { echo "RESTIC_REPOSITORY vide dans /etc/fidea-saisie/serveur.env" >&2; exit 1; }

alerte() {   # alerte "" (succès) | alerte /fail "message"
    [[ -n "${ALERTE_URL_SAUVEGARDE_VISA:-}" ]] || return 0
    curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${2:-}" "${ALERTE_URL_SAUVEGARDE_VISA}$1" || true
}
trap 'alerte /fail "Sauvegarde FIDEA VISA en échec sur $(hostname) (ligne $LINENO)"' ERR

for base in /srv/fidea-visa/*/fidea.db; do
    [[ -f "$base" ]] || continue
    copie="$(mktemp)"
    cp "$base" "$copie"
    verdict="$(python3 -c 'import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute("PRAGMA integrity_check").fetchone()[0])' "$copie")"
    rm -f "$copie"
    [[ "$verdict" == "ok" ]] || { echo "Base $base corrompue : $verdict" >&2; false; }
done

restic backup /srv/fidea-visa /etc/fidea-visa --tag visa
restic forget --tag visa --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune

alerte ""
echo "Sauvegarde FIDEA VISA terminée."
