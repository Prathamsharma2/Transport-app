; ── DHILLON ROADLINES TMS — Custom NSIS Installer Script ──
; This runs BEFORE NSIS tries to close the app.
; It force-kills the process using WMIC (works even when app is frozen).

!macro customInstall
  ; Method 1: WMIC force kill (most powerful — works on all Windows versions)
  nsExec::ExecToLog 'wmic process where "name like ''DHILLON%%''" delete'
  
  ; Method 2: taskkill by exe name (backup)
  nsExec::ExecToLog 'taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  
  ; Method 3: taskkill by process name pattern (extra backup)
  nsExec::ExecToLog 'taskkill /F /IM "transport-app.exe" /T'
  
  ; Wait 3 seconds for Windows to fully release file locks
  Sleep 3000
!macroend

!macro customUnInstall
  ; Also kill before uninstall
  nsExec::ExecToLog 'wmic process where "name like ''DHILLON%%''" delete'
  nsExec::ExecToLog 'taskkill /F /IM "DHILLON ROADLINES TMS.exe" /T'
  Sleep 2000
!macroend
