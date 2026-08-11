#!/bin/bash

echo "🚀 Iniciando InterLockerUp en desarrollo..."

# Backend
cd ~/Documentos/InterLockerUp/backend
npm run dev &
BACKEND_PID=$!

# Frontend
cd ~/Documentos/InterLockerUp/frontend
npm run dev &
FRONTEND_PID=$!

# Admin
cd ~/Documentos/InterLockerUp/interlockerup-admin
npm run dev &
ADMIN_PID=$!

echo "✅ Backend, Frontend y Admin corriendo"
echo "   Presiona Ctrl+C para detener todo"

# Al hacer Ctrl+C mata los 3 procesos
trap "kill $BACKEND_PID $FRONTEND_PID $ADMIN_PID; exit" SIGINT
wait
