const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const command = process.argv.slice(2);

if (command.length === 0) {
    console.error('Usage: node measure-build.js <label> <command> [args...]');
    process.exit(1);
}

const label = command[0];
const cmd = command[1];
const args = command.slice(2);
const REPORT_FILE = path.join(__dirname, '../build-timings.json');

console.log(`[${label}] Starting: ${cmd} ${args.join(' ')}`);
const startTime = process.hrtime();

const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true
});

child.on('close', (code) => {
    const diff = process.hrtime(startTime);
    const durationSeconds = (diff[0] * 1e9 + diff[1]) / 1e9;

    console.log(`[${label}] Finished in ${durationSeconds.toFixed(3)}s with exit code ${code}`);

    let timings = [];
    if (fs.existsSync(REPORT_FILE)) {
        try {
            timings = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
        } catch (e) { }
    }

    timings.push({
        label,
        command: `${cmd} ${args.join(' ')}`,
        duration: durationSeconds,
        timestamp: new Date().toISOString(),
        exitCode: code
    });

    fs.writeFileSync(REPORT_FILE, JSON.stringify(timings, null, 2));
});
