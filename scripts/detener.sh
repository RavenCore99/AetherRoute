#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pid_dir="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/aetherroute-$(id -u)"

if [[ $# -gt 1 ]]; then
    printf 'Uso: %s [8000|8001|8002|8003]\n' "$0" >&2
    exit 2
fi
if [[ $# -eq 1 ]]; then
    case "$1" in
        8000|8001|8002|8003) puertos=("$1") ;;
        *) printf 'Puerto no válido: %s\n' "$1" >&2; exit 2 ;;
    esac
else
    puertos=(8000 8001 8002 8003)
fi

fallos=0
for puerto in "${puertos[@]}"; do
    archivo="$pid_dir/$puerto.pid"
    if [[ ! -f "$archivo" ]]; then
        printf 'Puerto %s: sin proceso registrado.\n' "$puerto"
        continue
    fi
    pid="$(<"$archivo")"
    if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
        printf 'PID inválido en %s.\n' "$archivo" >&2
        fallos=1
        continue
    fi
    if [[ ! -r "/proc/$pid/cmdline" ]]; then
        rm -f "$archivo"
        printf 'Puerto %s: registro obsoleto eliminado.\n' "$puerto"
        continue
    fi
    comando="$(tr '\0' ' ' <"/proc/$pid/cmdline")"
    if [[ "$puerto" == 8000 ]]; then
        patron="uvicorn balanceador:app --app-dir $raiz --host 127.0.0.1 --port 8000"
    else
        patron="$raiz/servidores.py $puerto Servidor"
    fi
    if [[ "$comando" != *"$patron"* ]]; then
        printf 'Puerto %s: PID %s no pertenece a AetherRoute; no se detuvo.\n' "$puerto" "$pid" >&2
        fallos=1
        continue
    fi
    if ! kill "$pid" 2>/dev/null; then
        printf 'No se pudo detener el PID %s del puerto %s.\n' "$pid" "$puerto" >&2
        fallos=1
        continue
    fi
    detenido=false
    for intento in {1..50}; do
        if ! (: > "/dev/tcp/127.0.0.1/$puerto") 2>/dev/null; then
            detenido=true
            break
        fi
        sleep 0.1
    done
    if [[ "$detenido" == true ]]; then
        rm -f "$archivo"
        printf 'Puerto %s detenido.\n' "$puerto"
    else
        printf 'El puerto %s sigue activo; revisa el PID %s.\n' "$puerto" "$pid" >&2
        fallos=1
    fi
done

exit "$fallos"
