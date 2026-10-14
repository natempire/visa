#!/usr/bin/env bash
# Crée l'instance d'un nouveau cabinet.
#
#   sudo /opt/fidea-visa/bin/nouvelle-instance.sh fidea "FIDEA" fidea.visa.saisie.app
#
# Le domaine doit déjà pointer sur ce serveur (enregistrement DNS « *.visa » → IP du serveur) :
# Caddy demande le certificat HTTPS dès le rechargement.
set -euo pipefail

if [[ $# -ne 3 ]]; then
    echo "Usage : $0 <code> <nom du cabinet> <domaine>" >&2
    exit 1
fi
CODE="$1"
NOM="$2"
DOMAINE="$3"
[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }
[[ "$CODE" =~ ^[a-z0-9][a-z0-9-]{1,20}$ ]] || { echo "Code : minuscules, chiffres et tirets." >&2; exit 1; }
[[ "$DOMAINE" =~ ^[a-z0-9.-]+$ ]] || { echo "Domaine invalide." >&2; exit 1; }
[[ "$NOM" =~ ^[^\"\`\$\\]+$ ]] || { echo 'Le nom ne doit contenir ni " ni ` ni $ ni \.' >&2; exit 1; }
ENV=/etc/fidea-visa/$CODE.env
[[ ! -e "$ENV" ]] || { echo "Le cabinet $CODE existe déjà ($ENV)." >&2; exit 1; }
[[ -L /opt/fidea-visa/current ]] || { echo "FIDEA VISA n'est pas installé (installer-visa.sh)." >&2; exit 1; }

# Premier port libre à partir de 3101
port=3101
while grep -qs "^PORT=$port\$" /etc/fidea-visa/*.env; do port=$((port + 1)); done

# Un utilisateur système par cabinet : son dossier n'est lisible que par lui.
COMPTE="visa-$CODE"
id "$COMPTE" >/dev/null 2>&1 || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$COMPTE"
DONNEES=/srv/fidea-visa/$CODE
install -d -m 700 -o "$COMPTE" -g "$COMPTE" "$DONNEES"

( umask 077; : > "$ENV" )
cat > "$ENV" <<FIN
PORT=$port
JWT_SECRET=$(openssl rand -hex 32)
VISA_DATA_DIR=$DONNEES
VISA_CABINET_NOM="$NOM"
VISA_CABINET_SOUS_TITRE=""
VISA_CABINET_NUMERO_ORDRE=""
VISA_EXPERT_PAR_DEFAUT=""
VISA_CABINET_DOMAINE_EMAIL=""
# Clé Anthropic (diligences automatiques, note de prise de connaissance)
ANTHROPIC_API_KEY=
FIN
chgrp "$COMPTE" "$ENV"
chmod 640 "$ENV"

cat > "/etc/caddy/sites/visa-$CODE.caddy" <<FIN
$DOMAINE {
	encode zstd gzip
	# 50 Mo par fichier au plus (limite de l'application), plusieurs fichiers par envoi
	request_body {
		max_size 300MB
	}
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "same-origin"
		-Server
	}
	reverse_proxy 127.0.0.1:$port
	log {
		output file /var/log/caddy/visa-$CODE.log
	}
}
FIN
chmod 644 "/etc/caddy/sites/visa-$CODE.caddy"
rm -f /etc/caddy/sites/_vide.caddy
# Journal créé d'avance au nom de Caddy (voir nouvelle-instance.sh de FIDEA Saisie)
touch "/var/log/caddy/visa-$CODE.log"
chown caddy:caddy "/var/log/caddy/visa-$CODE.log"
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy

systemctl enable --now "fidea-visa@$CODE"
for _ in $(seq 30); do
    curl -fs -o /dev/null "http://127.0.0.1:$port/api/ping" && break
    sleep 1
done
curl -fsS -o /dev/null "http://127.0.0.1:$port/api/ping" || { echo "Le cabinet ne répond pas : journalctl -u fidea-visa@$CODE" >&2; exit 1; }

cat <<FIN

Cabinet $CODE en service : https://$DOMAINE (port local $port).
À faire maintenant :
  1. Identité du cabinet et clé d'API : sudo nano $ENV
     Logo (facultatif) : sudo install -o $COMPTE -g $COMPTE -m 600 logo.png $DONNEES/logo.png
     puis sudo systemctl restart fidea-visa@$CODE
  2. Premier administrateur (mot de passe demandé au clavier) :
       sudo /opt/fidea-visa/bin/gerer.sh $CODE creer-admin --email prenom.nom@... --nom "Prénom Nom"
     Les autres comptes se créent ensuite dans l'application (page Utilisateurs).
FIN
