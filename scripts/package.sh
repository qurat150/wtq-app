#!/usr/bin/env bash
# Builds the submission ZIP (section 7):  output/ (CSVs) + source/ (project code) [+ demo/].
# Usage: npm run package   (after `npm run batch -- --bills test/bills --csv test/csv --out output`)
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf submission && mkdir -p submission/output submission/source
cp output/level1.csv output/level2.csv submission/output/
# Every tracked or new, non-ignored file: .env.local, node_modules, data/, output/ are excluded by .gitignore.
git ls-files --cached --others --exclude-standard -z | xargs -0 -I{} rsync -R "{}" submission/source/
[ -d demo ] && cp -R demo submission/demo || true
rm -f submission.zip && (cd submission && zip -qr ../submission.zip .)
if grep -rqE "AIza[0-9A-Za-z_-]{30,}|sk-ant-[0-9A-Za-z_-]{20,}" submission; then echo "✗ A real API key was found in the package. Aborting." >&2; rm submission.zip; exit 1; fi
echo "✓ submission.zip ($(du -h submission.zip | cut -f1)): $(cd submission && find . -type f | wc -l | tr -d ' ') files"
