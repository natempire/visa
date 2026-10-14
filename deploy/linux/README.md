# FIDEA VISA sur le serveur Linux

Un cabinet = une instance : son service `fidea-visa@<code>`, son utilisateur système
`visa-<code>`, son dossier `/srv/fidea-visa/<code>/` (base `fidea.db`, `missions/`, `logo.png`,
`modeles/`) et ses réglages `/etc/fidea-visa/<code>.env`. Le code est commun
(`/opt/fidea-visa/current`). Le serveur héberge aussi FIDEA Saisie, dont le kit installe Caddy,
restic, le pare-feu et les mises à jour automatiques : il doit être installé d'abord.

Adresses : `<code>.visa.saisie.app`, couvertes par l'enregistrement DNS `*.visa` → IP du serveur.

## Installation (une fois)

Au cabinet (Git Bash, dans le dépôt, tout committé) :

```bash
deploy/linux/preparer-archive.sh                 # construit l'interface → dist/fidea-visa-....tar.gz
scp dist/fidea-visa-<version>.tar.gz fidea-vps:/tmp/
ssh fidea-vps
sudo bash -c 'tar -xzf /tmp/fidea-visa-<version>.tar.gz -O ./deploy/linux/installer-visa.sh > /tmp/installer-visa.sh'
sudo bash /tmp/installer-visa.sh /tmp/fidea-visa-<version>.tar.gz
```

## Nouveau cabinet

```bash
sudo /opt/fidea-visa/bin/nouvelle-instance.sh fidea "FIDEA" fidea.visa.saisie.app
sudo nano /etc/fidea-visa/fidea.env             # identité (VISA_CABINET_*), clé d'API
sudo systemctl restart fidea-visa@fidea
sudo /opt/fidea-visa/bin/gerer.sh fidea creer-admin --email prenom.nom@fidea.ci --nom "Prénom Nom"
```

Logo : `/srv/fidea-visa/<code>/logo.png` (propriétaire `visa-<code>`). Modèles Word propres au
cabinet : `/srv/fidea-visa/<code>/modeles/<nom>.docx` (mêmes noms que `public/templates/`).

## Mise à jour

```bash
deploy/linux/preparer-archive.sh
scp dist/fidea-visa-<version>.tar.gz fidea-vps:/tmp/
ssh fidea-vps sudo /opt/fidea-visa/bin/mettre-a-jour.sh /tmp/fidea-visa-<version>.tar.gz
```

Retour automatique à la version précédente si un cabinet ne répond plus.

## Sauvegardes

Chaque nuit à 03:15 (`fidea-visa-sauvegarde.timer`), dans le dépôt restic de FIDEA Saisie avec
l'étiquette `visa`. Alerte d'échec : `ALERTE_URL_SAUVEGARDE_VISA=` (healthchecks.io) dans
`/etc/fidea-saisie/serveur.env`. Restauration : voir l'en-tête de `sauvegarder.sh`.

## Ne jamais

- lancer deux serveurs sur la même base (sql.js garde la base en mémoire : le dernier qui écrit
  efface les changements de l'autre) ;
- modifier `fidea.db` pendant que le cabinet tourne — `gerer.sh` arrête le cabinet pour cela.
