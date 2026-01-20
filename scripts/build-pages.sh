#!/bin/bash
set -e

# Repository name (GitHub Pages subpath)
BASE_PATH="/Mari/"

# Move to project root
cd "$(dirname "$0")/.."

# Build dependent packages
npm run generate --workspace=@mari/ts-proto
npm run build --workspace=@mari/ts-proto

# Build frontend (with base path specified)
cd apps/frontend
npx vite build --base="$BASE_PATH" --outDir=../../docs --emptyOutDir

echo "Build completed: pages/"
