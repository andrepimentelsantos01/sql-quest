$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding

$rootPath = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"
$backendHost = "127.0.0.1"
$backendPort = 8002
$frontendPort = 5173
$jobs = @()

function Format-PtText {
  param([string]$Text)

  $Text.
    Replace("{a}", [string][char]0x00E1).
    Replace("{c}", [string][char]0x00E7).
    Replace("{t}", [string][char]0x00E3).
    Replace("{e}", [string][char]0x00E9)
}

function Start-DevJob {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$CommandArguments,
    [hashtable]$Environment = @{}
  )

  Start-Job -Name $Name -ArgumentList $WorkingDirectory, $Command, $CommandArguments, $Name, $Environment -ScriptBlock {
    param($WorkingDirectory, $Command, $CommandArguments, $Name, $Environment)

    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = $OutputEncoding
    Set-Location $WorkingDirectory
    foreach ($key in $Environment.Keys) {
      Set-Item -Path "Env:$key" -Value $Environment[$key]
    }

    & $Command @CommandArguments 2>&1 | ForEach-Object {
      "[$Name] $_"
    }

    exit $LASTEXITCODE
  }
}

function Get-ListeningProcessId {
  param([int]$Port)

  $connection = netstat -ano |
    Select-String -Pattern "[:.]$Port\s+.*\s+LISTENING\s+(\d+)" |
    Select-Object -First 1

  if ($connection) {
    return $connection.Matches[0].Groups[1].Value
  }

  return $null
}

function Stop-ProcessOnPort {
  param(
    [string]$ServiceName,
    [int]$Port
  )

  $processId = Get-ListeningProcessId -Port $Port
  if ($processId) {
    Write-Host (Format-PtText "$ServiceName j{a} est{a} usando a porta $Port no processo $processId. Encerrando processo antigo...")
    Stop-Process -Id $processId -Force
    Start-Sleep -Milliseconds 500
  }
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    }
    catch {
      Start-Sleep -Milliseconds 300
    }
  } while ((Get-Date) -lt $deadline)

  throw "Backend não respondeu em $Url dentro de $TimeoutSeconds segundos."
}

try {
  Stop-ProcessOnPort -ServiceName "Backend" -Port $backendPort
  Stop-ProcessOnPort -ServiceName "Frontend" -Port $frontendPort

  Write-Host "Iniciando backend em http://localhost:$backendPort"
  $jobs += Start-DevJob -Name "backend" -WorkingDirectory $backendPath -Command "python" -CommandArguments @("-m", "uvicorn", "app.main:app", "--host", $backendHost, "--port", "$backendPort")

  Write-Host "Aguardando API em http://localhost:$backendPort/api/health"
  Wait-HttpReady -Url "http://$backendHost`:$backendPort/api/health"

  Write-Host "Iniciando frontend em http://localhost:$frontendPort"
  $jobs += Start-DevJob -Name "frontend" -WorkingDirectory $frontendPath -Command "npm.cmd" -CommandArguments @("run", "dev")

  Write-Host (Format-PtText "Aplica{c}{t}o em execu{c}{t}o. Use Ctrl+C para encerrar backend e frontend.")

  while ($true) {
    foreach ($job in $jobs) {
      Receive-Job -Job $job
    }

    $finishedJobs = $jobs | Where-Object { $_.State -in @("Completed", "Failed", "Stopped") }
    if ($finishedJobs.Count -gt 0) {
      foreach ($job in $finishedJobs) {
        Receive-Job -Job $job
      }

      $states = ($finishedJobs | ForEach-Object { "$($_.Name): $($_.State)" }) -join ", "
      throw (Format-PtText "Um dos servi{c}os foi encerrado antes do esperado: $states")
    }

    Start-Sleep -Milliseconds 300
  }
}
finally {
  foreach ($job in $jobs) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}
