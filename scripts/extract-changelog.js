#!/usr/bin/env node
/**
 * Extract changelog entry for a specific version from CHANGELOG.md
 * Usage: node scripts/extract-changelog.js <version>
 * Outputs the changelog entry to stdout (for use in GitHub Actions)
 */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node extract-changelog.js <version>');
  process.exit(1);
}

const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const content = fs.readFileSync(changelogPath, 'utf-8');

// Pattern to match the version header and everything until the next version header
// Version header format: ## [0.1.5] - 2026-07-15
const versionHeaderRegex = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm');
const match = content.match(versionHeaderRegex);

if (!match) {
  console.error(`Version ${version} not found in CHANGELOG.md`);
  process.exit(1);
}

const startIndex = match.index;
// Find the next version header (## [x.x.x] - date)
const nextVersionMatch = content.slice(startIndex + 1).match(/^## \[/m);

let endIndex;
if (nextVersionMatch) {
  endIndex = startIndex + 1 + nextVersionMatch.index;
} else {
  endIndex = content.length;
}

const changelogEntry = content.slice(startIndex, endIndex).trim();

// Output for GitHub Actions (escape newlines for multiline output)
console.log(changelogEntry);
