#!/usr/bin/env bash
# Install repo git hooks into .git/hooks/. Safe to re-run.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
src="$repo_root/scripts/hooks/pre-commit"
hooks_dir=$(git rev-parse --git-path hooks)
dest="$hooks_dir/pre-commit"

mkdir -p "$hooks_dir"
install -m 0755 "$src" "$dest"
echo "Installed $dest"

patterns_file="$(git rev-parse --git-common-dir)/forbidden-patterns"
if [ ! -e "$patterns_file" ]; then
  cat > "$patterns_file" <<'EOF'
# One extended-regex pattern per line. Lines starting with # are ignored.
# This file lives inside the git dir so it is never committed. Add tenant
# slugs, internal hostnames, or other strings you don't want to push.
logans-lounge
EOF
  echo "Created $patterns_file (add your patterns to it)"
else
  # Seed default patterns into an existing file if missing. Idempotent.
  for default in logans-lounge; do
    if ! grep -Eq "^[[:space:]]*${default}[[:space:]]*$" "$patterns_file"; then
      printf '%s\n' "$default" >> "$patterns_file"
      echo "Added default pattern '$default' to $patterns_file"
    fi
  done
fi
