param(
    [string]$Destino,
    [string]$Ref = 'main',
    [switch]$NoRun
)

$ErrorActionPreference = 'Stop'
if ($Ref -notmatch '^[a-zA-Z0-9/_-]+$') {
    throw 'Referencia Git inválida.'
}
if (-not $Destino) {
    $Destino = Read-Host 'Carpeta nueva donde instalar AetherRoute (ruta completa)'
}
if (-not $Destino) {
    throw 'Debes indicar una carpeta de destino.'
}
$ruta = [IO.Path]::GetFullPath($Destino)
if (Test-Path -LiteralPath $ruta) {
    throw "La carpeta ya existe: $ruta. Elige una carpeta nueva para no sobrescribir archivos."
}
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw 'Instala Python 3.14 para Windows (incluye Python Launcher) antes de continuar.'
}
& py -3.14 -c 'import sys; assert sys.version_info[:2] == (3, 14)'
if ($LASTEXITCODE -ne 0) {
    throw 'No se encontró Python 3.14. Instálalo y vuelve a ejecutar este comando.'
}

$temporal = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $temporal | Out-Null
try {
    $zip = Join-Path $temporal 'AetherRoute.zip'
    $extraido = Join-Path $temporal 'extraido'
    $url = "https://github.com/RavenCore99/AetherRoute/archive/refs/heads/$Ref.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -LiteralPath $zip -DestinationPath $extraido
    $carpetas = @(Get-ChildItem -LiteralPath $extraido -Directory)
    if ($carpetas.Count -ne 1) {
        throw 'El ZIP no contiene la estructura esperada del repositorio.'
    }
    $padre = Split-Path -Parent $ruta
    New-Item -ItemType Directory -Force -Path $padre | Out-Null
    Move-Item -LiteralPath $carpetas[0].FullName -Destination $ruta
} finally {
    Remove-Item -LiteralPath $temporal -Recurse -Force
}

& py -3.14 -m venv (Join-Path $ruta '.venv')
if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo crear el entorno virtual; la carpeta descargada permanece en el destino.'
}
$python = Join-Path $ruta '.venv\Scripts\python.exe'
& $python -m pip install -r (Join-Path $ruta 'requirements.txt')
if ($LASTEXITCODE -ne 0) {
    throw 'Falló la instalación de dependencias; la carpeta descargada permanece en el destino.'
}
Write-Host "AetherRoute instalado en $ruta"
Write-Host "Para volver a abrirlo: & '$python' '$ruta\scripts\demo.py'"
if (-not $NoRun) {
    & $python (Join-Path $ruta 'scripts\demo.py')
    if ($LASTEXITCODE -ne 0) {
        throw 'La demo terminó con error; revisa la salida anterior.'
    }
}
