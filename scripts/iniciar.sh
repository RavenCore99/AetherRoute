#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python="$raiz/.venv/bin/python"
pid_dir="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/aetherroute-$(id -u)"

if [[ ! -x "$python" ]]; then
    printf 'No se encontró %s; prepara el entorno antes de iniciar.\n' "$python" >&2
    exit 1
fi

for puerto in 8000 8001 8002 8003; do
    if (: > "/dev/tcp/127.0.0.1/$puerto") 2>/dev/null; then
        printf 'Puerto %s ocupado; no se inicia ningún servicio.\n' "$puerto" >&2
        exit 1
    fi
done

mkdir -p "$pid_dir"
pids=()
limpiar() {
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    done
    for puerto in 8000 8001 8002 8003; do
        rm -f "$pid_dir/$puerto.pid"
    done
}
trap limpiar EXIT

for puerto in 8001 8002 8003 8000; do
    if [[ "$puerto" == 8000 ]]; then
        "$python" -m uvicorn balanceador:app --app-dir "$raiz" --host 127.0.0.1 --port 8000 >"$pid_dir/8000.log" 2>&1 &
    else
        "$python" "$raiz/servidores.py" "$puerto" "Servidor $((puerto - 8000))" >"$pid_dir/$puerto.log" 2>&1 &
    fi
    pid=$!
    pids+=("$pid")
    printf '%s\n' "$pid" >"$pid_dir/$puerto.pid"
    listo=false
    for intento in {1..50}; do
        if (: > "/dev/tcp/127.0.0.1/$puerto") 2>/dev/null; then
            listo=true
            break
        fi
        if ! kill -0 "$pid" 2>/dev/null; then
            break
        fi
        sleep 0.1
    done
    if [[ "$listo" != true ]]; then
        printf 'El servicio %s no arrancó; revisa %s/%s.log\n' "$puerto" "$pid_dir" "$puerto" >&2
        exit 1
    fi
done

trap - EXIT
printf 'Servicios activos en 127.0.0.1:8000–8003. PID y logs: %s\n' "$pid_dir"
