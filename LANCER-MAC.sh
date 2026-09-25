#!/bin/bash
echo "============================================"
echo "  FIDEA - Gestion des Missions VISA"
echo "  Version avec base de données serveur"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/3] Installation des dépendances (serveur)..."
cd server && npm install && cd ..

echo ""
echo "[2/3] Installation des dépendances (interface)..."
npm install

echo ""
echo "[3/3] Démarrage..."
echo ""

# Start server in background
cd server && node index.js &
SERVER_PID=$!
cd "$SCRIPT_DIR"

sleep 2

# Start React frontend
npm start

# Cleanup on exit
kill $SERVER_PID 2>/dev/null
