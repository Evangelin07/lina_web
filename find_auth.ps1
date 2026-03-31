$content = Get-Content "c:\web-lina\frontend\script.js" -Encoding UTF8
$patterns = @('initLogout','handleLogout','initNavbarUser','lc_token','lc_current_user','lc_remember','localStorage','sessionStorage')
for ($i=0; $i -lt $content.Length; $i++) {
    foreach ($p in $patterns) {
        if ($content[$i] -match [regex]::Escape($p)) {
            Write-Output "$($i+1): $($content[$i])"
            break
        }
    }
}
