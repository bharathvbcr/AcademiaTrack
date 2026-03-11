import type { ElectrobunConfig } from "electrobun";
import packageJson from "./package.json";

const config: ElectrobunConfig = {
  app: {
    name: "AcademiaTrack",
    identifier: "com.bharathvbcr.academia-track",
    version: packageJson.version,
    description: packageJson.description,
  },
  build: {
    buildFolder: "build",
    artifactFolder: "release",
    bun: {
      entrypoint: "src/bun/main.ts",
      sourcemap: "external",
    },
    views: {
      app: {
        entrypoint: "index.tsx",
        sourcemap: "external",
      },
    },
    copy: {
      "index.html": "views/app/index.html",
      "AcademiaTrack.png": "views/app/AcademiaTrack.png",
      "public/favicon.ico": "views/app/favicon.ico",
      "assets/icon.png": "assets/icon.png",
      "assets/MicrosoftEdgeWebview2Setup.exe":
        "Resources/MicrosoftEdgeWebview2Setup.exe",
    },
    win: {
      icon: "assets/icon.ico.ico",
    },
    linux: {
      icon: "assets/icon.png",
    },
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  release: {
    baseUrl: "https://github.com/bharathvbcr/AcademiaTrack/releases/latest/download",
    generatePatch: true,
  },
  scripts: {
    preBuild: "./scripts/pre-build.ts",
  },
};

export default config;
