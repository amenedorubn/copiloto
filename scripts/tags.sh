#!/usr/bin/env bash
# Crea (si faltan) y sube los tags de las versiones antiguas: una vez, tras
# pasar de carpetas vNN/ a versionado semantico. Despues: bash scripts/releases.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch origin main --tags
while read -r t c n; do
  git rev-parse -q --verify "refs/tags/$t" >/dev/null || git tag -a "$t" "$c" -m "$t ($n)"
done <<'LISTA'
v0.4.0 6725040 antes carpeta v4/
v0.5.0 343bf8a antes carpeta v5/
v0.6.0 f99b1f4 antes carpeta v6/
v0.7.0 c4e4b91 antes carpeta v7/
v0.8.0 16e5f31 antes carpeta v8/
v0.9.0 7922731 antes carpeta v9/
v1.0.0 5341ad4 antes carpeta v10/
v1.1.0 937f641 antes carpeta v11/
v1.2.0 ab01a53 antes carpeta v12/
v1.3.0 12b5159 antes carpeta v13/
v1.4.0 14b9437 antes carpeta v14/
v1.5.0 5b9fe9d antes carpeta v15/
v1.6.0 bdcf19b antes carpeta v16/
v1.7.0 9e85f82 antes carpeta v17/
v1.8.0 81e7f78 antes carpeta v18/
v1.9.0 9d5f647 antes carpeta v19/
v2.0.0 44fffa5 v20/ y la raiz como app unica
LISTA
git push origin --tags
