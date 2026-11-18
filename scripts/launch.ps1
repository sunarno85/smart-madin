<#
.SYNOPSIS
  Launcher SMART MADIN: cek dependency, install bila perlu, lalu jalankan aplikasi.

.DESCRIPTION
  - Cek Node.js/npm, .env, koneksi PostgreSQL
  - npm install otomatis bila node_modules belum ada / package-lock berubah
  - prisma generate otomatis bila client belum ada
  - Menjalankan `npm run dev` (default) atau build + preview (Mode Start)

.PARAMETER CheckOnly
  Hanya memeriksa dan tidak menjalankan aplikasi.

.PARAMETER SkipInstall
  Jangan menjalankan npm install/prisma generate otomatis.

.PARAMETER Mode
  Dev = Vite dev server + Nest watch (default).
  Start = build lalu jalankan API + Vite preview.

.EXAMPLE
  .\run.cmd
  .\run.cmd -CheckOnly
  .\run.cmd -Mode Start
#>
[CmdletBinding()]
param(
  [switch]$CheckOnly,
  [switch]$SkipInstall,
  [ValidateSet('Dev', 'Start')]
  [string]$Mode = 'Dev'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Step($message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-TcpPort($hostName, $port, $timeoutMs = 1200) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect($hostName, $port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne($timeoutMs, $false)) {
      return $false
    }
    $client.EndConnect($result)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Get-DatabaseTarget {
  $raw = $env:DATABASE_URL
  if (-not $raw -and (Test-Path '.env')) {
    $line = Get-Content '.env' | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if ($line) {
      $raw = ($line -split '=', 2)[1].Trim().Trim('"', "'")
    }
  }

  if (-not $raw) {
    return @{ Host = 'localhost'; Port = 5432 }
  }

  try {
    $uri = [Uri]$raw
    $port = $uri.Port
    if ($port -eq -1) { $port = 5432 }
    return @{ Host = $uri.Host; Port = $port }
  }
  catch {
    return @{ Host = 'localhost'; Port = 5432 }
  }
}

Write-Host '========================================' -ForegroundColor Green
Write-Host ' SMART MADIN - Launcher' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green

# --- 1. Node.js / npm --------------------------------------------------------
Write-Step 'Memeriksa Node.js dan npm'

if (-not (Test-Command 'node') -or -not (Test-Command 'npm')) {
  Write-Host 'Node.js/npm belum terpasang.' -ForegroundColor Red
  Write-Host 'Jalankan: .\\install.cmd ( setelah Node.js 20 LTS dipasang dari https://nodejs.org )' -ForegroundColor Yellow
  throw 'Node.js/npm tidak ditemukan.'
}

$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) {
  throw "Node.js versi $nodeMajor terlalu lama. Minimal 18 (disarankan 20 LTS)."
}
Write-Host "Node.js $(node --version) | npm $(npm --version)" -ForegroundColor Gray

# --- 2. .env -----------------------------------------------------------------
Write-Step 'Memeriksa konfigurasi .env'

if (-not (Test-Path '.env')) {
  if ($CheckOnly) {
    Write-Host '.env BELUM ADA. Jalankan .\\install.cmd' -ForegroundColor Red
  }
  else {
    Copy-Item '.env.example' '.env'
    Write-Host '.env dibuat dari .env.example. Silakan edit bila perlu.' -ForegroundColor Yellow
  }
}
else {
  Write-Host '.env ditemukan.' -ForegroundColor Gray
}

# --- 3. Dependency otomatis --------------------------------------------------
$lockFile = Get-Item 'package-lock.json' -ErrorAction SilentlyContinue
$installedLock = Get-Item 'node_modules/.package-lock.json' -ErrorAction SilentlyContinue

$needInstall = -not (Test-Path 'node_modules')
if (-not $needInstall -and $lockFile -and $installedLock) {
  $needInstall = $lockFile.LastWriteTime -gt $installedLock.LastWriteTime
}

Write-Step "Dependency npm: $(if ($needInstall) { 'perlu dipasang/diperbarui' } else { 'sudah terpasang' })"

if ($needInstall -and -not $SkipInstall -and -not $CheckOnly) {
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install gagal (exit $LASTEXITCODE)" }
}
elseif ($needInstall -and $CheckOnly) {
  Write-Host 'Mode CheckOnly: npm install dilewati.' -ForegroundColor Yellow
}

$needGenerate = -not (Test-Path 'node_modules/.prisma/client')
Write-Step "Prisma Client: $(if ($needGenerate) { 'perlu di-generate' } else { 'sudah tersedia' })"

if ($needGenerate -and -not $SkipInstall -and -not $CheckOnly) {
  npm run prisma:generate
  if ($LASTEXITCODE -ne 0) { throw "prisma generate gagal (exit $LASTEXITCODE)" }
}

# --- 4. Koneksi database -----------------------------------------------------
Write-Step 'Memeriksa koneksi PostgreSQL'

$db = Get-DatabaseTarget
Write-Host "Target database: $($db.Host):$($db.Port)" -ForegroundColor Gray

if (-not (Test-TcpPort $db.Host $db.Port)) {
  Write-Host "PostgreSQL tidak merespons di $($db.Host):$($db.Port)." -ForegroundColor Red
  Write-Host 'Pastikan PostgreSQL berjalan, lalu cek DATABASE_URL di .env.' -ForegroundColor Yellow
  throw 'Database tidak dapat dijangkau.'
}
Write-Host 'Database dapat dijangkau.' -ForegroundColor Gray

# --- 5. Port aplikasi --------------------------------------------------------
foreach ($port in @(3000, 5173)) {
  if (Test-TcpPort '127.0.0.1' $port 300) {
    Write-Host "Port $port sudah dipakai. Tutup aplikasi lama bila perlu." -ForegroundColor Yellow
  }
}

if ($CheckOnly) {
  Write-Host "`nSEMUA CEKAN LULUS. Siap menjalankan: .\\run.cmd" -ForegroundColor Green
  exit 0
}

# --- 6. Jalankan -------------------------------------------------------------
if ($Mode -eq 'Start') {
  Write-Step 'Build aplikasi'
  # Hapus cache inkremental TypeScript: nest build dengan deleteOutDir bisa
  # melewati emit bila tsbuildinfo menganggap output masih ada.
  Remove-Item 'apps\api\tsconfig.build.tsbuildinfo' -Force -ErrorAction SilentlyContinue
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build gagal (exit $LASTEXITCODE)" }

  Write-Step 'Menjalankan API + Web preview'
  npx concurrently "node apps/api/dist/main.js" "npm run preview -w apps/web -- --port 5173"
}
else {
  Write-Step 'Menjalankan aplikasi (dev)'
  npm run dev
}
