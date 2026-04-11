#!/bin/bash

echo "Stopping Next.js dev server..."
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo "Removing database..."
rm -f devcycle.db devcycle.db-shm devcycle.db-wal

echo "Removing Next.js build cache..."
rm -rf .next 2>/dev/null || rm -rf .next

echo "Removing cloned repos..."
rm -rf ../kb/repos

echo "Starting dev server..."
npm run dev
