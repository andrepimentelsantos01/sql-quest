$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding

$rootPath = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"
$venvPath = Join-Path $backendPath ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

function Format-PtText {
  param([string]$Text)

  $Text.
    Replace("{a}", [string][char]0x00E1).
    Replace("{c}", [string][char]0x00E7).
    Replace("{t}", [string][char]0x00E3).
    Replace("{e}", [string][char]0x00E9).
    Replace("{i}", [string][char]0x00ED)
}

function Get-PythonInfo {
  param(
    [string]$Command,
    [string[]]$BaseArguments = @()
  )

  try {
    $output = & $Command @BaseArguments -c "import sys; print(f'{sys.version_info.major};{sys.version_info.minor};{sys.executable}')" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $output) {
      return $null
    }

    $parts = "$output".Trim().Split(";")
    if ($parts.Count -lt 3) {
      return $null
    }

    return [pscustomobject]@{
      Command = $Command
      BaseArguments = $BaseArguments
      Major = [int]$parts[0]
      Minor = [int]$parts[1]
      Executable = $parts[2]
    }
  }
  catch {
    return $null
  }
}

function Find-CompatiblePython {
  $candidates = @(
    @{ Command = "py"; Arguments = @("-3.13") },
    @{ Command = "py"; Arguments = @("-3.12") },
    @{ Command = "py"; Arguments = @("-3.11") },
    @{ Command = "python"; Arguments = @() },
    @{ Command = "python3"; Arguments = @() }
  )

  foreach ($candidate in $candidates) {
    $info = Get-PythonInfo -Command $candidate.Command -BaseArguments $candidate.Arguments
    if ($info -and $info.Major -eq 3 -and $info.Minor -ge 11 -and $info.Minor -le 14) {
      return $info
    }
  }

  return $null
}

function Invoke-Checked {
  param(
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Comando falhou: $Command $($Arguments -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

$pythonInfo = Find-CompatiblePython
if (-not $pythonInfo) {
  throw (Format-PtText "Nao encontrei Python compativel. Instale Python 3.12, 3.13 ou 3.14 e rode npm install novamente.")
}

Write-Host (Format-PtText "Usando Python $($pythonInfo.Major).$($pythonInfo.Minor): $($pythonInfo.Executable)")

if (-not (Test-Path $venvPython)) {
  Write-Host (Format-PtText "Criando ambiente virtual do backend em backend\.venv")
  Push-Location $backendPath
  try {
    & $pythonInfo.Command @($pythonInfo.BaseArguments + @("-m", "venv", ".venv"))
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao criar backend\.venv"
    }
  }
  finally {
    Pop-Location
  }
}

Write-Host (Format-PtText "Instalando dependencias do backend")
Invoke-Checked -WorkingDirectory $backendPath -Command $venvPython -Arguments @("-m", "pip", "install", "--upgrade", "pip")
Invoke-Checked -WorkingDirectory $backendPath -Command $venvPython -Arguments @("-m", "pip", "install", "-r", "requirements.txt")

Write-Host (Format-PtText "Instalando dependencias do frontend")
if (Test-Path (Join-Path $frontendPath "package-lock.json")) {
  Invoke-Checked -WorkingDirectory $frontendPath -Command "npm.cmd" -Arguments @("ci")
}
else {
  Invoke-Checked -WorkingDirectory $frontendPath -Command "npm.cmd" -Arguments @("install")
}

Write-Host (Format-PtText "Instalacao concluida. Rode npm run dev:app na raiz para iniciar o app.")
