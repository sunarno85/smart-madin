@echo off
cd /d F:\madin\apps\api
set DATABASE_URL=postgresql://smartmadin:smartmadin@localhost:5432/smartmadin?schema=public
set JWT_SECRET=smart-madin-jwt-secret-2024-change-in-production
set JWT_REFRESH_SECRET=smart-madin-refresh-secret-2024-change-in-production
set APP_URL=http://localhost:5173
set API_PORT=3000
set NODE_ENV=development
node dist/main.js > F:\madin\api.log 2> F:\madin\api.err.log
