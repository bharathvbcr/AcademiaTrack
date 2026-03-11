<div align="center">
  <img src="AcademiaTrack.png" alt="AcademiaTrack Logo" width="150"/>
  <h1>AcademiaTrack</h1>
  <p>A modern, cross-platform application tracker to manage your academic pursuits.</p>
  
  ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

## Overview

AcademiaTrack helps you keep track of universities, programs, deadlines, and submissions all in one place. Designed with a clean, intuitive interface, it streamlines your application process, ensuring you never miss a beat.

## ✨ Features

- **📋 Comprehensive Tracking** — Monitor the status of all your applications
- **⏰ Deadline Management** — Keep an eye on important submission dates with countdown badges
- **🏫 Program Details** — Store and access information about various universities and programs
- **📊 Analytics Dashboard** — Visualize your application progress with charts
- **👥 Faculty & Recommenders** — Track faculty contacts and recommendation letter status
- **💰 Budget Tracking** — Manage application fees and financial offers
- **📅 Multiple Views** — List, Kanban, Calendar, and Timeline views
- **🌙 Dark Mode** — Easy on the eyes with automatic theme detection
- **🏷️ Tags & Labels** — Organize applications with custom tags
- **🔍 Advanced Search** — Filter and sort applications quickly

## 📥 Installation

### Windows

1. **Download the Installer:**  
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest Windows package from the most recent tag release.

2. **Run the Installer:**  
   Extract the downloaded archive if needed, then run the included Windows installer.

3. **Launch AcademiaTrack:**  
   Once installed, launch from your Start Menu or desktop shortcut.

### macOS

1. **Download the DMG:**  
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest macOS package from the most recent tag release.

2. **Install the App:**  
   Open the `.dmg` file and drag AcademiaTrack to your Applications folder.

3. **First Launch:**  
   Right-click the app and select "Open" to bypass Gatekeeper on first launch.

### Linux

1. **Download the Linux package:**  
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest Linux package from the most recent tag release.

2. **Install Dependencies (if needed):**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y libfuse2
   
   # Fedora
   sudo dnf install fuse
   ```

3. **Extract and Run:**
   ```bash
   tar -xzf AcademiaTrack-*.tar.gz
   ./installer
   ```

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) 1.3.8
- [Node.js](https://nodejs.org/) 22.x if you want npm as a fallback package manager
- Windows, macOS, or Linux

For desktop development and packaging, Bun should be installed and available on `PATH`. This repo treats Bun as the primary local toolchain even though `electrobun` is installed from npm. The Bun version is pinned in `.bun-version`, the Node version is pinned in `.nvmrc`, CI reads both files directly, and local development should match them when possible.

### Running Locally

```bash
# Clone the repository
git clone https://github.com/bharathvbcr/AcademiaTrack.git
cd AcademiaTrack

# Install dependencies (primary workflow)
bun install

# Start development server (web)
bun run dev

# Start desktop development mode with Electrobun
bun run dev:desktop
```

If you need npm for dependency installation, use an actively supported Node.js release line and treat it as a fallback workflow rather than the default.

This repository also applies a `patch-package` patch to `electrobun@1.15.1` during install. Do not skip `postinstall` in CI or local packaging environments, because the Windows packaging fix depends on that patch being applied to `node_modules`.

### Building from Source

```bash
# Build desktop app for current platform
bun run package

# Stable desktop artifacts are written to the 'build' and 'release' directories
```

The desktop runtime uses `electrobun`. Desktop packaging and release settings live in `electrobun.config.ts`. Legacy `npm run dev:electron` and `npm run build:electron` aliases remain for compatibility.

## 🚀 Releases

GitHub Actions is configured in two parts:

- `CI` runs on pushes and pull requests to `main` and performs install, typecheck, tests, and a desktop package build on Windows, macOS, and Linux.
- `CI` also runs a dedicated Windows `bun run package` smoke job to verify the patched ElectroBun packaging path.
- `Release` runs when a tag matching `v*` is pushed. It builds platform packages, uploads the artifacts, and creates a GitHub Release with generated notes plus the matching patch notes from `CHANGELOG.md`.

To publish a release:

```bash
git add .
git commit -m "Release 5.1.0"
git tag v5.1.0
git push origin main
git push origin v5.1.0
```

Patch notes for releases are sourced from the matching version section in `CHANGELOG.md`, so update that file before pushing a new tag.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
