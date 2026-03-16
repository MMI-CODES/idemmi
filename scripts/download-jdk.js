import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { finished } from 'stream/promises';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const JDK_DIR = path.join(ROOT_DIR, 'java-compiler');

const osName = process.platform === 'win32' ? 'windows' : (process.platform === 'darwin' ? 'mac' : 'linux');
const archName = process.arch === 'arm64' ? 'aarch64' : 'x64';
const actExt = osName === 'windows' ? 'zip' : 'tar.gz';

// API call to get the latest JDK 17
const ADOPTIUM_API_URL = `https://api.adoptium.net/v3/binary/latest/17/ga/${osName}/${archName}/jdk/hotspot/normal/eclipse?project=jdk`;
const ZIP_PATH = path.join(ROOT_DIR, `jdk.${actExt}`);

async function downloadFile(url, dest) {
  console.log(`Downloading JDK from Adoptium...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Unexpected response ${res.statusText}`);
  }
  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
}

async function extractZip() {
  console.log('Extracting JDK...');
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'tar' : 'tar';
  // Note: For Adoptium JDK zips on Windows we use tar -xf. On Linux we use tar -xzf for tar.gz
  const args = isWindows 
    ? ['-xf', `jdk.zip`]
    : ['-xzf', `jdk.tar.gz`];

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: ROOT_DIR });
    
    proc.stderr.on('data', (data) => console.error(`Extract error: ${data.toString()}`));
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Extraction failed with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    if (fs.existsSync(JDK_DIR)) {
      console.log('Local JDK already exists. Skipping download.');
      return;
    }

    await downloadFile(ADOPTIUM_API_URL, ZIP_PATH);
    await extractZip();
    
    const files = fs.readdirSync(ROOT_DIR);
    const extractedFolder = files.find(f => {
      const fullPath = path.join(ROOT_DIR, f);
      return f.toLowerCase().startsWith('jdk') && fs.statSync(fullPath).isDirectory();
    });
    
    if (extractedFolder) {
      fs.renameSync(path.join(ROOT_DIR, extractedFolder), JDK_DIR);
      console.log('JDK installed successfully into /java-compiler!');
    } else {
      console.error('Extraction failed: Could not find any folder starting with "jdk". Contents:');
      console.error(files.join(', '));
    }

    if (fs.existsSync(ZIP_PATH)) {
      fs.unlinkSync(ZIP_PATH);
    }
  } catch (err) {
    console.error('Error during JDK setup:', err);
    if (fs.existsSync(ZIP_PATH)) {
      // Keep zip on error to debug or delete it. Let's delete it so next time is fresh.
      fs.unlinkSync(ZIP_PATH);
    }
  }
}

main();
