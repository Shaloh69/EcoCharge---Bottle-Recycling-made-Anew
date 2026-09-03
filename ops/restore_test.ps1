# ============================================================================
# EcoCharge - backup RESTORE TEST
#
# An untested backup is a hope, not a plan. This restores the newest dump into
# a scratch database, counts what came back, and drops it again. It never
# touches the live `ecocharge` database.
#
# Run after any change to backup_mysql.ps1, and periodically as a drill.
# ============================================================================

$ErrorActionPreference = 'Continue'

$BackupDir = 'D:\EcoCharge\backups\mysql'
$Scratch   = 'restore_test'

$dump = Get-ChildItem $BackupDir -Filter 'ecocharge_*.sql' -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $dump) { Write-Output 'NO BACKUP FILE FOUND'; exit 1 }
Write-Output ("dump: {0}  ({1:N0} bytes)" -f $dump.Name, $dump.Length)

function Sql([string]$query, [string]$db = '') {
    $dbPart = if ($db) { " $db" } else { '' }
    $inner  = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root -N -B' + $dbPart + ' -e ' + "'$query'"
    & docker exec ecocharge-mysql sh -c $inner
}

# 1. fresh scratch database
Sql "DROP DATABASE IF EXISTS $Scratch; CREATE DATABASE $Scratch;" | Out-Null
Write-Output "scratch database created: $Scratch"

# 2. restore. cmd handles the stdin redirection from a file correctly.
$inner   = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root ' + $Scratch
$cmdLine = 'docker exec -i ecocharge-mysql sh -c "' + $inner.Replace('"','\"') + '" < "' + $dump.FullName + '"'
cmd /c $cmdLine
$rc = $LASTEXITCODE
Write-Output "restore exit code: $rc"
if ($rc -ne 0) { Write-Output 'RESTORE FAILED'; exit 1 }

# 3. compare the restored copy against the live database, table by table.
#    Row counts are read with COUNT(*), not information_schema.table_rows,
#    which is only an estimate on InnoDB and would make this test meaningless.
$tables = Sql "SHOW TABLES;" $Scratch
Write-Output ''
Write-Output 'table                     live   restored'
Write-Output '----------------------------------------'
$mismatch = 0
foreach ($t in $tables) {
    if (-not $t) { continue }
    $live = (Sql "SELECT COUNT(*) FROM ``$t``;" 'ecocharge') -join ''
    $rest = (Sql "SELECT COUNT(*) FROM ``$t``;" $Scratch)   -join ''
    $flag = if ($live -ne $rest) { '  <-- MISMATCH'; $mismatch++ } else { '' }
    Write-Output ("{0,-24} {1,5}   {2,8}{3}" -f $t, $live, $rest, $flag)
}

# 4. clean up - never leave a stale copy of production data lying around
Sql "DROP DATABASE IF EXISTS $Scratch;" | Out-Null
Write-Output ''
Write-Output "scratch database dropped"

if ($mismatch -gt 0) { Write-Output "RESTORE TEST FAILED - $mismatch table(s) differ"; exit 1 }
Write-Output 'RESTORE TEST PASSED - every table matches the live database'
exit 0
