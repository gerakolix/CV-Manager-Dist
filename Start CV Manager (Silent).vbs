Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Change to cv-manager directory
oShell.CurrentDirectory = scriptDir

' Auto-install if node_modules is missing
If Not fso.FolderExists(scriptDir & "\node_modules") Then
    oShell.Run "cmd /c npm install", 1, True
End If

' Start CV Manager in hidden window (browser opens automatically via Vite)
oShell.Run "cmd /c npm run dev", 0, False
