<#
.SYNOPSIS
  Instalasi penuh SMART MADIN dari cloned repository.

.DESCRIPTION
  - Memastikan Node.js/npm tersedia
  - Membuat .env dari .env.example bila belum ada
  - npm install (semua dependency workspace)
  - prisma generate + migrate deploy
  - seed akun & sync permission
  - opsional: impor data nyata dari Aplikasi Data Madin.xlsx

.PARAMETER SkipImport
  Lewati impor data nyata.

.PARAMETER Yes
  Jawab "ya" otomatis untuk impor data nyata.

.EXAMPLE
  .\install.cmd
  .\install.cmd -Yes
  .\install.cmd -SkipImport
#>
[CmdletBinding()]
param(
  [switch]$SkipImport,
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Step($message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Invoke-Step($label, [scriptblock]$command) {
  Write-Step $label
  & $command
  if ($LASTEXITCODE -ne 0) {
    throw "Gagal saat: $label (exit code $LASTEXITCODE)"
  }
}

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host '========================================' -ForegroundColor Green
Write-Host ' SMART MADIN - Instalasi Otomatis' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green

# --- 1. Prasyarat sistem -----------------------------------------------------
Write-Step 'Memeriksa Node.js dan npm'

if (-not (Test-Command 'node') -or -not (Test-Command 'npm')) {
  Write-Host 'Node.js/npm belum terpasang.' -ForegroundColor Red
  Write-Host 'Pasang Node.js 20 LTS dari https://nodejs.org lalu jalankan ulang install.cmd' -ForegroundColor Yellow
  throw 'Node.js/npm tidak ditemukan.'
}

$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) {
  throw "Node.js versi $nodeMajor terlalu lama. Minimal 18 (disarankan 20 LTS)."
}

Write-Host "Node.js $(node --version) | npm $(npm --version)" -ForegroundColor Gray

# --- 2. Environment ----------------------------------------------------------
Write-Step 'Menyiapkan file .env'

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host '.env dibuat dari .env.example.' -ForegroundColor Yellow
  Write-Host 'Jika PostgreSQL Anda memakai user/password berbeda, edit DATABASE_URL di .env.' -ForegroundColor Yellow
}
else {
  Write-Host '.env sudah ada, tidak ditimpa.' -ForegroundColor Gray
}

# --- 3. Dependency npm -------------------------------------------------------
Invoke-Step 'npm install (semua dependency)' { npm install }

# --- 4. Prisma & database ----------------------------------------------------
Invoke-Step 'prisma generate' { npm run prisma:generate }

Write-Step 'prisma migrate deploy'
Push-Location 'prisma'
try {
  & npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Gagal migrate database (exit $LASTEXITCODE)" }
}
finally {
  Pop-Location
}

# --- 5. Seed & permission ----------------------------------------------------
Invoke-Step 'Seed akun dasar' { npm run seed }
Invoke-Step 'Sinkronisasi permission & role' { npm run sync:permissions }

# --- 6. Data nyata (opsional) ------------------------------------------------
if (-not $SkipImport) {
  $excel = 'Aplikasi Data Madin.xlsx'
  if (Test-Path $excel) {
    $doImport = $Yes
    if (-not $doImport) {
      $answer = Read-Host "Impor data nyata dari '$excel'? [Y/n]"
      $doImport = [string]::IsNullOrWhiteSpace($answer) -or $answer -match '^[Yy]'
    }

    if ($doImport) {
      Invoke-Step 'Impor data madrasah (--replace)' {
        npm run import:madin -- --replace
      }
    }
    else {
      Write-Host 'Impor data dilewati. Jalankan nanti: npm run import:madin -- --replace' -ForegroundColor Yellow
    }
  }
  else {
    Write-Host "File $excel tidak ditemukan; impor dilewati." -ForegroundColor Yellow
  }
}

Write-Host "`n========================================`n" -ForegroundColor Green
Write-Host 'INSTALASI SELESAI.' -ForegroundColor Green
Write-Host 'Jalankan aplikasi dengan: .\\run.cmd' -ForegroundColor Green
Write-Host 'Atau: npm run launch' -ForegroundColor Green
Write-Host 'Web : http://localhost:5173' -ForegroundColor Gray
Write-Host 'API : http://localhost:3000/api' -ForegroundColor Gray
Write-Host 'Login: admin / admin123' -ForegroundColor Gray
