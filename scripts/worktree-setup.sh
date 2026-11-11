#!/usr/bin/env bash
# Worktree setup for contracts.
# Called after a linked worktree is created, by any harness.
set -euo pipefail

# Refuse to run in the main checkout.
git_dir="$(cd "$(git rev-parse --git-dir)" && pwd -P)"
common_dir="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
if [ "$git_dir" = "$common_dir" ]; then
    echo "worktree-setup: not a linked worktree; nothing to do"
    exit 0
fi

main_path="$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')"
worktree_path="$(pwd -P)"
worktree_name="$(basename "$worktree_path")"

# Copy local files listed in .worktreeinclude, when the repo has one.
if [ -f .worktreeinclude ]; then
    while IFS= read -r entry; do
        entry="${entry%%#*}"
        entry="$(printf '%s' "$entry" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
        [ -n "$entry" ] || continue
        case "$entry" in
            /*|*..*)
                echo "worktree-setup: skip unsafe path: $entry" >&2
                continue
                ;;
        esac
        if [ -e "$main_path/$entry" ] && [ ! -e "$entry" ]; then
            mkdir -p "$(dirname "$entry")"
            cp -a "$main_path/$entry" "$entry"
            echo "worktree-setup: copied $entry"
        fi
    done < .worktreeinclude
fi

{
    printf 'WORKTREE_NAME=%s\n' "$worktree_name"
    printf 'WORKTREE_PATH=%s\n' "$worktree_path"
    printf 'MAIN_PATH=%s\n' "$main_path"
} > .worktree.env

git config --local core.hooksPath hooks
echo "worktree-setup: core.hooksPath set to hooks"

echo "worktree-setup: $worktree_name"

# Dependencies. This is one npm workspace, so the root install covers
# every package. The lockfile is committed.
if [ ! -d node_modules ]; then
    npm ci
fi
