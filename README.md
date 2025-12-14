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

# Start Electron development mode
npm run dev:electron
```

### Building from Source

```bash
# Build for current platform
npm run build:electron

# Output will be in the 'release' directory
```

## 🔐 Code Signing (Optional)

For production releases, you can enable code signing to avoid security warnings.

### macOS Notarization

1. **Get an Apple Developer Account** at [developer.apple.com](https://developer.apple.com)

2. **Create an App-Specific Password** at [appleid.apple.com](https://appleid.apple.com)

3. **Export your Developer ID certificate** as a `.p12` file and base64 encode it:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```

4. **Add these secrets** to your GitHub repository (Settings → Secrets):
   - `APPLE_ID` — Your Apple developer email
   - `APPLE_APP_SPECIFIC_PASSWORD` — App-specific password
   - `APPLE_TEAM_ID` — Your Team ID (found in Membership)
   - `CSC_LINK` — Base64-encoded .p12 certificate
   - `CSC_KEY_PASSWORD` — Certificate password

5. **Enable signing** in `package.json`:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAM_ID)",
     "notarize": true
   }
   ```

### Windows Code Signing

For Windows, you'll need an EV Code Signing Certificate from a trusted CA.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
