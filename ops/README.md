# Ops scripts — `desktop-gklhcri`

Versioned copies of the scripts that actually run on the self-hosting server.
**These are the source of truth; the copies at `D:\EcoCharge\*.ps1` on the host
are deployments.** If you change one here, copy it over.

| Script | Scheduled task | When | What it does |
|---|---|---|---|
| `backup_mysql.ps1` | `EcoChargeBackup` | daily 03:30 | `mysqldump` of the `ecocharge` database into `D:\EcoCharge\backups\mysql`, 14-day retention |
| `restore_test.ps1` | *(manual)* | after any backup change | Restores the newest dump into a scratch database and compares every table's row count against live, then drops it |
| `rotate_logs.ps1` | `EcoChargeLogRotate` | daily 03:45 | Archives any `.log` over 10 MB, zipped, 21-day retention |

All tasks are registered `/RU SYSTEM /RL HIGHEST`. **Confirm Logon Mode reads
`Interactive/Background`** after registering — a task created under a normal
user account gets "Interactive only" and will never fire at boot. That defect
cost this project a 7-hour outage in August 2026.

## Things worth knowing before editing these

**The database password is never handled outside the container.** Both database
scripts pass `MYSQL_PWD` from the container's own environment, so the
credential never appears in a file, a command line, or a Task Scheduler entry.
Keep it that way.

**`mysqldump` warnings go to stderr, and PowerShell 5.1 turns a native
command's stderr into `ErrorRecord`s** — which, under
`$ErrorActionPreference = 'Stop'`, throws on a harmless warning. Both scripts
let `cmd` handle native-process redirection for that reason.

**Log rotation must stop the owning service.** The launcher `.bat` files
redirect with `>>`, which opens the file without write-sharing, so in-place
truncation fails while the service runs. Rotation therefore stops the service,
truncates, and restarts — but only for a file actually over the threshold.

**An untested backup is a hope.** `restore_test.ps1` exists because a dump that
is the right size can still restore nothing. It compares `COUNT(*)` per table
rather than `information_schema.table_rows`, which is only an estimate on
InnoDB and would make the test meaningless.
