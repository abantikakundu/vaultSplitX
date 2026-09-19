import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceRelative = path.join('contracts', 'vaultSplitX.compact');
const outputRelative = path.join('managed', 'vaultSplitX');

const source = path.join(rootDir, sourceRelative);
const output = path.join(rootDir, outputRelative);

if (!existsSync(source)) {
  throw new Error(`Compact source file not found: ${source}`);
}

// Ensure parent directory exists
mkdirSync(path.dirname(output), { recursive: true });

console.log(`Compiling Compact contract: ${sourceRelative} -> ${outputRelative}`);

let result;
if (process.platform === 'win32') {
  // Convert Windows path to WSL mount path
  const toWslPath = (winPath) => {
    const resolved = path.resolve(winPath).replace(/\\/g, '/');
    const driveMatch = resolved.match(/^([A-Za-z]):\/(.*)$/);
    if (driveMatch) {
      return `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
    }
    return resolved;
  };

  const wslSource = toWslPath(source);
  const wslOutput = toWslPath(output);
  const compactBin = process.env.COMPACT_BIN ?? '/home/rupamghosh2006/.local/bin/compact';

  console.log(`Executing via WSL: ${compactBin} compile "${wslSource}" "${wslOutput}"`);
  result = spawnSync('wsl', ['-e', 'sh', '-c', `"${compactBin}" compile "${wslSource}" "${wslOutput}"`], {
    stdio: 'inherit',
  });
} else {
  const compiler = process.env.COMPACT_BIN ?? 'compact';
  console.log(`Executing: ${compiler} compile "${source}" "${output}"`);
  result = spawnSync(compiler, ['compile', source, output], { stdio: 'inherit' });
}

if (result.error) {
  throw new Error(`Failed to execute Midnight Compact compiler: ${result.error.message}`);
}

if (result.status !== 0) {
  console.error(`Compact compilation failed with exit code ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log('VaultSplitX Compact contract compiled successfully!');
