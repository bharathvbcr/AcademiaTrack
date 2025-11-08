<div align="center">
  <img src="AcademiaTrack.png" alt="AcademiaTrack Logo" width="150"/>
  <h1>AcademiaTrack</h1>
  <p>A modern, Windows-inspired application tracker to manage your academic pursuits.</p>
</div>

## Overview

AcademiaTrack helps you keep track of universities, programs, deadlines, and submissions all in one place. Designed with a clean, intuitive interface, it streamlines your application process, ensuring you never miss a beat.

## Features

*   **Comprehensive Tracking:** Monitor the status of all your applications.
*   **Deadline Management:** Keep an eye on important submission dates.
*   **Program Details:** Store and access information about various universities and programs.
*   **Intuitive UI:** A user-friendly interface inspired by modern Windows design.

## Run Locally

**Prerequisites:** Node.js

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up environment (if applicable):**
    If your application uses a `GEMINI_API_KEY` or similar, create a `.env.local` file in the root directory and add your key:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```
    *(Note: The current `metadata.json` and `package.json` don't explicitly mention Gemini API usage for the core application tracking, but the original README did. I'll keep this as a placeholder if future AI features are integrated.)*

3.  **Run the app in development mode:**
    ```bash
    npm run dev
    ```
    This will start the web version of the application.

4.  **Run the Electron desktop app (optional):**
    ```bash
    npm run dev:electron
    ```
    This will launch the desktop version of AcademiaTrack.

## Build for Production

To build the application for production:

```bash
npm run build
npm run build:electron
```

This will create a `dist` folder for the web build and a platform-specific installer for the Electron app.

## Installation (Desktop App)

For Windows users, AcademiaTrack is available as a standalone desktop application.

1.  **Download the Installer:**
    Visit the [Releases page](YOUR_RELEASES_PAGE_URL_HERE) and download the latest `AcademiaTrack-Setup-X.Y.Z.exe` file.
2.  **Run the Installer:**
    Execute the downloaded `.exe` file and follow the on-screen instructions to install AcademiaTrack on your system.
3.  **Launch AcademiaTrack:**
    Once installed, you can launch AcademiaTrack from your Start Menu or desktop shortcut.

*(Note: Replace `YOUR_RELEASES_PAGE_URL_HERE` with the actual URL to your GitHub releases page or other distribution platform.)*

## Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` (if available) for more details.

## License

This project is licensed under the [MIT License](LICENSE) (if applicable).
