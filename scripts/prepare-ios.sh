#!/bin/sh
# Legt die Offline-Fassung des Spiels ins Xcode-Projekt (ios/CityFoundry/WebAssets). Kein Build nötig – nur kopieren.
set -e
cd "$(dirname "$0")/.."
T=ios/CityFoundry/WebAssets
rm -rf "$T" && mkdir -p "$T/js"
cp index.html styles.css icon.svg datenschutz.html version.json "$T/"
cp js/*.mjs "$T/js/"
echo "Offline-Fassung: $(find "$T" -type f | wc -l | tr -d ' ') Dateien in $T"
