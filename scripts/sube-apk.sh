#!/usr/bin/env bash
# Sube el APK firmado a la release de la version actual como copiloto.apk: la app lo
# ve en Ajustes -> Versión ("App Android nueva") y se instala sin cable (ver nativo.js).
# Solo hace falta cuando cambia lo nativo (app/android). Se compila en el PC porque la
# firma (~/.copiloto) y la voz (app/descarga-voz.mjs) no van al repo.
#
#   cd app && npm run apk            # el APK de la version de version.json
#   git push                         # el Action crea la release vX.Y.Z
#   bash scripts/sube-apk.sh         # espera a la release y le sube el APK
set -euo pipefail
cd "$(dirname "$0")/.."

v=$(node -p "require('./version.json').version")
apk=app/android/app/build/outputs/apk/release/app-release.apk
[ -f "$apk" ] || { echo "falta $apk: compila con cd app && npm run apk"; exit 1; }

# que el APK sea de esta version (sale de version.json al compilar)
aapt=$(ls -d "${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"/build-tools/*/ 2>/dev/null | sort -V | tail -1)aapt2
if [ -x "$aapt" ] || [ -x "$aapt.exe" ]; then
  va=$("$aapt" dump badging "$apk" 2>/dev/null | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1)
  [ "$va" = "$v" ] || { echo "el APK es la $va y version.json dice $v: vuelve a compilar"; exit 1; }
fi

for i in $(seq 1 60); do                       # el Action tarda un minuto en crear la release
  gh release view "v$v" >/dev/null 2>&1 && break
  [ "$i" = 60 ] && { echo "no hay release v$v todavia"; exit 1; }
  sleep 5
done
tmp=$(mktemp -d)
cp "$apk" "$tmp/copiloto.apk"
gh release upload "v$v" "$tmp/copiloto.apk" --clobber
rm -rf "$tmp"
echo "+ copiloto.apk en v$v"
