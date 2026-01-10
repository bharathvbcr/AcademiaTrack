const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const INTERVAL_MS = 1000; // Sample every second
const OUTPUT_FILE = path.join(__dirname, '../build-profile.json');

const command = process.argv.slice(2);

if (command.length === 0) {
    console.error('Usage: node build-profiler.js <command> [args...]');
    process.exit(1);
}

const stats = {
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: os.totalmem(),
    cpus: os.cpus().length,
    startTime: Date.now(),
    samples: []
};

console.log(`Starting build profiler for command: ${command.join(' ')}`);

const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: true
});

const sampler = setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();

    stats.samples.push({
        timestamp: Date.now() - stats.startTime,
        memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
        },
        cpuLoad: cpuLoad, // 1, 5, 15 min averages
        freeMem: os.freemem()
    });
}, INTERVAL_MS);

child.on('close', (code) => {
    clearInterval(sampler);
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;
    stats.exitCode = code;

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
    console.log(`Build profile saved to ${OUTPUT_FILE}`);

    // Quick summary
    const maxHeap = Math.max(...stats.samples.map(s => s.memory.heapUsed));
    console.log(`Summary: Duration ${(stats.duration / 1000).toFixed(2)}s, Max Heap Used: ${(maxHeap / 1024 / 1024).toFixed(2)} MB`);

    process.exit(code);
});

child.on('error', (err) => {
    console.error('Failed to start child process:', err);
    process.exit(1);
});
