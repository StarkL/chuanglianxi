try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/auth/wechat-login' -Method POST -ContentType 'application/json' -Body '{"code":"test"}' -TimeoutSec 8 -UseBasicParsing
  Write-Host ("STATUS:" + $r.StatusCode)
  Write-Host $r.Content
} catch {
  Write-Host ("ERR:" + $_.Exception.Message)
}
