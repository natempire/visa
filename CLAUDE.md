# CLAUDE.md

FIDEA-VISA: the app for "VISA des états financiers" missions of the firm FIDEA (Abidjan,
Côte d'Ivoire). One dossier per entity × exercice, 7 steps, diligence points by cycle
(GUDEF-aligned, `Diligences auto/` holds the reference document), Word documents generated
from templates (lettre, attestation, refus, notes), AI assistance. UI and comments in French.
Live at https://fidea.visa.saisie.app. Code: GitHub `natempire/visa` (private).

## Layout

- `src/` React front end (create-react-app). Pages in `src/pages`, modules of a dossier in
  `src/components` (`PriseDeConnaissance`, `DiligencesModule`, `BouclageModule`,
  `DocumentsManager`, …). Methodology data in `src/utils/diligencesData.js`, `pdcData.js`,
  `travauxData.js` (also read by the server).
- `server/` Express API (`index.js`, routes in `server/routes`), JWT sessions (`routes/auth.js`),
  role levels in `server/roles.js` (admin 4 > expert 3 > senior 2 > assistant 1), write rules
  per step in `server/utils/dossierWriteRules.js`, automatic diligence checks in
  `server/utils/diligencesChecks.js`.
- `server/db.js` uses **sql.js**: the whole SQLite database is loaded in memory and written
  back to `fidea.db`. Never run two server processes on the same data directory, never edit
  `fidea.db` while the service runs (the last writer erases the other's changes). Schema
  changes go in `migrateSchema()`.
- `server/config.js`: one instance = one firm; all settings are env vars (`VISA_DATA_DIR`,
  `VISA_CABINET_*`, `VISA_JETON_INTEGRATION`, Anthropic key). Data directory holds `fidea.db`,
  `missions/`, `logo.png`, `modeles/`.
- `server/routes/integration.js`: read-only, token-protected routes for FIDEA
  (`/api/integration/dossiers`, documents list and download). FIDEA polls them every 15 min
  (`C:\fidea\visa_sync.py`); the VPS cannot reach the office, so VISA never calls FIDEA.
  Keep this contract stable: FIDEA's `visa_sync.py`, `visa_miroir.py` and `kyc_ia.py` depend
  on it.

## Commands

```bash
npm run build                 # front end → build/
cd server && npm test         # node --test (server/test/)
cd server && node index.js    # local run (port 3001); data in server/data/ (gitignored)
```

## Production

OVH VPS (`ssh fidea-vps`), instance `fidea`: service `fidea-visa@fidea`, code in
`/opt/fidea-visa/current`, data in `/srv/fidea-visa/fidea/`, settings in
`/etc/fidea-visa/fidea.env`. Update with `deploy/linux/preparer-archive.sh` then
`mettre-a-jour.sh` (see `deploy/linux/README.md`; automatic rollback). Only committed code
ships. Nightly backup 03:15 (restic on the VPS); the office pulls a copy back at 04:00
(`deploy/windows/rapatrier-sauvegarde.ps1`, task `FIDEA-VISA-Rapatriement`) into
`server/data/copies-vps`, which FIDEA mirrors into its document tree at 05:15.

## Rules

- `server/data/`, `.env` and anything with client data are never committed.
- Update production only when the owner asks. Push to GitHub after each change
  (`git push`, remote uses the deploy key `~/.ssh/github_visa`).
- AI calls cost money: no call per diligence point when points share documents; batch.
- The sibling app FIDEA (`C:\fidea`, read its `CLAUDE.md`) owns clients, KYC and missions.
