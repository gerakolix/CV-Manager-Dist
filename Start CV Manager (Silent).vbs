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

' Start CV Manager in hidden window
oShell.Run "cmd /c npm run dev", 0, False

' Wait 3 seconds then open browser
WScript.Sleep 3000
oShell.Run "http://localhost:5173", 1
