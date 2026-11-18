param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$previewRoot = Split-Path $PSScriptRoot -Parent
$previewUrl = 'http://127.0.0.1:3100/'
$nodePathCache = Join-Path $previewRoot '.local\preview-node-path.txt'

function Test-Preview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200 -and $response.Content -match 'sehpac'
    } catch {
        return $false
    }
}

try {
    if (-not (Test-Preview)) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue
        if ($listener) {
            throw 'Port 3100 is occupied, but the storefront is not responding. Wait a moment and try again.'
        }

        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand) {
            $previewNode = $nodeCommand.Source
        } elseif (Test-Path -LiteralPath $nodePathCache) {
            $previewNode = (Get-Content -LiteralPath $nodePathCache -Raw).Trim()
        } else {
            $runtime = Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime*' |
                Sort-Object Version -Descending | Select-Object -First 1
            if ($runtime) {
                $previewNode = Join-Path $runtime.InstallLocation 'dependencies\node\bin\node.exe'
            }
        }
        if (-not $previewNode -or -not (Test-Path -LiteralPath $previewNode)) {
            throw 'Node.js could not be found. Open this project in Codex or install Node.js.'
        }

        $logDirectory = Join-Path $previewRoot '.local\logs'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        Set-Content -LiteralPath $nodePathCache -Value $previewNode
        $previewProcess = Start-Process -FilePath $previewNode -ArgumentList @(
            'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'
        ) -WorkingDirectory $previewRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logDirectory 'preview.stdout.log') `
            -RedirectStandardError (Join-Path $logDirectory 'preview.stderr.log')

        $deadline = (Get-Date).AddSeconds(90)
        while (-not (Test-Preview)) {
            $previewProcess.Refresh()
            if ($previewProcess.HasExited) {
                $details = Get-Content (Join-Path $logDirectory 'preview.stderr.log') -Raw
                throw "The preview server stopped. $details"
            }
            if ((Get-Date) -gt $deadline) {
                throw "The preview did not become ready. See $logDirectory"
            }
            Start-Sleep -Milliseconds 500
        }
    }

    Write-Host "Preview ready: $previewUrl"
    if (-not $NoBrowser) {
        Start-Process $previewUrl
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
