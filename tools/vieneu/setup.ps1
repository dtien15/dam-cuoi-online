$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$venv = Join-Path $PSScriptRoot '.venv'
$python = Join-Path $venv 'Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    $systemPython = Get-Command python -ErrorAction Stop
    & $systemPython.Source -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được môi trường Python VieNeu.' }
}
& $python -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Không cài được VieNeu-TTS. Kiểm tra mạng rồi chạy lại.' }
Write-Host 'Đã cài VieNeu-TTS. Model sẽ được tải về tools\vieneu\models ở lần chạy game đầu tiên.'
