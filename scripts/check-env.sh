#!/bin/bash
# Check for missing environment variables
# Usage: ./scripts/check-env.sh [backend|extension]

set -e

ENV_DIR=${1:-backend}

if [ "$ENV_DIR" = "backend" ]; then
  EXAMPLE_FILE="backend/.env.example"
  ENV_FILE="backend/.env"
elif [ "$ENV_DIR" = "extension" ]; then
  EXAMPLE_FILE="extension/.env.example"
  ENV_FILE="extension/.env"
else
  echo "Usage: $0 [backend|extension]"
  exit 1
fi

echo "Checking $ENV_FILE against $EXAMPLE_FILE..."
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE does not exist!"
  echo "✅ Run: cp $EXAMPLE_FILE $ENV_FILE"
  exit 1
fi

# Extract variable names (ignore comments and empty lines)
EXAMPLE_VARS=$(grep -E '^[A-Z_]+=' "$EXAMPLE_FILE" | cut -d '=' -f1 | sort)
ENV_VARS=$(grep -E '^[A-Z_]+=' "$ENV_FILE" | cut -d '=' -f1 | sort)

# Find missing variables
MISSING=$(comm -23 <(echo "$EXAMPLE_VARS") <(echo "$ENV_VARS"))

if [ -z "$MISSING" ]; then
  echo "✅ All variables from .env.example are present in .env"
  echo ""
  echo "Variables found:"
  echo "$ENV_VARS" | sed 's/^/  - /'
else
  echo "❌ Missing variables in $ENV_FILE:"
  echo ""
  echo "$MISSING" | while read -r var; do
    echo "  $var"
    # Show the example value
    grep "^$var=" "$EXAMPLE_FILE" || true
  done
  echo ""
  echo "Add these variables to $ENV_FILE"
fi
