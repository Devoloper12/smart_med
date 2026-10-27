const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

console.log('Building Smart Medicine Frontend for Vercel...');

// Clean and recreate dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all relevant files and directories from frontend
const rootEntries = fs.readdirSync(srcDir, { withFileTypes: true });

for (const entry of rootEntries) {
  const srcPath = path.join(srcDir, entry.name);
  const destPath = path.join(distDir, entry.name);

  // Skip build artifacts and config files not needed in static dist
  if (
    entry.name === 'dist' ||
    entry.name === 'node_modules' ||
    entry.name === 'build.js' ||
    entry.name === 'package.json' ||
    entry.name === 'package-lock.json' ||
    entry.name.startsWith('.')
  ) {
    continue;
  }

  if (entry.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`Copied directory: ${entry.name}/ -> dist/${entry.name}/`);
  } else if (entry.isFile()) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied file: ${entry.name} -> dist/${entry.name}`);
  }
}

// Support optional Vercel environment variable injection
const envApiUrl = process.env.RENDER_API_URL || process.env.API_URL;
if (envApiUrl) {
  const distConfigPath = path.join(distDir, 'js', 'config.js');
  if (fs.existsSync(distConfigPath)) {
    let configContent = fs.readFileSync(distConfigPath, 'utf8');
    const cleanUrl = envApiUrl.trim().replace(/\/+$/, '');
    const finalUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    configContent = configContent.replace(/DEFAULT_RENDER_API:\s*['"`][^'"`]+['"`]/, `DEFAULT_RENDER_API: '${finalUrl}'`);
    fs.writeFileSync(distConfigPath, configContent, 'utf8');
    console.log(`Injected RENDER_API_URL: ${finalUrl} into config.js`);
  }
}

console.log('Build completed successfully. Output directory "dist" is ready for Vercel deployment.');
