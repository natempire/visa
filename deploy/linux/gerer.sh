#!/usr/bin/env bash
# Commandes d'administration d'un cabinet (server/gerer.js), avec son environnement et sous son
# compte de service. Le cabinet est arrêté le temps de la commande (sql.js écraserait sinon la
# modification à sa prochaine écriture), puis relancé.
#
#   sudo /opt/fidea-visa/bin/gerer.sh fidea creer-admin --email prenom.nom@fidea.ci --nom "Prénom Nom"
#   sudo /opt/fidea-visa/bin/gerer.sh fidea mot-de-passe --email prenom.nom@fidea.ci
#   sudo /opt/fidea-visa/bin/gerer.sh fidea migrer-gudef
set -euo pipefail

CODE="${1:?Usage : $0 <cabinet> creer-admin|mot-de-passe --email ... [--nom ...] | migrer-gudef}"
shift
[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }
ENV=/etc/fidea-visa/$CODE.env
[[ -f "$ENV" ]] || { echo "Cabinet $CODE inconnu." >&2; exit 1; }

actif=""
if systemctl is-active --quiet "fidea-visa@$CODE"; then
    actif=1
    echo "Arrêt du cabinet $CODE le temps de la commande..."
    systemctl stop "fidea-visa@$CODE"
fi
relancer() { [[ -z "$actif" ]] || systemctl start "fidea-visa@$CODE"; }
trap relancer EXIT

set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
cd /opt/fidea-visa/current/server
sudo --preserve-env=PORT,JWT_SECRET,VISA_DATA_DIR,VISA_CABINET_NOM -u "visa-$CODE" \
    /usr/bin/node gerer.js "$@"
