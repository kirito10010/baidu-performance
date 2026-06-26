Set objShell = CreateObject("WScript.Shell")
strScriptPath = WScript.ScriptFullName
strScriptDir = Left(strScriptPath, InStrRev(strScriptPath, "\"))
objShell.Run "python """ & strScriptDir & "server.py""", 0, False