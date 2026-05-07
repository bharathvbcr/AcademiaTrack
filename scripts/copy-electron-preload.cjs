const { copyFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

const source = resolve(__dirname, '../electron/preload.cjs');
const destination = resolve(__dirname, '../dist-electron/preload.cjs');

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
