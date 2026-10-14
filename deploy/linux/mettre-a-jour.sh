#!/usr/bin/env bash
# Installe une nouvelle version et redémarre tous les cabinets.
#
#   sudo /opt/fidea-visa/bin/mettre-a-jour.sh /tmp/fidea-visa-<date>-<commit>.tar.gz
#
# Chaque version a son dossier (/opt/fidea-visa/versions/<date>, avec ses node_modules) ;
# /opt/fidea-visa/current pointe sur celle en service. Si un cabinet ne répond pas après le
# redémarrage, retour automatique à la version précédente. Les 3 dernières versions sont gardées.
# Le schéma de la base est mis à jour par le serveur lui-même au démarrage (db.js).
set -euo pipefail

ARCHIVE="$(realpath "${1:?Usage : $0 <archive.tar.gz>}")"
[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }
RACINE=/opt/fidea-visa
VERSION="$(date +%Y%m%d-%H%M%S)"
CIBLE="$RACINE/versions/$VERSION"
PRECEDENTE="$(readlink -f "$RACINE/current" 2>/dev/null || true)"

echo "== Version $VERSION"
install -d -m 755 "$CIBLE"
tar -xzf "$ARCHIVE" -C "$CIBLE"
[[ -f "$CIBLE/build/index.html" ]] || { echo "Archive sans interface construite (preparer-archive.sh)." >&2; exit 1; }
( cd "$CIBLE/server" && npm ci --omit=dev --no-audit --no-fund --loglevel=error )
chown -R root:root "$CIBLE"
chmod -R go-w "$CIBLE"
# Contrôle rapide avant de toucher aux cabinets : le serveur démarre sur une base vide.
essai="$(mktemp -d)"
port_essai=3999
( cd "$CIBLE/server" && exec env PORT=$port_essai JWT_SECRET=essai VISA_DATA_DIR="$essai" node index.js ) >"$essai.log" 2>&1 &
pid_essai=$!
ok=""
for _ in $(seq 20); do
    curl -fs -o /dev/null "http://127.0.0.1:$port_essai/api/ping" && { ok=1; break; }
    sleep 1
done
kill "$pid_essai" 2>/dev/null || true
wait "$pid_essai" 2>/dev/null || true
[[ -n "$ok" ]] || { cat "$essai.log" >&2; rm -rf "$essai" "$essai.log" "$CIBLE"; echo "Le serveur ne démarre pas." >&2; exit 1; }
rm -rf "$essai" "$essai.log"

echo "== Scripts et services"
install -m 755 "$CIBLE"/deploy/linux/*.sh "$RACINE/bin/"
install -m 644 "$CIBLE"/deploy/linux/systemd/* /etc/systemd/system/
systemctl daemon-reload

instances() {
    for f in /etc/fidea-visa/*.env; do
        [[ -e "$f" ]] && basename "$f" .env
    done
}

repond() {   # repond <cabinet> : vrai si /api/ping répond dans les 30 secondes
    local port
    port="$(grep -E '^PORT=' "/etc/fidea-visa/$1.env" | cut -d= -f2)"
    for _ in $(seq 30); do
        curl -fs -o /dev/null "http://127.0.0.1:$port/api/ping" && return 0
        sleep 1
    done
    return 1
}

basculer() {
    ln -sfn "$1" "$RACINE/current.nouveau"
    mv -T "$RACINE/current.nouveau" "$RACINE/current"
}

basculer "$CIBLE"
echec=""
for i in $(instances); do
    echo "   redémarrage de $i"
    systemctl restart "fidea-visa@$i"
    if ! repond "$i"; then
        echec="$i"
        break
    fi
done

if [[ -n "$echec" ]]; then
    echo "!! Le cabinet $echec ne répond pas avec la version $VERSION." >&2
    journalctl -u "fidea-visa@$echec" -n 30 --no-pager >&2 || true
    if [[ -n "$PRECEDENTE" && -d "$PRECEDENTE" ]]; then
        echo "!! Retour à $(basename "$PRECEDENTE")." >&2
        basculer "$PRECEDENTE"
        install -m 644 "$PRECEDENTE"/deploy/linux/systemd/* /etc/systemd/system/
        systemctl daemon-reload
        for i in $(instances); do systemctl restart "fidea-visa@$i"; done
    fi
    exit 1
fi

echo "== Nettoyage (3 dernières versions gardées)"
ls -1d "$RACINE"/versions/*/ | sort | head -n -3 | while read -r ancienne; do
    [[ "$(realpath "$ancienne")" == "$(readlink -f "$RACINE/current")" ]] || rm -rf "$ancienne"
done

echo "Version $VERSION en service ($(instances | wc -w) cabinet(s))."
