#!/usr/bin/env bash
# Crea una GitHub Release por cada tag vX.Y.Z con su entrada del CHANGELOG.
# Necesita gh (https://cli.github.com) con sesion iniciada y los tags ya
# subidos (git push origin --tags). Las releases que ya existen se saltan.
#
#   bash scripts/releases.sh            # todas
#   bash scripts/releases.sh v2.0.1     # solo una
set -euo pipefail
cd "$(dirname "$0")/.."

notas() {  # texto de la seccion "## [X.Y.Z]" del CHANGELOG, sin el titulo
  awk -v v="$1" '
    $0 ~ "^## \\[" v "\\]" { dentro=1; next }
    dentro && (/^## \[/ || /^\[[0-9]+\.[0-9]+\.[0-9]+\]: /) { exit }
    dentro { print }' CHANGELOG.md
}

if [ $# -gt 0 ]; then tags="$*"; else tags=$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=version:refname); fi
for t in $tags; do
  v=${t#v}
  if gh release view "$t" >/dev/null 2>&1; then echo "= $t ya existe"; continue; fi
  n=$(notas "$v")
  [ -n "${n//[[:space:]]/}" ] || n="Sin notas en el CHANGELOG."
  gh release create "$t" --title "$t" --notes "$n" --verify-tag
  echo "+ $t"
done
