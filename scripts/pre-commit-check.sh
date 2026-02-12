#!/bin/bash
# Pre-commit safety check
# Run this before committing to ensure no secrets are committed

set -e

echo "🔍 Checking for secrets in staged files..."

# Check if .env files are staged
if git diff --cached --name-only | grep -E "\.env$|\.env\.production$|\.env\.staging$"; then
  echo ""
  echo "❌ ERROR: You're about to commit .env files with secrets!"
  echo ""
  echo "Files detected:"
  git diff --cached --name-only | grep -E "\.env$|\.env\.production$|\.env\.staging$"
  echo ""
  echo "These files should be in .gitignore and never committed."
  echo "Run: git reset HEAD <file> to unstage them"
  exit 1
fi

# Check for common secret patterns in staged files
SECRETS_FOUND=false

# Check for API keys
if git diff --cached | grep -E "GEMINI_API_KEY=.{20,}|SUPABASE_.*KEY=.{20,}|JWT_SECRET=.{20,}"; then
  echo ""
  echo "⚠️  WARNING: Possible API keys or secrets detected in staged changes!"
  echo ""
  echo "Lines containing potential secrets:"
  git diff --cached | grep -E "GEMINI_API_KEY=|SUPABASE_.*KEY=|JWT_SECRET=" | head -5
  echo ""
  echo "Make sure these are in .env.example (with placeholder values), not real secrets!"
  SECRETS_FOUND=true
fi

# Check for hardcoded URLs
if git diff --cached | grep -E "https://.*\.railway\.app|localhost:8000.*['\"]" | grep -v "TODO\|example\|VITE_BACKEND_URL"; then
  echo ""
  echo "⚠️  WARNING: Hardcoded URLs detected!"
  echo ""
  echo "URLs should be in config files, not hardcoded in source."
  SECRETS_FOUND=true
fi

if [ "$SECRETS_FOUND" = true ]; then
  echo ""
  echo "Review the warnings above before committing."
  echo "Press Ctrl+C to cancel, or Enter to continue anyway..."
  read
fi

echo "✅ Pre-commit check passed!"
