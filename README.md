# AcademiaTrack

Academic Application Tracker - Track universities, programs, deadlines, and submissions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/) (v10 or higher)

### Installation

```bash
npm install
```

This repo uses the native TypeScript 7 beta compiler (`tsgo`) for typechecking and Electron compilation, while keeping the official TypeScript 6 compatibility package installed for tooling that still expects the JavaScript `typescript` API during the beta transition.

### Development

To start the application in development mode:

```bash
npm run dev:electron
```

This will concurrently start the Vite development server and the Electron application.

### Building and Packaging

To build and package the application for your current platform:

```bash
npm run build:electron
```

The packaged application will be located in the `release/` directory.

## Testing

To run native TypeScript 7 typechecking:

```bash
npm run typecheck
```

To run the unit and integration tests:

```bash
npm run test:run
```

## Technologies

- [React](https://reactjs.org/)
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Vitest](https://vitest.dev/)
