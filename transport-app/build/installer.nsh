; ── DHILLON ROADLINES TMS — Custom NSIS Installer Script ──
; customInit = runs at NSIS STARTUP (BEFORE the "cannot be closed" dialog)

!macro customInit
  ; Kill 1: taskkill by exact product name (most reliable)
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'

  ; Kill 2: wmic wildcard kill (catches any renamed variant)
  nsExec::ExecToLog 'cmd /c wmic process where "name like ''DHILLON%%''" delete'

  ; Kill 3: kill underlying electron process
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "electron.exe" /T'

  ; Kill 4: PowerShell via cmd (safe syntax — no curly braces inside NSIS string)
  nsExec::ExecToLog 'cmd /c powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command Stop-Process -Name ''DHILLON ROADLINES TMS'' -Force -ErrorAction SilentlyContinue'

  ; Wait for Windows to release all file handles
  Sleep 3000
!macroend

!macro customInstall
  ; Double-safety kill during install phase
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  nsExec::ExecToLog 'cmd /c wmic process where "name like ''DHILLON%%''" delete'
  Sleep 3000
!macroend

!macro customUnInstall
  ; Kill before uninstall
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  nsExec::ExecToLog 'cmd /c wmic process where "name like ''DHILLON%%''" delete'
  Sleep 2000
!macroend
