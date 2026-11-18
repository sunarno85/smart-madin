$env:DATABASE_URL = 'postgresql://smartmadin:smartmadin@localhost:5432/smartmadin?schema=public'
$env:JWT_SECRET = 'smart-madin-jwt-secret-2024-change-in-production'
$env:JWT_REFRESH_SECRET = 'smart-madin-refresh-secret-2024-change-in-production'
$env:APP_URL = 'http://localhost:5173'
$env:API_PORT = '3000'
$env:NODE_ENV = 'development'

Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' `
  -WorkingDirectory 'F:\madin\apps\api' -WindowStyle Hidden `
  -RedirectStandardOutput 'F:\madin\api.log' -RedirectStandardError 'F:\madin\api.err.log'

Start-Sleep -Seconds 1

Start-Process -FilePath 'node' -ArgumentList 'F:\madin\node_modules\vite\bin\vite.js --port 5173 --strictPort' `
  -WorkingDirectory 'F:\madin\apps\web' -WindowStyle Hidden `
  -RedirectStandardOutput 'F:\madin\web.log' -RedirectStandardError 'F:\madin\web.err.log'

Write-Output 'detached servers launched'
