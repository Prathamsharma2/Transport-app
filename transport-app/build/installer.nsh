; ── DHILLON ROADLINES TMS — Custom NSIS Installer Script ──
; CRITICAL: customInit runs at NSIS STARTUP — BEFORE the "cannot be closed" dialog
; This is the CORRECT place to kill the app process

!macro customInit
  ; Kill at NSIS startup — before any close-app check runs
  nsExec::ExecToLog 'wmic process where "name like ''DHILLON%%''" delete'
  nsExec::ExecToLog 'taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "electron.exe" /T'
  Sleep 2000
!macroend

!macro customInstall
  ; Kill again during install phase (double safety)
  nsExec::ExecToLog 'wmic process where "name like ''DHILLON%%''" delete'
  nsExec::ExecToLog 'taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  Sleep 3000
!macroend

!macro customUnInstall
  ; Kill before uninstall too
  nsExec::ExecToLog 'wmic process where "name like ''DHILLON%%''" delete'
  nsExec::ExecToLog 'taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  Sleep 2000
!macroend
