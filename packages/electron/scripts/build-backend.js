/**
 * Build script for packaging the backend with all workspace dependencies.
 *
 * This script:
 * 1. Builds all workspace packages
 * 2. Packs workspace dependencies into .tgz files
 * 3. Installs them into a local node_modules
 * 4. Copies the backend and its dependencies to backend-dist/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ELECTRON_DIR = path.resolve(__dirname, '..');
const BACKEND_DIST = path.join(ELECTRON_DIR, 'backend-dist');
const NODE_DIST = path.join(ELECTRON_DIR, 'node-dist');

/**
 * Executes a shell command and returns stdout.
 */
function exec(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, {
    cwd: MONOREPO_ROOT,
    stdio: 'inherit',
    ...options,
  });
}

/**
 * Ensures a directory exists, creating it if necessary.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Downloads a portable Node.js binary for Windows.
 */
async function downloadNodeJs() {
  console.log('Downloading portable Node.js...');
  
  const nodeVersion = '24.5.0';
  const downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-win-x64.zip`;
  const zipPath = path.join(ELECTRON_DIR, 'nodejs.zip');
  
  // Download
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    https.get(downloadUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
  
  // Extract using PowerShell
  console.log('Extracting Node.js...');
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${NODE_DIST}' -Force"`, {
    cwd: ELECTRON_DIR,
    stdio: 'inherit',
  });
  
  // Clean up zip
  fs.unlinkSync(zipPath);
  
  // Move files from nested directory to NODE_DIST root
  const extractedDir = path.join(NODE_DIST, `node-v${nodeVersion}-win-x64`);
  if (fs.existsSync(extractedDir)) {
    for (const item of fs.readdirSync(extractedDir)) {
      fs.renameSync(path.join(extractedDir, item), path.join(NODE_DIST, item));
    }
    fs.rmdirSync(extractedDir);
  }
  
  console.log('Node.js downloaded successfully!');
}

/**
 * Cleans the backend-dist directory.
 */
function clean() {
  console.log('Cleaning backend-dist...');
  if (fs.existsSync(BACKEND_DIST)) {
    fs.rmSync(BACKEND_DIST, { recursive: true });
  }
  ensureDir(BACKEND_DIST);
}

/**
 * Builds all workspace packages.
 */
function buildWorkspace() {
  console.log('Building workspace packages...');
  exec('pnpm build');
}

/**
 * Packs a workspace package into a .tgz file.
 *
 * @param pkgName - The package name (e.g., '@chess/core')
 * @param pkgPath - The relative path to the package
 * @returns The path to the generated .tgz file
 */
function packPackage(pkgName, pkgPath) {
  console.log(`Packing ${pkgName}...`);
  const pkgDir = path.join(MONOREPO_ROOT, pkgPath);

  // Run pnpm pack
  const result = execSync('pnpm pack', {
    cwd: pkgDir,
    encoding: 'utf-8',
  }).trim();

  // pnpm pack outputs the filename
  const tgzName = result.split('\n').pop().trim();
  return path.join(pkgDir, tgzName);
}

/**
 * Copies the backend dist and installs dependencies.
 */
function prepareBackend() {
  console.log('Preparing backend...');

  const backendDist = path.join(MONOREPO_ROOT, 'packages', 'backend', 'dist');
  const backendPackageJson = path.join(MONOREPO_ROOT, 'packages', 'backend', 'package.json');

  // Copy backend dist
  ensureDir(path.join(BACKEND_DIST, 'dist'));
  fs.cpSync(backendDist, path.join(BACKEND_DIST, 'dist'), { recursive: true });

  // Read backend package.json
  const pkgJson = JSON.parse(fs.readFileSync(backendPackageJson, 'utf-8'));

  // Pack workspace dependencies
  const workspaceDeps = {
    '@chess/core': 'packages/core',
    '@chess/config': 'packages/config',
    '@chess/logger': 'packages/logger',
    '@chess/game-records': 'packages/game-records',
    '@chess/types': 'packages/types',
  };

  const packedDeps = {};
  for (const [depName, depPath] of Object.entries(workspaceDeps)) {
    if (pkgJson.dependencies?.[depName]) {
      const tgzPath = packPackage(depName, depPath);
      const tgzFileName = path.basename(tgzPath);

      // Copy .tgz to backend-dist
      fs.copyFileSync(tgzPath, path.join(BACKEND_DIST, tgzFileName));

      // Update dependency to point to local .tgz
      packedDeps[depName] = `file:./${tgzFileName}`;

      // Clean up the .tgz in the source package
      fs.unlinkSync(tgzPath);
    }
  }

  // Create a new package.json for the backend-dist
  const newPkgJson = {
    name: 'chess-backend',
    version: '1.0.0',
    private: true,
    main: './dist/index.js',
    dependencies: {
      ...pkgJson.dependencies,
      ...packedDeps,
    },
  };

  // Remove workspace protocol dependencies
  for (const dep of Object.keys(newPkgJson.dependencies)) {
    if (newPkgJson.dependencies[dep]?.startsWith('workspace:')) {
      delete newPkgJson.dependencies[dep];
    }
  }
  
  // Add @chess/frontend as a file dependency (needed for serving static files)
  const frontendTgzPath = packPackage('@chess/frontend', 'packages/frontend');
  const frontendTgzFileName = path.basename(frontendTgzPath);
  fs.copyFileSync(frontendTgzPath, path.join(BACKEND_DIST, frontendTgzFileName));
  fs.unlinkSync(frontendTgzPath);
  newPkgJson.dependencies['@chess/frontend'] = `file:./${frontendTgzFileName}`;

  fs.writeFileSync(
    path.join(BACKEND_DIST, 'package.json'),
    JSON.stringify(newPkgJson, null, 2)
  );

  // Install dependencies using npm instead of pnpm to avoid workspace detection
  console.log('Installing dependencies...');
  execSync('npm install --production', {
    cwd: BACKEND_DIST,
    stdio: 'inherit',
  });

  // Clean up .tgz files after installation
  for (const tgzFile of fs.readdirSync(BACKEND_DIST)) {
    if (tgzFile.endsWith('.tgz')) {
      fs.unlinkSync(path.join(BACKEND_DIST, tgzFile));
    }
  }

  console.log('Backend prepared successfully!');
}

// Main
async function main() {
  try {
    clean();
    
    // Download Node.js if not exists
    if (!fs.existsSync(path.join(NODE_DIST, 'node.exe'))) {
      await downloadNodeJs();
    }
    
    buildWorkspace();
    prepareBackend();
    console.log('\n✅ Backend build complete!');
    console.log(`Output: ${BACKEND_DIST}`);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
