import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { finished } from 'stream/promises';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const PYTHON_DIR = path.join(ROOT_DIR, 'python-runtime');

// Python 3.12 embeddable package for Windows x64
const PYTHON_URL = 'https://www.python.org/ftp/python/3.12.9/python-3.12.9-embed-amd64.zip';
// get-pip.py script for installing pip into the embedded runtime
const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';
const ZIP_PATH = path.join(ROOT_DIR, 'python.zip');
const GET_PIP_PATH = path.join(PYTHON_DIR, 'get-pip.py');

async function downloadFile(url, dest) {
  console.log(`Downloading ${path.basename(url)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.statusText} (${url})`);
  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  console.log(`Downloaded: ${dest}`);
}

async function extractZip(zipPath, destDir) {
  console.log(`Extracting ${path.basename(zipPath)} into ${destDir}...`);
  fs.mkdirSync(destDir, { recursive: true });
  
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'tar' : 'unzip';
  const args = isWindows 
    ? ['-xf', zipPath, '-C', destDir]
    : ['-q', zipPath, '-d', destDir];

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: ROOT_DIR });
    proc.stderr.on('data', (d) => console.error(`Extract error: ${d.toString().trim()}`));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Extraction failed with code ${code}`));
    });
  });
}

async function runInPython(args) {
  const pythonExe = path.join(PYTHON_DIR, 'python.exe');
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExe, args, { cwd: PYTHON_DIR });
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`python ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function enableImportLib() {
  // The embedded Python disables imports from pip by having a disabled line
  // in pythonXX._pth. We uncomment "import site" to allow pip to work.
  const pthFiles = fs.readdirSync(PYTHON_DIR).filter(f => f.endsWith('._pth'));
  for (const pthFile of pthFiles) {
    const pthPath = path.join(PYTHON_DIR, pthFile);
    let content = fs.readFileSync(pthPath, 'utf-8');
    if (content.includes('#import site')) {
      content = content.replace('#import site', 'import site');
      fs.writeFileSync(pthPath, content, 'utf-8');
      console.log(`Enabled import site in ${pthFile}`);
    }
  }
}

async function main() {
  try {
    const isWindows = process.platform === 'win32';
    const pyExePath = isWindows ? 'python.exe' : path.join('bin', 'python');
    if (fs.existsSync(PYTHON_DIR) && fs.existsSync(path.join(PYTHON_DIR, pyExePath))) {
      console.log('Local Python runtime already exists. Skipping download.');
      return;
    }

    if (!isWindows) {
      console.log('Detected Linux/macOS. Setting up python environment natively...');
      const { execSync } = await import('child_process');
      try {
        execSync('apt-get update -y && apt-get install -y python3 python3-venv python3-pip', { stdio: 'inherit' });
      } catch (e) {
        console.log('Apt-get failed or skipped. Assuming python3 and venv are available.');
      }
      execSync(`python3 -m venv ${PYTHON_DIR}`, { stdio: 'inherit' });
      const pipPath = path.join(PYTHON_DIR, 'bin', 'pip');
      execSync(`${pipPath} install psutil pytest rich pydantic numpy pandas PyYAML`, { stdio: 'inherit' });
      console.log('\n✅ Python runtime installed successfully!');
      return;
    }

    // 1. Download Python embeddable
    await downloadFile(PYTHON_URL, ZIP_PATH);

    // 2. Extract it
    await extractZip(ZIP_PATH, PYTHON_DIR);
    fs.unlinkSync(ZIP_PATH);

    // 3. Enable import site so pip can work
    await enableImportLib();

    // 4. Download get-pip.py
    await downloadFile(GET_PIP_URL, GET_PIP_PATH);

    // 5. Install pip using the embedded Python
    console.log('Installing pip into embedded Python...');
    await runInPython([GET_PIP_PATH, '--no-warn-script-location']);

    // 6. Install psutil
    console.log('Installing Python libraries (psutil, numpy, pandas, etc.)...');
    await runInPython(['-m', 'pip', 'install',
      'psutil',
      'pytest',
      'rich',
      'pydantic',
      'numpy',
      'pandas',
      'PyYAML',
      '--no-warn-script-location'
    ]);

    // Clean up get-pip.py
    if (fs.existsSync(GET_PIP_PATH)) fs.unlinkSync(GET_PIP_PATH);

    console.log('\n✅ Python runtime installed successfully into /python-runtime!');
  } catch (err) {
    console.error('Error during Python setup:', err);
    if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
    process.exit(1);
  }
}

main();
