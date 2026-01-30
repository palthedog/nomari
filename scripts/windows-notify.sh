#!/bin/bash
# Windows notification script for Claude Code hooks
# Sends a toast notification when Claude needs user input

# Here is an example .claude/settings.local.json
#
#   "hooks": {
#     "Notification": [
#       {
#         "matcher": "",
#         "hooks": [
#           {
#             "type": "command",
#             "command": "\"$CLAUDE_PROJECT_DIR/scripts/windows-notify.sh\""
#           }
#         ]
#       }
#     ]
#   }

# Read stdin (hook provides JSON input)
INPUT=$(cat)

# Extract message if available
MESSAGE=$(echo "$INPUT" | jq -r '.message // "Input needed"' 2>/dev/null || echo "Input needed")

# Send Windows toast notification using PowerShell (full path for WSL2)
POWERSHELL="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"

"$POWERSHELL" -NoProfile -Command "
Add-Type -AssemblyName System.Windows.Forms
\$balloon = New-Object System.Windows.Forms.NotifyIcon
\$balloon.Icon = [System.Drawing.SystemIcons]::Information
\$balloon.BalloonTipTitle = 'Claude Code'
\$balloon.BalloonTipText = '$MESSAGE'
\$balloon.Visible = \$true
\$balloon.ShowBalloonTip(10000)
Start-Sleep -Milliseconds 500
\$balloon.Dispose()
" 2>/dev/null &

exit 0
