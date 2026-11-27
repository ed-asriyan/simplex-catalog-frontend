#!/usr/bin/env bash
# Story ids vs. the tests that cite them, per level of tests (unit, e2e, …).
# Lists, per level, the stories no test cites; the citations of stories that do
# not exist; and, per story, the test files citing it.
#
# Usage: story_coverage.sh <stories file> <story id regex> <level>=<source dir>:<test file glob> [...]
#   e.g. story_coverage.sh docs/user-stories.md 'US-[A-Z][0-9]+[a-z]?' unit=bot/src:tests.rs e2e=e2e/tests:*.rs
# A story is defined where its id is written in bold and followed by a full
# stop (`**US-D12.`); paths are relative to the repository root.
set -euo pipefail
if [ $# -lt 3 ]; then
  sed -n '6,7p' "$0" >&2
  exit 2
fi
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
stories="$root/$1"
id="$2"
shift 2

# grep exits 1 when it finds nothing, which is a result here, not an error.
defined=$( { grep -oE "\*\*$id\." "$stories" || true; } | grep -oE "$id" | sort -u || true)

levels=()
for spec in "$@"; do
  level="${spec%%=*}"
  rest="${spec#*=}"
  src="$root/${rest%%:*}"
  glob="${rest#*:}"
  levels+=("$level|$src|$glob")
done

cited_in() { # level spec -> cited ids
  IFS='|' read -r _ src glob <<<"$1"
  { grep -rhoE "$id" "$src" --include="$glob" || true; } | sort -u
}

for spec in "${levels[@]}"; do
  level="${spec%%|*}"
  echo "## Stories no $level test cites"
  comm -23 <(echo "$defined") <(cited_in "$spec") || true
  echo
done

echo "## Tests citing stories that do not exist"
for spec in "${levels[@]}"; do
  IFS='|' read -r level src glob <<<"$spec"
  for s in $(comm -13 <(echo "$defined") <(cited_in "$spec")); do
    { grep -rlE "$s\b" "$src" --include="$glob" || true; } | sed "s|^$root/|  $s  |"
  done
done
echo

echo "## Citations per story"
for s in $defined; do
  line="$s:"
  for spec in "${levels[@]}"; do
    IFS='|' read -r level src glob <<<"$spec"
    files=$( { grep -rlE "$s([^0-9a-z]|$)" "$src" --include="$glob" || true; } | sed "s|^$root/||" | tr '\n' ' ')
    line="$line  [$level] ${files:-—}"
  done
  echo "$line"
done
