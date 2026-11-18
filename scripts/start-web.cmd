@echo off
cd /d F:\madin\apps\web
node F:\madin\node_modules\vite\bin\vite.js --port 5173 --strictPort > F:\madin\web.log 2> F:\madin\web.err.log
