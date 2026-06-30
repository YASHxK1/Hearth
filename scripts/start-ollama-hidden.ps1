$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:11434"
$tagsUrl = "http://localhost:11434/api/tags"
$timeoutSeconds = 10

function Test-Ollama {
  try {
    $response = Invoke-WebRequest -Uri $tagsUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

if (Test-Ollama) {
  Write-Host "Ollama is already running at $baseUrl."
  exit 0
}

Start-Process -WindowStyle Hidden ollama -ArgumentList "serve"

$deadline = (Get-Date).AddSeconds($timeoutSeconds)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if (Test-Ollama) {
    Write-Host "Ollama started at $baseUrl."
    exit 0
  }
}

Write-Error "Ollama did not become reachable at $baseUrl within $timeoutSeconds seconds."
exit 1
