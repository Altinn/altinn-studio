#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream, chmodSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import { extract as tarExtract } from 'tar';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const CACHE_DIR = join(projectRoot, '.cache');
const BIN_DIR = join(CACHE_DIR, 'bin');
const BROWSERS_DIR = join(CACHE_DIR, 'browsers');

// Ensure cache directories exist
mkdirSync(BIN_DIR, { recursive: true });
mkdirSync(BROWSERS_DIR, { recursive: true });

/**
 * Parse .tool-versions file
 */
function parseToolVersions(content) {
  const tools = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      tools[parts[0]] = {
        version: parts[1],
        checksumURL: parts[2],
      };
    }
  }

  return tools;
}

/**
 * Get platform-specific values
 */
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  const osMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'windows',
  };

  const archMap = {
    x64: 'amd64',
    arm64: 'arm64',
  };

  return {
    os: osMap[platform] || platform,
    arch: archMap[arch] || arch,
  };
}

/**
 * Expand URL template with placeholders
 */
function expandURL(template, os, arch, version) {
  return template
    .replace(/{os}/g, os)
    .replace(/{arch}/g, arch)
    .replace(/{version}/g, version)
    .replace(/{version_no_v}/g, version.replace(/^v/, ''));
}

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const getFunc = url.startsWith('https') ? httpsGet : httpGet;

    getFunc(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(dest);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        rmSync(dest, { force: true });
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Fetch checksum from URL
 */
async function fetchChecksum(checksumURL, filename) {
  return new Promise((resolve, reject) => {
    const getFunc = checksumURL.startsWith('https') ? httpsGet : httpGet;

    getFunc(checksumURL, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        fetchChecksum(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch checksum: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        const lines = data.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Format: "checksum  filename" or just "checksum"
          const parts = trimmed.split(/\s+/);

          if (parts.length === 1 && /^[0-9a-f]{64}$/i.test(parts[0])) {
            resolve(parts[0]);
            return;
          }

          if (parts.length >= 2) {
            const checksum = parts[0];
            const file = parts[1];

            if (file.includes(filename)) {
              resolve(checksum);
              return;
            }
          }
        }

        reject(new Error('Checksum not found in response'));
      });
    }).on('error', reject);
  });
}

/**
 * Verify SHA256 checksum
 */
function verifySHA256(filePath, expectedChecksum) {
  const hash = createHash('sha256');
  const data = readFileSync(filePath);
  hash.update(data);
  const actualChecksum = hash.digest('hex');

  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
  }
}

/**
 * Get installed version of k6
 */
function getK6Version() {
  const k6Path = join(BIN_DIR, 'k6');

  if (!existsSync(k6Path)) {
    return null;
  }

  try {
    const output = execSync(`"${k6Path}" version`, { encoding: 'utf-8' });
    const match = output.match(/k6 v([0-9.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Install k6
 */
async function installK6(version, checksumURL) {
  const { os, arch } = getPlatform();
  const versionNoV = version.replace(/^v/, '');
  const installedVersion = getK6Version();

  if (installedVersion === versionNoV) {
    console.log(`✓ k6 ${installedVersion} already installed`);
    return;
  }

  console.log(`Installing k6 ${version}...`);

  // Build download URL
  const filename = `k6-${version}-${os}-${arch}.tar.gz`;
  const url = `https://github.com/grafana/k6/releases/download/${version}/${filename}`;
  const tmpFile = join(CACHE_DIR, filename);

  try {
    // Download
    await downloadFile(url, tmpFile);

    // Verify checksum
    const expandedChecksumURL = expandURL(checksumURL, os, arch, version);
    const expectedChecksum = await fetchChecksum(expandedChecksumURL, filename);
    verifySHA256(tmpFile, expectedChecksum);

    // Extract
    const tmpExtractDir = join(CACHE_DIR, 'k6-tmp');
    mkdirSync(tmpExtractDir, { recursive: true });

    await tarExtract({
      file: tmpFile,
      cwd: tmpExtractDir,
    });

    // Find and move binary
    const binaryPattern = join(tmpExtractDir, `k6-${version}-${os}-${arch}`, 'k6');
    const destBinary = join(BIN_DIR, 'k6');

    if (existsSync(binaryPattern)) {
      const binaryData = readFileSync(binaryPattern);
      writeFileSync(destBinary, binaryData);
      chmodSync(destBinary, 0o755);
    } else {
      throw new Error('k6 binary not found in archive');
    }

    // Cleanup
    rmSync(tmpFile, { force: true });
    rmSync(tmpExtractDir, { recursive: true, force: true });

    console.log(`✓ k6 ${versionNoV} installed successfully`);
  } catch (error) {
    rmSync(tmpFile, { force: true });
    throw error;
  }
}


/**
 * Install Chromium via @puppeteer/browsers
 */
function installChromium(version) {
  console.log(`Installing Chromium ${version}...`);

  try {
    const browsersDir = join(CACHE_DIR, 'browsers');
    mkdirSync(browsersDir, { recursive: true });

    // Use @puppeteer/browsers to install chrome-headless-shell
    const installCmd = `npx @puppeteer/browsers install chrome-headless-shell@${version}`;
    execSync(installCmd, {
      stdio: 'inherit',
      cwd: browsersDir,
      env: { ...process.env, PUPPETEER_CACHE_DIR: browsersDir }
    });

    console.log(`✓ Chromium ${version} installed successfully`);
  } catch (error) {
    console.error('Failed to install Chromium:', error.message);
    throw error;
  }
}

/**
 * Main setup function
 */
async function main() {
  try {
    // Parse .tool-versions
    const toolVersionsPath = join(projectRoot, 'tools/.tool-versions');
    const toolVersionsContent = readFileSync(toolVersionsPath, 'utf-8');
    const tools = parseToolVersions(toolVersionsContent);

    // Install k6
    if (tools.k6) {
      await installK6(tools.k6.version, tools.k6.checksumURL);
    }

    // Install Chromium
    if (tools.chromium) {
      installChromium(tools.chromium.version);
    }

    console.log('\n✓ Setup complete!');
    console.log(`\nk6 installed in: ${BIN_DIR}`);
    console.log(`Chromium browser installed in: ${BROWSERS_DIR}`);
    console.log('\nTo run k6 tests:');
    console.log(`  make test`);
    console.log('\nOr manually:');
    console.log(`  export PATH="${BIN_DIR}:$PATH"`);
    console.log('  k6 run your-test.js');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

main();
