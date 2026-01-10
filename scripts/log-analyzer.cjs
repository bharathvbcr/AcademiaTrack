const fs = require('fs');
const path = require('path');

const LOG_FILE = process.argv[2];

if (!LOG_FILE) {
    console.error('Usage: node log-analyzer.js <logfile>');
    process.exit(1);
}

if (!fs.existsSync(LOG_FILE)) {
    console.error(`Log file not found: ${LOG_FILE}`);
    process.exit(1);
}

const content = fs.readFileSync(LOG_FILE, 'utf-8');
const lines = content.split('\n');

const analysis = {
    errors: [],
    warnings: [],
    slowOperations: [],
    summary: {
        totalLines: lines.length,
        errorCount: 0,
        warningCount: 0
    }
};

const errorPatterns = [/error/i, /fail/i, /exception/i, /fatal/i];
const warningPatterns = [/warn/i, /deprecated/i];
// Heuristic for slow operations: lines containing durations > 5s or explicit duration logs
const durationPattern = /(\d+(\.\d+)?)s/;

lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // Check for errors
    if (errorPatterns.some(p => p.test(lowerLine))) {
        analysis.errors.push({ line: index + 1, content: line.trim() });
    }

    // Check for warnings
    if (warningPatterns.some(p => p.test(lowerLine))) {
        analysis.warnings.push({ line: index + 1, content: line.trim() });
    }

    // Check for slow durations if the line looks like a timing log
    if (line.includes('Done in') || line.includes('Finished')) {
        const match = line.match(durationPattern);
        if (match && parseFloat(match[1]) > 5.0) {
            analysis.slowOperations.push({ line: index + 1, duration: parseFloat(match[1]), content: line.trim() });
        }
    }
});

analysis.summary.errorCount = analysis.errors.length;
analysis.summary.warningCount = analysis.warnings.length;

// Generate Markdown Summary
const report = `
# Build Log Analysis

**Total Lines:** ${analysis.summary.totalLines}
**Errors:** ${analysis.summary.errorCount}
**Warnings:** ${analysis.summary.warningCount}

## 🔴 Critical Errors
${analysis.errors.length > 0 ? analysis.errors.map(e => `- L${e.line}: \`${e.content}\``).join('\n') : 'No critical errors found.'}

## 🟡 Warnings
${analysis.warnings.length > 0 ? analysis.warnings.slice(0, 10).map(e => `- L${e.line}: \`${e.content}\``).join('\n') : 'No warnings found.'}
${analysis.warnings.length > 10 ? `\n...and ${analysis.warnings.length - 10} more.` : ''}

## 🐢 Slow Operations (>5s)
${analysis.slowOperations.length > 0 ? analysis.slowOperations.map(o => `- ${o.duration}s: ${o.content}`).join('\n') : 'No noticeably slow operations detected.'}
`;

const reportPath = path.join(path.dirname(LOG_FILE), 'log-analysis-report.md');
fs.writeFileSync(reportPath, report);
console.log(`Analysis complete. Report saved to ${reportPath}`);
console.log(JSON.stringify(analysis.summary, null, 2));
