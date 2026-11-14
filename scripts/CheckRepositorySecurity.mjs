/** Refuse accidental commits of private student archives or Firebase Admin credentials. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

// Check the Git index, not all local files; private working files must never be opened.
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

const sensitivePaths = [
    /(?:^|\/)firebase-private(?:\/|\.|$)/i,
    /(?:^|\/)(?:secrets|credentials|private-data)(?:\/|$)/i,
    /(?:serviceaccount|service-account|adminsdk|\-admin)\.json$/i,
    /\.(?:csv|tsv|xlsx?|ods|sql|sqlite3?|db|bak|backup|rar|7z|zip|tar|tgz|pem|p12|pfx|key)$/i,
];
const checkedExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.txt', '.rules', '.env']);
const violations = [];

for (const file of tracked) {
    // Git can force-add ignored environment files: block that escape hatch too.
    const isPrivateEnv = /(?:^|\\/)\\.env(?:\\.[^/]+)?$/i.test(file) && !/\\.example$/i.test(file);
    if (isPrivateEnv || sensitivePaths.some(pattern => pattern.test(file))) {
        violations.push(`Sensitive tracked path: ${file}`);
        continue;
    }
    // Scanning only relevant text files avoids inspecting or exposing public media.
    if (!checkedExtensions.has(extname(file).toLowerCase()) || file === 'scripts/CheckRepositorySecurity.mjs') continue;
    const source = readFileSync(file, 'utf8');
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)
        || /"type"\s*:\s*"service_account"/.test(source)) {
        violations.push(`Potential private credential embedded in tracked file: ${file}`);
    }
}

if (violations.length) {
    console.error('Repository security check failed:');
    violations.forEach(message => console.error(`- ${message}`));
    process.exitCode = 1;
} else {
    console.log(`Repository security check passed: ${tracked.length} tracked paths reviewed.`);
}
