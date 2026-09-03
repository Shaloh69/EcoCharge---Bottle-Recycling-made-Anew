# ============================================================================
# EcoCharge - MySQL backup
#
# Created 2026-09-03. Before this the project had ZERO database backups: every
# user, credit balance and deposit existed only in one Docker volume on one
# desktop. That was the largest non-safety risk in the project.
#
# The root password is NEVER handled outside the container - mysqldump reads it
# from the container's own MYSQL_ROOT_PASSWORD, so it never appears in this
# file, in a command line, or in Task Scheduler.
#
# Registered as: EcoChargeBackup   (schtasks /RU SYSTEM /SC DAILY)
# ============================================================================

$ErrorActionPreference = 'Stop'

$BackupDir = 'D:\EcoCharge\backups\mysql'
$LogFile   = 'D:\EcoCharge\logs\backup.log'
$Retention = 14      # days
$MinBytes  = 2048    # below this, treat as a failed dump rather than a backup

function Write-Log([string]$msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $LogFile -Value $line
    Write-Output $line
}

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null }

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$out   = Join-Path $BackupDir "ecocharge_$stamp.sql"

Write-Log "starting backup -> $out"

# --single-transaction gives a consistent snapshot without locking the tables,
# so a backup running while someone is mid-deposit cannot block them.
#
# MYSQL_PWD is used rather than -p so mysqldump never emits its "password on
# the command line is insecure" warning - that warning goes to stderr, and any
# stderr output would otherwise have to be filtered back out of the .sql file.
# The password still never leaves the container.
$errFile = Join-Path $env:TEMP 'ecocharge_dump_err.txt'
$inner   = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -u root --single-transaction --routines --triggers --events --no-tablespaces ecocharge'

# cmd handles native-process stream redirection correctly; PowerShell 5.1 wraps
# a native command's stderr in ErrorRecords, which under ErrorActionPreference
# 'Stop' turns a harmless warning into a thrown exception.
$cmdLine = 'docker exec ecocharge-mysql sh -c "' + $inner.Replace('"','\"') + '" > "' + $out + '" 2> "' + $errFile + '"'

$ErrorActionPreference = 'Continue'
cmd /c $cmdLine
$rc = $LASTEXITCODE
$ErrorActionPreference = 'Stop'

if ($rc -ne 0) {
    $errText = if (Test-Path $errFile) { (Get-Content $errFile -Raw).Trim() } else { '(no stderr)' }
    Write-Log "BACKUP FAILED (exit $rc) - $errText"
    if (Test-Path $out) { Remove-Item $out -Force }
    exit 1
}

if (-not (Test-Path $out)) {
    Write-Log 'BACKUP FAILED - no output file'
    exit 1
}

$size = (Get-Item $out).Length

# A dump that is suspiciously small usually means mysqldump errored or hit an
# empty database. Better to fail loudly than to keep a file that looks like a
# backup and restores nothing - an untested backup is a hope, not a plan.
if ($size -lt $MinBytes) {
    Write-Log "BACKUP TOO SMALL ($size bytes) - treating as failure"
    Remove-Item $out -Force
    exit 1
}

# Sanity-check the content, not just the size.
$head = Get-Content $out -TotalCount 40 -ErrorAction SilentlyContinue
if (-not ($head -match 'CREATE TABLE')) {
    Write-Log 'BACKUP INVALID - no CREATE TABLE found in output'
    Remove-Item $out -Force
    exit 1
}

Write-Log ("OK - {0:N0} bytes" -f $size)

# ── Second-disk copy ────────────────────────────────────────────────────────
# D: is a Toshiba HDD; E: is a separate Samsung SSD (verified 2026-09-03 via
# Get-PhysicalDisk - different DiskNumber, different physical device). A copy
# there survives the failure of the disk holding both the database and the
# primary backups, which is the actual risk a single-disk backup does not cover.
#
# This is NOT off-site. It protects against a dead drive, not a dead machine,
# a fire, or ransomware. The intended off-box target is the kiosk PC on the
# tailnet, which was offline (last seen 8 days) when this was written - so this
# is the best available today, not the finished answer.
$MirrorDir = 'E:\EcoCharge-Backups'
try {
    if (-not (Test-Path $MirrorDir)) { New-Item -ItemType Directory -Force -Path $MirrorDir | Out-Null }
    Copy-Item -Path $out -Destination $MirrorDir -Force -ErrorAction Stop
    $mirrored = Join-Path $MirrorDir (Split-Path $out -Leaf)
    # Verify the copy rather than trusting Copy-Item - a truncated mirror is
    # worse than an obviously missing one.
    if ((Get-Item $mirrored).Length -eq $size) {
        Write-Log "mirrored to $MirrorDir"
    } else {
        Write-Log "MIRROR SIZE MISMATCH - removing bad copy"
        Remove-Item $mirrored -Force -ErrorAction SilentlyContinue
    }
    # Same retention on the mirror.
    Get-ChildItem $MirrorDir -Filter 'ecocharge_*.sql' -File |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$Retention) } |
        ForEach-Object { Remove-Item $_.FullName -Force }
} catch {
    # A failed mirror must not fail the backup - the primary copy already
    # succeeded and is more important than the redundancy.
    Write-Log "MIRROR FAILED (primary backup is fine) - $($_.Exception.Message)"
}

# Retention is time-based, not count-based, on purpose: a crash loop that
# somehow triggered many runs must not silently evict older good backups.
$cutoff  = (Get-Date).AddDays(-$Retention)
$removed = 0
Get-ChildItem $BackupDir -Filter 'ecocharge_*.sql' -File |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object { Remove-Item $_.FullName -Force; $removed++ }

$kept = (Get-ChildItem $BackupDir -Filter 'ecocharge_*.sql' -File | Measure-Object).Count
Write-Log "retention: removed $removed, kept $kept"
exit 0
