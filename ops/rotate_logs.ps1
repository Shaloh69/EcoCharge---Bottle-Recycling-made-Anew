# ============================================================================
# EcoCharge - log rotation
#
# Created 2026-09-03. The logs had never been rotated: stdout.log had reached
# 103.8 MB and stderr.log 44.4 MB. Size alone was not the problem - there is
# 641 GB free - the problem was that the evidence of a two-hour crash loop was
# buried in a file too large for anyone to casually open. Unreadable logs are
# how a real fault stays invisible for nine days.
#
# Rotates in place rather than renaming, because the service holds the file
# open with >> and a rename would leave it writing to an orphaned handle.
#
# Registered as: EcoChargeLogRotate  (schtasks /RU SYSTEM /SC DAILY)
# ============================================================================

$ErrorActionPreference = 'Continue'

$LogRoot    = 'D:\EcoCharge\logs'
$ArchiveDir = Join-Path $LogRoot 'archive'
$MaxBytes   = 10MB     # rotate anything above this
$KeepDays   = 21

if (-not (Test-Path $ArchiveDir)) { New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null }

$stamp   = Get-Date -Format 'yyyy-MM-dd_HHmm'
$rotated = 0
$failed  = 0

# Which Scheduled Task owns each log directory. The launcher .bat files redirect
# with >>, which opens the file WITHOUT write-sharing - so nothing else can
# truncate it while the service runs. Discovered 2026-09-03 when in-place
# truncation failed with "being used by another process". The only honest way
# to rotate these is a brief stop, and that only happens for a file that has
# actually exceeded the threshold, which after the crash-loop fix is rare.
$OwnerTask = @{
    'server_main' = 'EcoChargeAPI'
    'web_console' = 'EcoChargeAdminConsole'
    'server_AI'   = 'EcoChargeAIServer'
    'kiosk_web'   = 'EcoChargeKioskWeb'
    'web'         = 'EcoChargeWeb'
}

function Rotate-One($file, $dest) {
    Copy-Item -Path $file.FullName -Destination $dest -ErrorAction Stop
    $fs = [System.IO.File]::Open($file.FullName, 'Open', 'Write', 'ReadWrite')
    $fs.SetLength(0)
    $fs.Close()
}

$oversized = Get-ChildItem $LogRoot -Recurse -File -Filter '*.log' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "$ArchiveDir*" -and $_.Length -gt $MaxBytes }

# Group by owning service so a service is stopped at most once per run.
$byDir = $oversized | Group-Object { Split-Path (Split-Path $_.FullName -Parent) -Leaf }

foreach ($grp in $byDir) {
    $task    = $OwnerTask[$grp.Name]
    $stopped = $false

    foreach ($f in $grp.Group) {
        $dest = Join-Path $ArchiveDir ("{0}_{1}.log" -f ($f.Name -replace '\.log$',''), $stamp)
        try {
            Rotate-One $f $dest
        } catch {
            # Locked. Stop the owning service once, then retry every file in
            # this directory before restarting it.
            if ($task -and -not $stopped) {
                Write-Output "stopping $task to rotate $($grp.Name) logs"
                schtasks /End /TN $task | Out-Null
                Start-Sleep -Seconds 3
                $stopped = $true
                try { Rotate-One $f $dest } catch {
                    Write-Output ("FAILED {0} - {1}" -f $f.Name, $_.Exception.Message); $failed++; continue
                }
            } else {
                Write-Output ("FAILED {0} - {1}" -f $f.Name, $_.Exception.Message); $failed++; continue
            }
        }

        Compress-Archive -Path $dest -DestinationPath "$dest.zip" -Force -ErrorAction SilentlyContinue
        if (Test-Path "$dest.zip") { Remove-Item $dest -Force }
        Write-Output ("rotated {0} ({1:N1} MB)" -f $f.Name, ($f.Length / 1MB))
        $rotated++
    }

    if ($stopped) {
        schtasks /Run /TN $task | Out-Null
        Write-Output "restarted $task"
        Start-Sleep -Seconds 5
    }
}

# Time-based retention, matching the backup script's reasoning: a burst of
# rotations must not silently evict older archives that are still useful.
$cutoff  = (Get-Date).AddDays(-$KeepDays)
$removed = 0
Get-ChildItem $ArchiveDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object { Remove-Item $_.FullName -Force; $removed++ }

Write-Output "rotated=$rotated failed=$failed archives_removed=$removed"
if ($failed -gt 0) { exit 1 }
exit 0
