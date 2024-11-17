import { build } from 'tsup';
import { copy, rename, remove } from 'fs-extra';
import path from 'path';
import fs from 'fs/promises';

async function buildTestExtension() {
  console.log('Building test extension...');
  
  const distPath = path.join(process.cwd(), 'dist');
  
  // Clean
  await remove(distPath);
  
  // Build the scripts
  await build({
    entry: {
      'background': 'test/extension/background.ts',
      'content': 'test/extension/content.tsx'
    },
    outDir: 'dist',
    format: ['iife'],
    platform: 'browser',
    target: 'esnext',
    minify: false,
    sourcemap: true,
    clean: false,
    define: {
      'process.env.NODE_ENV': '"development"'
    },
    dts: false
  });

  // Rename the .global.js files to .js
  const files = [
    ['background.global.js', 'background.js'],
    ['content.global.js', 'content.js']
  ];

  for (const [oldName, newName] of files) {
    if (await pathExists(path.join(distPath, oldName))) {
      await rename(
        path.join(distPath, oldName),
        path.join(distPath, newName)
      );
    }
  }

  // Copy static files
  console.log('Copying extension files...');
  await copy(
    path.join(process.cwd(), 'test/extension/manifest.json'),
    path.join(distPath, 'manifest.json')
  );
  await copy(
    path.join(process.cwd(), 'test/extension/index.html'),
    path.join(distPath, 'index.html')
  );

  // Verify the build
  const finalFiles = await fs.readdir(distPath);
  console.log('Final extension files:', finalFiles);

  console.log('Test extension build complete!');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

buildTestExtension().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});