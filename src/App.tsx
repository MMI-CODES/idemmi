import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFileSystem } from './store';
import { Explorer } from './components/Explorer';
import { Console, LogMessage } from './components/Console';
import { CodeEditor } from './components/CodeEditor';
import { JavaRenameDialog } from './components/JavaRenameDialog';
import { InfoDialog } from './components/InfoDialog';
import { Play, Square, Archive, Info } from 'lucide-react';
import type { FileData } from './store';

// A special sentinel prefix to identify archived file selections
const ARCHIVE_PREFIX = '__archive__';

export default function App() {
  const {
    activeFiles,
    activeFile,
    updateFileContent,
    createFile,
    deleteFile,
    renameFile,
    setActive,
    archives,
    archiveActiveFiles,
    restoreArchive,
    deleteArchive,
  } = useFileSystem();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [disconnectReason, setDisconnectReason] = useState<'full' | 'idle' | null>(null);
  const [dismissedDisconnect, setDismissedDisconnect] = useState(false);

  // Java class/file name mismatch quick-fix dialog
  const [javaRenameInfo, setJavaRenameInfo] = useState<{ current: string; expected: string } | null>(null);
  const JAVA_MISMATCH_RE = /class (\w+) is public, should be declared in a file named (\w+\.java)/;

  // Archived file preview (not part of activeFiles)
  const [archivedPreview, setArchivedPreview] = useState<{ file: FileData; groupName: string } | null>(null);

  // Resizable console
  const [consoleHeight, setConsoleHeight] = useState(200);
  const resizeRef = useRef<boolean>(false);

  // Keep a ref to activeFile so the socket listener (which runs once) always reads the latest value
  const activeFileRef = useRef<string | null>(activeFile);
  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);

  useEffect(() => {
    const backendUrl = import.meta.env.DEV ? 'http://localhost:8080' : '';
    
    // Fetch server config first
    fetch(`${backendUrl}/api/config`)
      .then(res => res.json())
      .then(cfg => setServerConfig(cfg))
      .catch(err => console.error("Failed to fetch config", err));

    const newSocket = io(backendUrl || '/');
    setSocket(newSocket);
    
    newSocket.on('server_full', () => {
      setDisconnectReason('full');
      setDismissedDisconnect(false);
      setSocket(null);
    });

    newSocket.on('idle_timeout', () => {
      setDisconnectReason('idle');
      setDismissedDisconnect(false);
      setSocket(null);
    });

    newSocket.on('output', (msg: LogMessage) => {
      setLogs(prev => [...prev, msg]);
      // Detect Java class/file mismatch error
      if (msg.type === 'stderr') {
        const match = JAVA_MISMATCH_RE.exec(msg.data);
        if (match && activeFileRef.current) {
          setJavaRenameInfo({ current: activeFileRef.current, expected: match[2] });
        }
      }
    });
    newSocket.on('finished', () => setIsRunning(false));
    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 50 && newHeight < window.innerHeight - 100) setConsoleHeight(newHeight);
    };
    const handleMouseUp = () => {
      resizeRef.current = false;
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleRun = () => {
    if (!socket || !activeFile) return;
    setLogs([]);
    setIsRunning(true);
    // Only send active (non-archived) files to the server
    socket.emit('run', { files: activeFiles, activeFile });
  };

  const handleStop = () => {
    if (!socket) return;
    socket.emit('stop');
    setIsRunning(false);
  };

  const handleConsoleInput = (input: string) => {
    if (socket && isRunning) {
      socket.emit('input', input);
      setLogs(prev => [...prev, { type: 'stdout', data: input + '\n' }]);
    }
  };

  // Handle file selection — could be active file or archived file preview
  const handleSelect = (name: string) => {
    if (name.startsWith(ARCHIVE_PREFIX)) {
      // Format: __archive__<groupId>__<fileName>
      const withoutPrefix = name.slice(ARCHIVE_PREFIX.length);
      const separatorIdx = withoutPrefix.indexOf('__');
      const groupId = withoutPrefix.slice(0, separatorIdx);
      const fileName = withoutPrefix.slice(separatorIdx + 2);
      const group = archives.find(a => a.id === groupId);
      const file = group?.files.find(f => f.name === fileName);
      if (group && file) {
        setArchivedPreview({ file, groupName: group.name });
        setActive(null); // Clear active selection
      }
    } else {
      setArchivedPreview(null); // Clear archived preview
      setActive(name);
    }
  };

  // Determine what to show in the editor
  const currentActiveFile = activeFiles.find(f => f.name === activeFile);
  const displayFile = archivedPreview?.file ?? currentActiveFile ?? null;
  const isArchived = !!archivedPreview;

  return (
    <div className="layout">
      {/* Disconnect overlay */}
      {disconnectReason && !dismissedDisconnect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#252526', border: '1px solid #454545', padding: '32px', borderRadius: 8, textAlign: 'center', maxWidth: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#e5c07b', marginBottom: 15, fontSize: 18 }}>
              {disconnectReason === 'full' ? 'Serveur surchargé' : 'Déconnexion pour inactivité'}
            </h2>
            <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6, marginBottom: 25 }}>
              {disconnectReason === 'full' 
                ? 'Le serveur a atteint sa limite simultanée d\'utilisateurs (200). Vous pouvez continuer à utiliser l\'éditeur, mais devez vous reconnecter pour exécuter le code.'
                : 'Vous avez été déconnecté car vous n\'avez pas interagi avec le serveur depuis trop longtemps. Votre code et vos fichiers sont toujours là !'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => setDismissedDisconnect(true)}
                style={{ background: 'transparent', color: '#aaa', border: '1px solid #454545', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                Continuer sans serveur
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{ background: '#0e639c', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Se reconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info dialog */}
      {showInfo && <InfoDialog onClose={() => setShowInfo(false)} />}

      {/* Java rename quick-fix dialog */}
      {javaRenameInfo && (
        <JavaRenameDialog
          currentFileName={javaRenameInfo.current}
          expectedFileName={javaRenameInfo.expected}
          onRenameFile={() => {
            renameFile(javaRenameInfo.current, javaRenameInfo.expected);
            setJavaRenameInfo(null);
          }}
          onRenameClass={() => {
            // Replace all occurrences of the wrong class name with the file's base name
            const fileBaseName = javaRenameInfo.current.replace('.java', '');
            const wrongClass = javaRenameInfo.expected.replace('.java', '');
            const file = activeFiles.find(f => f.name === javaRenameInfo.current);
            if (file) {
              // Replace `class <wrong>` and `new <wrong>(` patterns
              const updated = file.content
                .replace(new RegExp(`\\bclass\\s+${wrongClass}\\b`, 'g'), `class ${fileBaseName}`)
                .replace(new RegExp(`\\bnew\\s+${wrongClass}\\s*\\(`, 'g'), `new ${fileBaseName}(`);
              updateFileContent(javaRenameInfo.current, updated);
            }
            setJavaRenameInfo(null);
          }}
          onDismiss={() => setJavaRenameInfo(null)}
        />
      )}
      <div className="main-content">
        <div className="editor-pane">
          {/* Tab bar */}
          <div className="editor-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '15px' }}>
            <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center' }}>
              {displayFile ? (
                <div className="editor-tab">
                  {displayFile.name}
                  {isArchived && (
                    <span style={{ marginLeft: 6, fontSize: '10px', color: '#569cd6', background: '#1a2a3a', padding: '1px 6px', borderRadius: 2 }}>
                      archivé
                    </span>
                  )}
                </div>
              ) : (
                <div className="editor-tab" style={{ color: '#888', borderTopColor: 'transparent' }}>
                  {activeFiles.length === 0 ? 'Créez ou chargez un groupe' : 'Aucun fichier ouvert'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Info button */}
              <button
                onClick={() => setShowInfo(true)}
                title="À propos & librairies"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #3c3c3c', background: '#1e1e1e', color: '#ccc', cursor: 'pointer', padding: '4px 10px', borderRadius: 4, fontSize: '12px' }}
              >
                <Info size={14} /> Librairies
              </button>
              {isArchived ? (
                // Show "archived" badge instead of run button
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#569cd6', padding: '4px 12px', border: '1px solid #2a3a4a', background: '#1a2a3a' }}>
                  <Archive size={13} /> Élément archivé
                </span>
              ) : disconnectReason ? (
                <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px', backgroundColor: '#c24038', color: 'white', borderColor: '#c24038' }}>
                  <Square size={14} fill="currentColor" /> Se reconnecter
                </button>
              ) : !isRunning ? (
                <button className="primary" onClick={handleRun} disabled={!currentActiveFile} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px' }}>
                  <Play size={14} /> Lancer
                </button>
              ) : (
                <button onClick={handleStop} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px', backgroundColor: '#ff5555', color: 'white', borderColor: '#ff5555' }}>
                  <Square size={14} /> Stop
                </button>
              )}
            </div>
          </div>

          {/* Editor body */}
          {displayFile ? (
            <CodeEditor
              language={displayFile.language}
              value={displayFile.content}
              onChange={(val) => {
                if (!isArchived) updateFileContent(activeFile!, val || '');
              }}
              onRun={isArchived ? undefined : handleRun}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13 }}>Créez un nouveau fichier ou chargez un groupe archivé</span>
            </div>
          )}
        </div>

        <Explorer
          serverConfig={serverConfig}
          activeFiles={activeFiles}
          archives={archives}
          activeFile={activeFile}
          onSelect={handleSelect}
          onCreate={createFile}
          onDelete={deleteFile}
          onRename={renameFile}
          onArchive={archiveActiveFiles}
          onRestoreArchive={restoreArchive}
          onDeleteArchive={deleteArchive}
        />
      </div>

      <div className="console-container" style={{ height: `${consoleHeight}px` }}>
        <div
          className="resize-handle-y"
          onMouseDown={() => {
            resizeRef.current = true;
            document.body.style.cursor = 'row-resize';
          }}
        />
        <Console logs={logs} onInput={handleConsoleInput} isRunning={isRunning} />
      </div>
    </div>
  );
}
