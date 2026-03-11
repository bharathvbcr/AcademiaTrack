const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const outputPath = path.join(repoRoot, '.github', 'release-notes.md');
const packageJsonPath = path.join(repoRoot, 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageVersion = packageJson.version;
const normalizeEnvValue = (value) =>
  value && value !== 'undefined' && value !== 'null' ? value : '';
const repositoryPath = (packageJson.repository?.url || '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '')
  .replace(/^https:\/\/github\.com\//, '');
const githubRepository = normalizeEnvValue(process.env.GITHUB_REPOSITORY) || repositoryPath;
const githubServerUrl = normalizeEnvValue(process.env.GITHUB_SERVER_URL) || 'https://github.com';
const changelogRef = normalizeEnvValue(process.env.GITHUB_SHA) || 'main';
const tag = normalizeEnvValue(process.env.GITHUB_REF_NAME) || process.argv[2] || `v${packageVersion}`;
const version = tag.replace(/^refs\/tags\//, '').replace(/^v/, '');

if (!version) {
  throw new Error('Unable to determine the release version.');
}

const changelog = fs.readFileSync(changelogPath, 'utf8');
const sectionPattern = new RegExp(
  `^## \\[${version.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\][\\s\\S]*?(?=^## \\[|\\Z)`,
  'm',
);
const match = changelog.match(sectionPattern);

const releaseNotes = match
  ? [
      `## Patch Notes`,
      '',
      match[0].trim(),
      '',
      `[Full changelog](${githubServerUrl}/${githubRepository}/blob/${changelogRef}/CHANGELOG.md)`,
    ].join('\n')
  : [
      '## Patch Notes',
      '',
      `No changelog section was found for \`${version}\`.`,
      '',
      `[Full changelog](${githubServerUrl}/${githubRepository}/blob/${changelogRef}/CHANGELOG.md)`,
    ].join('\n');

fs.writeFileSync(outputPath, `${releaseNotes}\n`);
