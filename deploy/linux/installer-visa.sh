#!/usr/bin/env bash
# Installe FIDEA VISA sur un serveur où le kit FIDEA Saisie est déjà installé (Caddy, restic,
# pare-feu, mises à jour automatiques : voir installer-serveur.sh de FIDEA Saisie). À lancer une
# seule fois ; les versions suivantes passent par mettre-a-jour.sh.
#
#   sudo bash installer-visa.sh /tmp/fidea-visa-<date>-<commit>.tar.gz
set -euo pipefail

ARCHIVE="$(realpath "${1:?Usage : $0 <archive.tar.gz>}")"
[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }
command -v caddy >/dev/null || { echo "Caddy absent : installez d'abord le kit FIDEA Saisie." >&2; exit 1; }
exec </dev/null

echo "== Node.js"
DEBIAN_FRONTEND=noninteractive apt-get install -y -q nodejs npm
node --version

echo "== Dossiers"
install -d -m 755 /opt/fidea-visa /opt/fidea-visa/bin /opt/fidea-visa/versions
install -d -m 711 /srv/fidea-visa
install -d -m 750 /etc/fidea-visa

echo "== Première version"
tmp="$(mktemp -d)"
tar -xzf "$ARCHIVE" -C "$tmp" ./deploy/linux
install -m 755 "$tmp"/deploy/linux/*.sh /opt/fidea-visa/bin/
rm -rf "$tmp"
/opt/fidea-visa/bin/mettre-a-jour.sh "$ARCHIVE"

systemctl enable --now fidea-visa-sauvegarde.timer
cat <<'FIN'

FIDEA VISA installé. Ensuite, pour chaque cabinet :
  sudo /opt/fidea-visa/bin/nouvelle-instance.sh <code> "<Nom du cabinet>" <code>.visa.saisie.app
FIN
