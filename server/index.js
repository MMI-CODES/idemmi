import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import kill from 'tree-kill';
import { fileURLToPath } from 'url';
import { SERVER_CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// In production, serve the Vite build
app.use(express.static(path.join(__dirname, '../dist')));

// Endpoint for the client to retrieve the current server config
app.get('/api/config', (req, res) => {
  res.json(SERVER_CONFIG);
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create temp directory', err);
  }
}
ensureTempDir();

// Cleanup orphaned session directories (runs at startup and every hour)
async function cleanupOrphanedSessions() {
  try {
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    const now = Date.now();
    // A folder is considered orphaned if it's older than the maximum possible idle timeout + 5 minutes
    const maxAgeMs = SERVER_CONFIG.CLIENT_IDLE_TIMEOUT_MS + (5 * 60 * 1000); 
    let deletedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folderPath = path.join(TEMP_DIR, entry.name);
      try {
        const stats = await fs.stat(folderPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.rm(folderPath, { recursive: true, force: true });
          deletedCount++;
        }
      } catch (err) {
        // Ignore stats/rm errors for individual folders (e.g. already deleted in parallel)
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} orphaned session directories.`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[Cleanup] Failed to clean orphaned sessions:', err);
    }
  }
}

// Run cleanup immediately on startup, then every 1 hour
cleanupOrphanedSessions();
setInterval(cleanupOrphanedSessions, 60 * 60 * 1000);

// Store active processes
const activeProcesses = new Map();

// Track idle timeouts for sockets
const socketIdleTimers = new Map();

// Track explicitly connected clients (more reliable than io.engine.clientsCount which can lag during React dev StrictMode reconnects)
const connectedClients = new Set();

io.on('connection', (socket) => {
  if (connectedClients.size >= SERVER_CONFIG.MAX_CONNECTED_CLIENTS) {
    console.log(`Connection rejected: too many clients (${connectedClients.size}).`);
    socket.emit('server_full');
    socket.disconnect(true);
    return;
  }

  connectedClients.add(socket.id);
  console.log(`Client connected: ${socket.id} (total: ${connectedClients.size})`);

  // Setup idle timeout
  const resetIdleTimer = () => {
    if (socketIdleTimers.has(socket.id)) {
      clearTimeout(socketIdleTimers.get(socket.id));
    }
    const timer = setTimeout(() => {
      console.log(`Client ${socket.id} disconnected due to idle timeout.`);
      socket.emit('idle_timeout');
      socket.disconnect(true);
    }, SERVER_CONFIG.CLIENT_IDLE_TIMEOUT_MS);
    socketIdleTimers.set(socket.id, timer);
  };
  
  resetIdleTimer();

  socket.on('run', async (payload) => {
    resetIdleTimer();
    if (activeProcesses.size >= SERVER_CONFIG.MAX_CONCURRENT_CLIENTS) {
      socket.emit('output', { type: 'stderr', data: `Le serveur est surchargé (max ${SERVER_CONFIG.MAX_CONCURRENT_CLIENTS} clients). Veuillez patienter...\n` });
      socket.emit('finished', { code: 1 });
      return;
    }

    const { files, activeFile } = payload;
    
    if (activeFile && activeFile.includes('..')) {
      socket.emit('output', { type: 'stderr', data: 'Chemin de fichier invalide (tentative de traversée de répertoire détectée).\n' });
      socket.emit('finished', { code: 1 });
      return;
    }

    if (!activeFile) {
      socket.emit('output', { type: 'stderr', data: 'Aucun fichier actif sélectionné.\n' });
      socket.emit('finished', { code: 1 });
      return;
    }

    const safeActiveFile = path.basename(activeFile);
    const ext = path.extname(safeActiveFile);
    if (!['.java', '.py'].includes(ext)) {
      socket.emit('output', { type: 'stderr', data: `Langage non supporté pour l'exécution: ${ext}\n` });
      socket.emit('finished', { code: 1 });
      return;
    }

    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    
    try {
      // Validate file count
      if (!Array.isArray(files) || files.length === 0) {
        socket.emit('output', { type: 'stderr', data: 'Aucun fichier reçu.\n' });
        socket.emit('finished', { code: 1 });
        return;
      }
      if (files.length > SERVER_CONFIG.MAX_FILES_PER_SESSION) {
        socket.emit('output', { type: 'stderr', data: `Trop de fichiers envoyés (max ${SERVER_CONFIG.MAX_FILES_PER_SESSION}).\n` });
        socket.emit('finished', { code: 1 });
        return;
      }

      await fs.mkdir(sessionDir, { recursive: true });
      
      // Write all files to the temporary session directory (with size limit)
      for (const file of files) {
        if (file.name && file.content !== undefined) {
          const safeName = path.basename(file.name);
          const sizeBytes = Buffer.byteLength(file.content, 'utf8');
          if (sizeBytes > SERVER_CONFIG.MAX_FILE_SIZE_BYTES) {
            socket.emit('output', { type: 'stderr', data: `Fichier "${safeName}" trop volumineux (${(sizeBytes / 1024).toFixed(1)} Ko, max ${SERVER_CONFIG.MAX_FILE_SIZE_BYTES / 1024} Ko).\n` });
            socket.emit('finished', { code: 1 });
            return;
          }
          await fs.writeFile(path.join(sessionDir, safeName), file.content);
        }
      }

      socket.emit('output', { type: 'system', data: `Démarrage de la session (${sessionId})...\n` });
      
      let childEnv = process.env;
      let cmd, args, compileCmd;

      const isWin = process.platform === 'win32';
      // Identify local JDK paths
      const localJavacPath = path.join(__dirname, '..', 'java-compiler', 'bin', isWin ? 'javac.exe' : 'javac');
      const localJavaPath = path.join(__dirname, '..', 'java-compiler', 'bin', isWin ? 'java.exe' : 'java');
      
      let useLocalJava = false;
      try {
        await fs.access(localJavacPath);
        useLocalJava = true;
      } catch (e) {
        useLocalJava = false;
      }

      // Identify local Python path (embedded runtime on win, venv on linux)
      const localPythonPath = path.join(__dirname, '..', 'python-runtime', isWin ? 'python.exe' : path.join('bin', 'python'));
      let useLocalPython = false;
      try {
        await fs.access(localPythonPath);
        useLocalPython = true;
      } catch (e) {
        useLocalPython = false;
      }

      // Identify Java libs directory (pre-downloaded JARs)
      const javaLibsDir = path.join(__dirname, '..', 'java-libs');
      let javaLibsClasspath = '';
      try {
        await fs.access(javaLibsDir);
        // Use wildcard so all JARs are picked up
        javaLibsClasspath = javaLibsDir + path.sep + '*';
      } catch (e) { /* no libs dir, compile without */ }

      if (ext === '.java') {
        socket.emit('output', { type: 'system', data: `Compilation en cours...\n` });
        
        // Compile Java with a specific maximum memory during build
        compileCmd = useLocalJava ? localJavacPath : 'javac';
        // Include java-libs on classpath if available
        const cpArg = javaLibsClasspath ? ['-cp', `${javaLibsClasspath}${path.delimiter}.`] : [];
        const javaFiles = files.filter(f => f.name && f.name.endsWith('.java')).map(f => path.basename(f.name));
        const compileArgs = [`-J-Xmx${SERVER_CONFIG.MAX_MEMORY_MB}m`, ...cpArg, ...javaFiles];
        const compileProc = spawn(compileCmd, compileArgs, { cwd: sessionDir });
        
        const compileTimeout = setTimeout(() => {
          if (compileProc.pid) kill(compileProc.pid);
        }, SERVER_CONFIG.MAX_COMPILE_TIME_MS);

        await new Promise((resolve, reject) => {
          let compileError = '';
          compileProc.stderr.on('data', (data) => compileError += data.toString());
          compileProc.on('close', (code) => {
            clearTimeout(compileTimeout);
            if (code !== 0) {
              socket.emit('output', { type: 'stderr', data: compileError });
              reject(new Error("Compilation failed"));
            } else {
              resolve();
            }
          });
        });

        const className = path.basename(safeActiveFile, '.java');
        cmd = useLocalJava ? localJavaPath : 'java';
        
        // Prepare strict Java Policy Sandbox file
        const policyTemplate = await fs.readFile(path.join(__dirname, 'sandbox.policy.template'), 'utf-8');
        let policyContent = policyTemplate.replace(/\$\{SESSION_DIR\}/g, sessionDir.replace(/\\/g, '/'));
        // Also grant read access to java-libs so service loaders (SLF4J, JDBC drivers…) can find providers
        if (javaLibsClasspath) {
          const javaLibsForPolicy = javaLibsDir.replace(/\\/g, '/');
          policyContent += `\ngrant { permission java.io.FilePermission "${javaLibsForPolicy}/-", "read"; };\n`;
        }
        await fs.writeFile(path.join(sessionDir, 'sandbox.policy'), policyContent);


        const runtimeCpArg = javaLibsClasspath
          ? ['-cp', `${javaLibsClasspath}${path.delimiter}.`]
          : [];

        args = [
          `-Xmx${SERVER_CONFIG.MAX_MEMORY_MB}m`,
          ...runtimeCpArg,
          `-Djava.security.manager`,
          `-Djava.security.policy==sandbox.policy`,
          className
        ];
        socket.emit('output', { type: 'system', data: `Exécution (RAM max: ${SERVER_CONFIG.MAX_MEMORY_MB}Mo)...\n` });

      } else if (ext === '.py') {
        // We write a wrapper script to enforce some basic time/memory concepts defensively in Python 
        // since `resource` isn't fully supported on Windows.
        const wrapperContent = `
import sys
import threading
import os
import time
import psutil

# Force stdout/stderr to UTF-8 to prevent charmap encoding errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Block network and system command execution securely using audit hooks
def audit_hook(event, args):
    blocked_events = [
        "os.system", "os.spawn", "os.exec", "os.posix_spawn",
        "subprocess.Popen", "socket.connect", "socket.bind",
        "urllib.Request"
    ]
    if event in blocked_events:
        raise PermissionError(f"L'accès système et réseau est strictement désactivé par sécurité. (Bloqué: {event})")

sys.addaudithook(audit_hook)

# Force matplotlib to use the non-interactive Agg backend (no GUI needed)
# This must happen before any other matplotlib import
os.environ.setdefault('MPLBACKEND', 'Agg')

MAX_MEM_MB = ${SERVER_CONFIG.MAX_MEMORY_MB}

def enforce_limits():
    p = psutil.Process(os.getpid())
    while True:
        try:
            mem_info = p.memory_info()
            if mem_info.rss > MAX_MEM_MB * 1024 * 1024:
                sys.stderr.write("\\n[Erreur] Limite de RAM Python atteinte.\\n")
                os._exit(1)
        except psutil.NoSuchProcess:
            break
        time.sleep(0.5)  # Check every 500ms, not in a busy loop

t = threading.Thread(target=enforce_limits, daemon=True)
t.start()

# Run user script directly with runpy for proper __name__, __file__ etc.
import runpy
runpy.run_path("${safeActiveFile.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", run_name="__main__")
`;

        await fs.writeFile(path.join(sessionDir, '__run_wrapper.py'), wrapperContent);
        
        cmd = useLocalPython ? localPythonPath : 'python';
        args = ['__run_wrapper.py'];
        socket.emit('output', { type: 'system', data: `Exécution...\n` });
      }

      // Execute the actual user code
      const child = spawn(cmd, args, { cwd: sessionDir });

      // Dynamic Execution limits logic
      let currentTimeoutId = null;
      let absoluteTimeoutId = null;

      const triggerTimeout = (reason) => {
        socket.emit('output', { type: 'system', data: `\n[Timeout] ${reason}\n` });
        if (child.pid) kill(child.pid);
      };

      const resetInactivityTimeout = () => {
        if (currentTimeoutId) clearTimeout(currentTimeoutId);
        currentTimeoutId = setTimeout(
          () => triggerTimeout(`Le programme est inactif (en attente d'input ou boucle trop longue) depuis ${SERVER_CONFIG.INACTIVITY_TIMEOUT_MS / 1000}s.`), 
          SERVER_CONFIG.INACTIVITY_TIMEOUT_MS
        );
      };

      // Initial timeouts
      absoluteTimeoutId = setTimeout(
        () => triggerTimeout(`Temps d'exécution maximum absolu atteint (${SERVER_CONFIG.ABSOLUTE_MAX_TIME_MS / 1000}s).`), 
        SERVER_CONFIG.ABSOLUTE_MAX_TIME_MS
      );
      resetInactivityTimeout();

      activeProcesses.set(socket.id, { 
        process: child, 
        dir: sessionDir,
        resetInactivityTimeout 
      });

      // Max output size limit
      let outputSize = 0;
      const MAX_OUTPUT = SERVER_CONFIG.MAX_OUTPUT_SIZE_BYTES;

      child.stdout.on('data', (data) => {
        const text = data.toString();
        outputSize += text.length;
        if (outputSize > MAX_OUTPUT) {
          if (child.pid) kill(child.pid);
          socket.emit('output', { type: 'system', data: `\n[Erreur] Limite de sortie dépassée.\n` });
          return;
        }
        socket.emit('output', { type: 'stdout', data: text });
      });

      child.stderr.on('data', (data) => {
        let text = data.toString();
        
        // Filter out Java 17 Security Manager deprecation warnings
        text = text.replace(/WARNING: A command line option has enabled the Security Manager\r?\n?/g, '');
        text = text.replace(/WARNING: The Security Manager is deprecated and will be removed in a future release\r?\n?/g, '');
        
        if (text.length > 0) {
          socket.emit('output', { type: 'stderr', data: text });
        }
      });

      child.on('close', async (code) => {
        if (currentTimeoutId) clearTimeout(currentTimeoutId);
        if (absoluteTimeoutId) clearTimeout(absoluteTimeoutId);
        socket.emit('output', { type: 'system', data: `\nProcessus terminé avec le code ${code}\n` });
        socket.emit('finished', { code });
        activeProcesses.delete(socket.id);
        
        // Cleanup temp files
        try {
          await fs.rm(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      });

    } catch (err) {
      if (err.message !== "Compilation failed") {
        socket.emit('output', { type: 'system', data: `\n[Erreur Serveur] ${err.message}\n` });
      }
      socket.emit('finished', { code: 1 });
      
      // Cleanup on error
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
      } catch (e) {}
    }
  });

  socket.on('input', (data) => {
    resetIdleTimer();
    const session = activeProcesses.get(socket.id);
    if (session && session.process) {
      session.process.stdin.write(data + '\n');
      if (session.resetInactivityTimeout) {
        session.resetInactivityTimeout();
      }
    }
  });

  socket.on('stop', () => {
    const session = activeProcesses.get(socket.id);
    if (session && session.process && session.process.pid) {
      socket.emit('output', { type: 'system', data: `\n[Arrêté] Processus tué par l'utilisateur.\n` });
      kill(session.process.pid);
    }
  });

  socket.on('disconnect', async () => {
    connectedClients.delete(socket.id);
    console.log(`Client disconnected: ${socket.id} (total: ${connectedClients.size})`);
    if (socketIdleTimers.has(socket.id)) {
      clearTimeout(socketIdleTimers.get(socket.id));
      socketIdleTimers.delete(socket.id);
    }
    const session = activeProcesses.get(socket.id);
    if (session) {
      if (session.process && session.process.pid) {
        kill(session.process.pid);
      }
      try {
        await fs.rm(session.dir, { recursive: true, force: true });
      } catch (e) {}
      activeProcesses.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
