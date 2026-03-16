import { AlertTriangle, FileCode2, X } from 'lucide-react';


interface JavaRenameDialogProps {
  currentFileName: string;   // e.g. Main.java
  expectedFileName: string;  // e.g. exe6.java
  onRenameFile: () => void;  // rename file to match class
  onRenameClass: () => void; // rename class to match file
  onDismiss: () => void;
}

export function JavaRenameDialog({ currentFileName, expectedFileName, onRenameFile, onRenameClass, onDismiss }: JavaRenameDialogProps) {
  const className = expectedFileName.replace('.java', '');
  const fileBaseName = currentFileName.replace('.java', '');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {/* Dialog */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#252526', border: '1px solid #454545',
            borderRadius: 6, padding: '24px 28px', maxWidth: 480, width: '90%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)', position: 'relative'
          }}
        >
          {/* Close */}
          <button
            onClick={onDismiss}
            style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <AlertTriangle size={20} color="#e2b75a" />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#e2b75a' }}>Erreur de nom de fichier Java</span>
          </div>

          {/* Explanation */}
          <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, marginBottom: 16 }}>
            En Java, le nom du fichier doit être <strong>identique</strong> au nom de la classe publique.
            <br /><br />
            Votre fichier s'appelle <code style={{ background: '#1e1e1e', padding: '1px 6px', borderRadius: 3, color: '#569cd6' }}>{currentFileName}</code> mais
            contient <code style={{ background: '#1e1e1e', padding: '1px 6px', borderRadius: 3, color: '#4ec9b0' }}>public class {className}</code>.
            <br /><br />
            <strong>Choisissez ce que vous souhaitez corriger :</strong>
          </p>

          {/* Option A: rename file */}
          <div
            style={{ background: '#1e1e1e', borderRadius: 4, padding: '10px 14px', marginBottom: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid #333' }}
            onClick={onRenameFile}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#0e639c')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
          >
            <FileCode2 size={14} color="#888" />
            <span style={{ color: '#888', minWidth: 110 }}>Renommer le fichier</span>
            <span style={{ color: '#888', textDecoration: 'line-through' }}>{currentFileName}</span>
            <span style={{ color: '#555', margin: '0 4px' }}>→</span>
            <span style={{ color: '#4ec9b0', fontWeight: 600 }}>{expectedFileName}</span>
          </div>

          {/* Option B: rename class */}
          <div
            style={{ background: '#1e1e1e', borderRadius: 4, padding: '10px 14px', marginBottom: 24, fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid #333' }}
            onClick={onRenameClass}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#0e639c')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
          >
            <FileCode2 size={14} color="#888" />
            <span style={{ color: '#888', minWidth: 110 }}>Renommer la classe</span>
            <span style={{ color: '#ce9178' }}>
              class <span style={{ textDecoration: 'line-through' }}>{className}</span>
            </span>
            <span style={{ color: '#555', margin: '0 4px' }}>→</span>
            <span style={{ color: '#4ec9b0', fontWeight: 600 }}>class {fileBaseName}</span>
          </div>

          {/* Dismiss */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onDismiss}
              style={{ padding: '6px 16px', border: '1px solid #454545', background: 'transparent', color: '#aaa', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
