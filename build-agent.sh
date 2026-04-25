#!/usr/bin/env bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       CYRI Agent — Build Script          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "  [ERROR] Node.js is not installed."
  echo "          Install it from: https://nodejs.org"
  exit 1
fi
echo "  [OK] Node.js $(node -v) found"

# ── Install pkg if missing ─────────────────────────────────────────────────
if ! command -v pkg &> /dev/null; then
  echo "  [INFO] Installing pkg globally..."
  npm install -g pkg
fi
echo "  [OK] pkg ready"

# ── Install dependencies ───────────────────────────────────────────────────
echo "  [INFO] Installing dependencies..."
npm install systeminformation axios
echo "  [OK] Dependencies ready"

# ── Create output dir ──────────────────────────────────────────────────────
mkdir -p dist-agent

# ── Build ──────────────────────────────────────────────────────────────────
echo ""
echo "  [INFO] Building CYRI-Agent.exe (takes 1-2 min)..."
pkg agent-cjs.js --targets node18-win-x64 --output dist-agent/CYRI-Agent.exe

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   ✅ Build complete!                     ║"
echo "  ║   Output: dist-agent/CYRI-Agent.exe      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
