#!/usr/bin/env node
/**
 * Fails if the app version disagrees across the files that declare it.
 *
 * The release tag is derived from package.json, but the actual desktop
 * installer/app version comes from src-tauri/tauri.conf.json + Cargo.toml.
 * When these drift, a release ships installers stamped with the wrong
 * version (e.g. v5.5.1 tag, AcademiaTrack_5.5.0_universal.dmg). This guard
 * catches that mismatch in CI before a build is ever published.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/** Collect { source, version } pairs, skipping files that don't exist. */
function collect() {
  const sources = [];

  const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

  // package.json
  sources.push({ source: 'package.json', version: readJson('package.json').version });

  // package-lock.json (top-level version)
  const lock = readJson('package-lock.json');
  if (lock.version) {
    sources.push({ source: 'package-lock.json', version: lock.version });
  }

  // src-tauri/tauri.conf.json
  sources.push({
    source: 'src-tauri/tauri.conf.json',
    version: readJson('src-tauri/tauri.conf.json').version,
  });

  // src-tauri/Cargo.toml — version in the [package] section
  const cargoToml = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
  sources.push({
    source: 'src-tauri/Cargo.toml',
    version: parsePackageVersionFromCargoToml(cargoToml),
  });

  // src-tauri/Cargo.lock — version of the academia-track crate
  const cargoLock = fs.readFileSync(path.join(root, 'src-tauri/Cargo.lock'), 'utf8');
  const crateName = parsePackageNameFromCargoToml(cargoToml);
  sources.push({
    source: 'src-tauri/Cargo.lock',
    version: parseCrateVersionFromCargoLock(cargoLock, crateName),
  });

  return sources;
}

/** Read `version = "..."` from the first [package] table of a Cargo.toml. */
function parsePackageVersionFromCargoToml(text) {
  return parseFirstTableKey(text, 'package', 'version');
}

function parsePackageNameFromCargoToml(text) {
  return parseFirstTableKey(text, 'package', 'name');
}

function parseFirstTableKey(text, table, key) {
  const lines = text.split(/\r?\n/);
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[/.test(trimmed)) {
      inTable = trimmed === `[${table}]`;
      continue;
    }
    if (inTable) {
      const m = trimmed.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`));
      if (m) return m[1];
    }
  }
  return undefined;
}

/** Find the `version` of a named [[package]] entry in Cargo.lock. */
function parseCrateVersionFromCargoLock(text, crateName) {
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (new RegExp(`^name\\s*=\\s*"${crateName}"`, 'm').test(block)) {
      const m = block.match(/^version\s*=\s*"([^"]+)"/m);
      if (m) return m[1];
    }
  }
  return undefined;
}

function main() {
  const sources = collect();

  const missing = sources.filter((s) => !s.version);
  if (missing.length > 0) {
    const names = missing.map((s) => s.source).join(', ');
    console.error(`::error::Could not read a version from: ${names}`);
    process.exit(1);
  }

  const versions = [...new Set(sources.map((s) => s.version))];
  if (versions.length > 1) {
    console.error('::error::App version is inconsistent across files:');
    for (const s of sources) {
      console.error(`  ${s.source}: ${s.version}`);
    }
    console.error(
      'All of package.json, package-lock.json, src-tauri/tauri.conf.json, ' +
        'Cargo.toml and Cargo.lock must declare the same version.'
    );
    process.exit(1);
  }

  console.log(`Version is consistent across all sources: ${versions[0]}`);
}

main();
