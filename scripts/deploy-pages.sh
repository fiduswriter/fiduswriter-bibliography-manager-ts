#!/usr/bin/env bash
# Build the demo site and push it to the git-pages branch served by the
# Forgejo Pages (git-pages v2) instance at git.fiduswriter.org.
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

echo "Building @fiduswriter/bibliography-manager..."
npm run build

echo "Building demo..."
npm run build:demo

echo "Preparing pages build..."
BUILD_DIR="$ROOT/.pages-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cp "$ROOT/demo/index.html" "$BUILD_DIR/"
cp "$ROOT/demo/demo.css" "$BUILD_DIR/"
cp "$ROOT/demo/bundle.js" "$BUILD_DIR/"
cp "$ROOT/demo/logo.svg" "$BUILD_DIR/"
cp "$ROOT/demo/sample-bibliography.json" "$BUILD_DIR/"
cp -r "$ROOT/demo/css" "$BUILD_DIR/"
cp -r "$ROOT/demo/workers" "$BUILD_DIR/"
cp -r "$ROOT/demo/vendor" "$BUILD_DIR/"

cd "$BUILD_DIR"
git init
git checkout -b pages
git add .
git commit -m "Deploy @fiduswriter/bibliography-manager to git-pages"

REMOTE=$(cd "$ROOT" && git remote get-url origin)
echo "Pushing to $REMOTE pages branch..."
git remote add origin "$REMOTE"
git push -f origin pages

cd "$ROOT"
rm -rf "$BUILD_DIR"
echo "Done. Available at https://fiduswriter.pages.fiduswriter.org/fiduswriter-bibliography-manager-ts/"
