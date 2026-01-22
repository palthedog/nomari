#!/bin/bash
set -e

# Repository name (GitHub Pages subpath)
BASE_PATH="/nomari/"

# Move to project root
cd "$(dirname "$0")/.."

# Build dependent packages
npm run generate --workspace=@nomari/ts-proto
npm run build --workspace=@nomari/ts-proto

# Build frontend (with base path specified)
cd apps/frontend
npx vite build --base="$BASE_PATH" --outDir=../../docs --emptyOutDir

echo "Build completed: pages/"
