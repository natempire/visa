#!/usr/bin/env bash
# Sur le poste du cabinet (Git Bash) : archive de la version validée, interface déjà construite,
# à envoyer au serveur. L'interface est construite ici et non sur le serveur : la construction
# React demande plus de mémoire que le serveur (4 Go) ne peut en offrir à côté des instances.
#
#   deploy/linux/preparer-archive.sh      → dist/fidea-visa-<date>-<commit>.tar.gz
#   scp dist/fidea-visa-....tar.gz fidea-vps:/tmp/
#   ssh fidea-vps sudo /opt/fidea-visa/bin/mettre-a-jour.sh /tmp/fidea-visa-....tar.gz
#
# Seul ce qui est committé part (git archive) : server/data, .env et les fichiers marqués
# export-ignore dans .gitattributes restent au cabinet. Les modifications non committées sont
# refusées, pour que l'interface construite corresponde exactement au code de l'archive.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git diff --quiet HEAD || { echo "Des modifications ne sont pas committées : committez d'abord." >&2; exit 1; }

version="$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/app" dist
git archive HEAD | tar -x -C "$tmp/app"

# BUILD_PATH hors du dossier : au cabinet, build/ est l'interface en service.
cible="$tmp/app/build"
command -v cygpath >/dev/null && cible="$(cygpath -w "$cible")"
echo "Construction de l'interface (plusieurs minutes)..."
CI=true GENERATE_SOURCEMAP=false BUILD_PATH="$cible" npm run build --silent >"$tmp/build.log" 2>&1 \
    || { cat "$tmp/build.log" >&2; exit 1; }
[[ -f "$tmp/app/build/index.html" ]] || { echo "Interface non construite." >&2; exit 1; }

nom="dist/fidea-visa-$version.tar.gz"
tar -czf "$nom" -C "$tmp/app" .
echo "$nom ($(du -h "$nom" | cut -f1))"
