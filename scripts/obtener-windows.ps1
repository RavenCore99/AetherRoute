param(
    [string]$Destino,
    [string]$ArchivoLocal,
    [switch]$NoRun
)

$ErrorActionPreference = 'Stop'
if (-not $Destino) {
    $Destino = Join-Path $HOME 'AetherRoute'
    $numero = 2
    while (Test-Path -LiteralPath $Destino) {
        $Destino = Join-Path $HOME "AetherRoute-$numero"
        $numero++
    }
} elseif (Test-Path -LiteralPath $Destino) {
    throw "La carpeta ya existe: $Destino. No se sobrescriben archivos."
}
$Destino = [IO.Path]::GetFullPath($Destino)
$temporal = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $temporal | Out-Null
try {
    $zip = Join-Path $temporal 'AetherRoute-windows-x64.zip'
    if ($ArchivoLocal) {
        Copy-Item -LiteralPath $ArchivoLocal -Destination $zip
    } else {
        $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/RavenCore99/AetherRoute/releases/latest'
        $asset = $release.assets | Where-Object { $_.name -eq 'AetherRoute-windows-x64.zip' } | Select-Object -First 1
        if (-not $asset -or $asset.digest -notmatch '^sha256:[0-9a-fA-F]{64}$') {
            throw 'El release no contiene un ZIP de Windows con SHA-256 verificable.'
        }
        Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $zip
        $observado = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($observado -ne $asset.digest.Substring(7).ToLowerInvariant()) {
            throw 'El ZIP descargado no coincide con el SHA-256 publicado en GitHub.'
        }
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $Destino
    $ejecutable = Join-Path $Destino 'AetherRoute\AetherRoute.exe'
    if (-not (Test-Path -LiteralPath $ejecutable)) {
        throw 'El ZIP no contiene el ejecutable esperado.'
    }
    Write-Host "AetherRoute disponible en: $ejecutable"
    Write-Host 'Para abrirlo después, ejecuta ese archivo. La demo funciona sin Python, Git ni Node.'
    if (-not $NoRun) {
        & $ejecutable
        if ($LASTEXITCODE -ne 0) { throw 'La demo terminó con error.' }
    }
} finally {
    Remove-Item -LiteralPath $temporal -Recurse -Force
}
