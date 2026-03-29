#!/usr/bin/env bash
# Rebuild and deploy infrastructure-mcp documentation
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "Building docs..."
mkdocs build --clean --quiet

echo "Docs deployed to $PROJECT_DIR/site"
echo "Live at https://infrastructure-mcp.hesketh.pro"
