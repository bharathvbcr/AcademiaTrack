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
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest `AcademiaTrack-Setup-x.x.x.exe` file.

2. **Run the Installer:**  
   Execute the downloaded `.exe` file and follow the on-screen instructions.

3. **Launch AcademiaTrack:**  
   Once installed, launch from your Start Menu or desktop shortcut.

### macOS

1. **Download the DMG:**  
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest `AcademiaTrack-x.x.x.dmg` file.

2. **Install the App:**  
   Open the `.dmg` file and drag AcademiaTrack to your Applications folder.

3. **First Launch:**  
   Right-click the app and select "Open" to bypass Gatekeeper on first launch.

### Linux

1. **Download the AppImage:**  
   Visit the [Releases](https://github.com/bharathvbcr/AcademiaTrack/releases) page and download the latest `AcademiaTrack-x.x.x.AppImage` file.

2. **Install Dependencies (if needed):**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y libfuse2
   
   # Fedora
   sudo dnf install fuse
   ```

3. **Make Executable & Run:**
   ```bash
   chmod +x AcademiaTrack-*.AppImage
   ./AcademiaTrack-*.AppImage
   ```

## 🛠️ Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20.x or later
- npm (included with Node.js)

### Running Locally

```bash
# Clone the repository
git clone https://github.com/bharathvbcr/AcademiaTrack.git
cd AcademiaTrack

# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start desktop development mode with Electrobun
npm run dev:desktop
```

### Building from Source

```bash
# Build desktop app for current platform
npm run build:desktop

# Output will be in the 'build' and 'release' directories
```

The desktop runtime uses `electrobun`. Desktop packaging and release settings live in `electrobun.config.ts`. Legacy `npm run dev:electron` and `npm run build:electron` aliases remain for compatibility.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
