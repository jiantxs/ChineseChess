/**
 * Electron main process bundling script using esbuild.
 *
 * This script bundles the Electron main process (src/main.ts) into a single
 * file (dist/main.js), inlining all workspace dependencies (@chess/*) and
 * npm dependencies to avoid runtime module resolution issues in the packaged app.
 *
 * Problem solved:
 * - Electron imports @chess/backend (workspace symlink)
 * - @chess/backend imports @chess/core, @chess/config, etc. (more workspace deps)
 * - electron-builder only includes packages/electron/node_modules
 * - Workspace deps of workspace deps are NOT included, causing "Cannot find module" errors
 * - Bundling everything into a single file eliminates this issue
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Plugin to resolve @chess/* workspace imports from the monorepo root.
 * Maps @chess/backend -> packages/backend/src/index.ts
 */
const workspaceResolverPlugin = {
  name: 'workspace-resolver',
  setup(build) {
    // Resolve @chess/* imports from workspace packages
    build.onResolve({ filter: /^@chess\// }, (args) => {
      const match = args.path.match(/^@chess\/([^/]+)(?:\/(.+))?$/);
      if (!match) return null;

      const [, pkgName, subPath] = match;
      const pkgDir = path.resolve(__dirname, '..', pkgName, 'src');

      // Try resolving as a file first, then as a directory with index
      let resolvedPath;
      if (subPath) {
        // Sub-path import: @chess/backend/services/logger
        const withExt = path.resolve(pkgDir, `${subPath}.ts`);
        const asDir = path.resolve(pkgDir, subPath, 'index.ts');

        if (fs.existsSync(withExt)) {
          resolvedPath = withExt;
        } else if (fs.existsSync(asDir)) {
          resolvedPath = asDir;
        }
      } else {
        // Direct package import: @chess/backend
        const indexPath = path.resolve(pkgDir, 'index.ts');
        if (fs.existsSync(indexPath)) {
          resolvedPath = indexPath;
        }
      }

      if (resolvedPath) {
        return { path: resolvedPath };
      }

      return null;
    });
  },
};

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('Building Electron main process...');

  // Clean dist directory
  const distDir = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Build with esbuild
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src', 'main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.resolve(distDir, 'main.js'),
    format: 'esm',
    sourcemap: true,
    minify: false, // Keep readable for debugging
    plugins: [workspaceResolverPlugin],
    external: [
      // Electron is provided by the runtime
      'electron',
      // Native modules that can't be bundled
      'bufferutil',
      'utf-8-validate',
    ],
    define: {
      // Keep __dirname as runtime value for asset resolution
      '__dirname': '__dirname',
    },
    banner: {
      js: 'import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
    },
    resolveExtensions: ['.ts', '.js', '.json'],
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    // Ensure we can resolve node_modules from electron package
    nodePaths: [path.resolve(__dirname, 'node_modules')],
  });

  if (result.errors.length > 0) {
    console.error('Build errors:', result.errors);
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('Build warnings:', result.warnings);
  }

  console.log('✓ Bundled main process to dist/main.js');

  // Copy frontend assets from backend/public to dist/public
  const publicSrc = path.resolve(__dirname, '..', 'backend', 'public');
  const publicDest = path.resolve(distDir, 'public');

  if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, publicDest);
    console.log('✓ Copied frontend assets to dist/public');
  } else {
    console.warn('⚠ Backend public directory not found at', publicSrc);
  }

  // Copy APK to dist/public/assets
  const apkSrc = path.resolve(__dirname, 'apk_floder', 'app.apk');
  const apkDestDir = path.resolve(distDir, 'public', 'assets');
  const apkDest = path.resolve(apkDestDir, 'app.apk');

  if (fs.existsSync(apkSrc)) {
    if (!fs.existsSync(apkDestDir)) {
      fs.mkdirSync(apkDestDir, { recursive: true });
    }
    fs.copyFileSync(apkSrc, apkDest);
    console.log('✓ Copied app.apk to dist/public/assets');
  } else {
    console.warn('⚠ APK not found at', apkSrc);
  }

  // Verify the bundled file has no external @chess/* imports
  const bundledCode = fs.readFileSync(path.resolve(distDir, 'main.js'), 'utf-8');
  const externalChessImports = bundledCode.match(/require\(['"]@chess\/[^'"]+['"]\)/g);

  if (externalChessImports) {
    console.error('✗ ERROR: Bundled file still has external @chess/* imports:');
    externalChessImports.forEach(imp => console.error('  -', imp));
    process.exit(1);
  }

  console.log('✓ Verified: No external @chess/* imports in bundled output');
  console.log('\nBuild complete!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
