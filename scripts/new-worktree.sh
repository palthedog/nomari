#!/bin/bash
set -e

# Usage: ./scripts/new_worktree.sh <branch_name>
# Creates a git worktree at ../worktrees/nomari/nomari_<branch_name>

if [ -z "$1" ]; then
    echo "Usage: $0 <branch_name>"
    exit 1
fi

BRANCH_NAME="$1"

# Move to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

# Worktree destination path
WORKTREE_BASE="../worktrees/nomari"
WORKTREE_PATH="${WORKTREE_BASE}/nomari_${BRANCH_NAME}"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree already exists at $WORKTREE_PATH"
    exit 1
fi

# Create base directory if needed
mkdir -p "$WORKTREE_BASE"

# Check if branch exists (local or remote)
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}" 2>/dev/null; then
    echo "Creating worktree for existing local branch: $BRANCH_NAME"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
elif git show-ref --verify --quiet "refs/remotes/origin/${BRANCH_NAME}" 2>/dev/null; then
    echo "Creating worktree for existing remote branch: origin/$BRANCH_NAME"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    echo "Creating worktree with new branch: $BRANCH_NAME"
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
fi

echo ""
echo "Worktree created at: $WORKTREE_PATH"

# Copy .claude/ directory if it exists
if [ -d "$PROJECT_ROOT/.claude" ]; then
    cp -r "$PROJECT_ROOT/.claude" "$WORKTREE_PATH/.claude"
    echo "Copied .claude/ directory (command permissions preserved)"
fi

echo ""
echo "To start working:"
echo "  cd $WORKTREE_PATH"
echo "  npm install"
