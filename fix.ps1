$path = 'F:\LGU\DMS\frontend\src\features\documents\pages\DocumentRegistrationPage.tsx'
$raw = [System.IO.File]::ReadAllText($path)
$old = @'
`${Object.keys(allErrors).length} field need attention.'
'@
$old = $old.TrimEnd("`r", "`n")
$new = @'
`${Object.keys(allErrors).length} field${Object.keys(allErrors).length === 1 ? '' : 's'} need${Object.keys(allErrors).length === 1 ? 's' : ''} attention.`
'@
$new = $new.TrimEnd("`r", "`n")
$raw = $raw.Replace($old, $new)
[System.IO.File]::WriteAllText($path, $raw, [System.Text.Encoding]::UTF8)
Write-Output 'done'
