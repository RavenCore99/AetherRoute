#!/usr/bin/env bash
set -euo pipefail

origen='https://github.com/RavenCore99/AetherRoute/releases/latest/download'
base="${1:-$HOME/AetherRoute}"
if [[ $# -eq 0 ]]; then
  numero=2
  while [[ -e "$base" ]]; do
    base="$HOME/AetherRoute-$numero"
    ((numero += 1))
  done
elif [[ -e "$base" ]]; then
  printf 'La carpeta ya existe; no se sobrescriben archivos: %s\n' "$base" >&2
  exit 1
fi

archivo="$(mktemp "${TMPDIR:-/tmp}/aetherroute.XXXXXXXX.tar.gz")"
trap 'rm -f "$archivo"' EXIT
curl -fLsS "$origen/AetherRoute-linux-x64.tar.gz" -o "$archivo"
mkdir -p "$base"
tar -xzf "$archivo" -C "$base"
ejecutable="$base/AetherRoute/AetherRoute"
if [[ ! -x "$ejecutable" ]]; then
  printf 'El paquete no contiene el ejecutable esperado.\n' >&2
  exit 1
fi
printf 'AetherRoute disponible en: %s\n' "$ejecutable"
"$ejecutable"
