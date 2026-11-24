#!/bin/sh
# Xcode Cloud: vor dem Bauen sicherstellen, dass die Offline-Fassung des Spiels im Projekt liegt.
set -e
cd "${CI_PRIMARY_REPOSITORY_PATH:-$(dirname "$0")/../..}"
if [ -f ios/CityFoundry/WebAssets/index.html ]; then echo "Spieldateien vorhanden."; exit 0; fi
sh scripts/prepare-ios.sh
