#!/bin/bash

################################################################################
# Script to check for and remove .env and .env.save files from git repository
# Usage: ./backend/scripts/check_and_remove_env_files.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Git Environment Files Security Check ===${NC}\n"

# Function to check if file exists in git history
check_file_in_history() {
    local file=$1
    echo "Checking for $file in git history..."

    # Check in current HEAD
    if git ls-tree -r HEAD --name-only | grep -q "^${file}$"; then
        echo -e "${RED}⚠️  FOUND: $file exists in current HEAD${NC}"
        return 0
    fi

    # Check in all branches
    if git ls-tree -r --name-only $(git rev-parse --abbrev-ref --all) | grep -q "^${file}$"; then
        echo -e "${RED}⚠️  FOUND: $file exists in some branch${NC}"
        return 0
    fi

    # Check in git history
    if git log --all --full-history --name-only --pretty=format: | grep -q "^${file}$"; then
        echo -e "${RED}⚠️  FOUND: $file found in git history${NC}"
        return 0
    fi

    echo -e "${GREEN}✓ $file not found in repository${NC}"
    return 1
}

# Function to check .gitignore
check_gitignore() {
    local file=$1
    if grep -q "^${file}" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✓ $file is in .gitignore${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $file is NOT in .gitignore${NC}"
        return 1
    fi
}

# Function to remove file from git history
remove_from_history() {
    local file=$1
    echo -e "\n${YELLOW}Removing $file from git history...${NC}"

    # Check if there are unstaged changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${RED}Error: You have unstaged changes. Please stash or commit them first.${NC}"
        exit 1
    fi

    # Export the filter-branch warning silencer
    export FILTER_BRANCH_SQUELCH_WARNING=1

    # Remove from all branches and tags
    git filter-branch --force --index-filter \
        "git rm --cached --ignore-unmatch $file" \
        --prune-empty \
        --tag-name-filter cat \
        -- --all

    echo -e "${GREEN}✓ Removed $file from git history${NC}"
}

# Function to add to .gitignore
add_to_gitignore() {
    local file=$1
    echo "Adding $file to .gitignore..."

    # Check if already in .gitignore
    if grep -q "^${file}" .gitignore; then
        echo "  Already in .gitignore, skipping..."
        return 0
    fi

    # Add to .gitignore
    echo "$file" >> .gitignore
    echo -e "${GREEN}✓ Added $file to .gitignore${NC}"
}

# Main script
FOUND_ISSUES=false

# Array of files to check
FILES_TO_CHECK=(".env" ".env.save")

for FILE in "${FILES_TO_CHECK[@]}"; do
    echo -e "\n${YELLOW}--- Checking $FILE ---${NC}"

    # Check if file is in .gitignore
    check_gitignore "$FILE"

    # Check if file exists in repository
    if check_file_in_history "$FILE"; then
        FOUND_ISSUES=true

        # Ask user if they want to remove it
        echo -e "\n${RED}⚠️  $FILE found in repository!${NC}"
        read -p "Do you want to remove $FILE from git history? (y/N): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            remove_from_history "$FILE"
            add_to_gitignore "$FILE"

            # Ask about force pushing
            echo -e "\n${YELLOW}The file has been removed from local git history.${NC}"
            read -p "Do you want to force push to remote? (y/N): " -n 1 -r
            echo

            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Force pushing to remote..."
                git push origin --force --all
                git push origin --force --tags
                echo -e "${GREEN}✓ Force pushed to remote${NC}"
            else
                echo -e "${YELLOW}⚠️  Remember to force push manually:${NC}"
                echo "  git push origin --force --all"
                echo "  git push origin --force --tags"
            fi
        else
            echo -e "${YELLOW}Skipped removal of $FILE${NC}"
        fi
    fi
done

# Check for local .env files that should be removed
echo -e "\n${YELLOW}--- Checking for local .env files ---${NC}"

for FILE in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${YELLOW}Found local $FILE file${NC}"
        ls -lh "$FILE" | awk '{print "  Size: " $5}'
    fi
done

# Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"

if [ "$FOUND_ISSUES" = false ]; then
    echo -e "${GREEN}✓ No .env or .env.save files found in repository${NC}"
    echo -e "${GREEN}✓ Your repository is clean!${NC}"
else
    echo -e "${YELLOW}⚠️  Issues were found and addressed${NC}"
fi

# Show current .gitignore status
echo -e "\n${YELLOW}--- Current .gitignore entries ---${NC}"
if [ -f ".gitignore" ]; then
    grep -E "^\.env" .gitignore || echo "No .env entries found in .gitignore"
else
    echo -e "${RED}.gitignore file not found!${NC}"
fi
