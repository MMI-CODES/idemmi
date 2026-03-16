import React, { useState } from 'react';
import { File, FilePlus, Trash2, Archive, ChevronDown, ChevronRight, FolderOpen, Upload, Pencil } from 'lucide-react';
import { FileData, ArchiveGroup, MAX_ACTIVE_FILES as STORE_MAX_ACTIVE_FILES } from '../store';

interface ExplorerProps {
  serverConfig?: any;
  activeFiles: FileData[];
  archives: ArchiveGroup[];
  activeFile: string | null;
  onSelect: (name: string) => void;
  onCreate: (name: string) => boolean;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => boolean;
  onArchive: (groupName: string) => void;
  onRestoreArchive: (groupId: string, force?: boolean) => 'overwrite-needed' | 'done';
  onDeleteArchive: (groupId: string) => void;
}

export function Explorer({
  serverConfig,
  activeFiles,
  archives,
  activeFile,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onArchive,
  onRestoreArchive,
  onDeleteArchive,
}: ExplorerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Inline rename state
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const MAX_FILES = serverConfig ? serverConfig.MAX_FILES_PER_SESSION : STORE_MAX_ACTIVE_FILES;

  const handleCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (newFileName.trim()) {
        const ok = onCreate(newFileName.trim());
        if (!ok && activeFiles.length >= MAX_FILES) {
          alert(`Limite de ${MAX_FILES} fichiers actifs atteinte. Archivez le groupe actuel pour en créer de nouveaux.`);
        }
      }
      setIsCreating(false);
      setNewFileName('');
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
    }
  };

  const handleArchive = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (archiveName.trim()) {
        onArchive(archiveName.trim());
      }
      setIsArchiving(false);
      setArchiveName('');
    } else if (e.key === 'Escape') {
      setIsArchiving(false);
      setArchiveName('');
    }
  };

  const handleRestore = (groupId: string) => {
    const result = onRestoreArchive(groupId);
    if (result === 'overwrite-needed') {
      const confirmed = confirm('⚠️ Des fichiers actifs non archivés seront écrasés. Voulez-vous continuer ?');
      if (confirmed) onRestoreArchive(groupId, true);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCreate = activeFiles.length < MAX_FILES;

  return (
    <div className="explorer-pane">
      {/* ─── Header ─── */}
      <div className="explorer-header">
        <span>Explorateur</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => canCreate ? setIsCreating(true) : alert(`Limite de ${MAX_FILES} fichiers actifs atteinte.`)}
            title="Nouveau Fichier"
            style={{ border: 'none', padding: '2px', opacity: canCreate ? 1 : 0.4, cursor: canCreate ? 'pointer' : 'not-allowed' }}
          >
            <FilePlus size={14} />
          </button>
          {activeFiles.length > 0 && (
            <button
              onClick={() => setIsArchiving(true)}
              title="Archiver le groupe actuel"
              style={{ border: 'none', padding: '2px' }}
            >
              <Archive size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="file-list" style={{ overflowY: 'auto', flex: 1 }}>

        {/* ─── Active files section ─── */}
        <div style={{ padding: '4px 10px 2px', fontSize: '10px', textTransform: 'uppercase', color: '#666', letterSpacing: '0.08em' }}>
          En utilisation ({activeFiles.length}/{MAX_FILES})
        </div>

        {/* New file input */}
        {isCreating && (
          <div style={{ padding: '4px 10px' }}>
            <input
              autoFocus
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={handleCreate}
              onBlur={() => setIsCreating(false)}
              placeholder="Nom du fichier..."
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>
        )}

        {/* Archive name input */}
        {isArchiving && (
          <div style={{ padding: '4px 10px' }}>
            <input
              autoFocus
              value={archiveName}
              onChange={e => setArchiveName(e.target.value)}
              onKeyDown={handleArchive}
              onBlur={() => setIsArchiving(false)}
              placeholder="Nom de l'archive..."
              style={{ width: '100%', fontSize: '12px', borderColor: '#569cd6' }}
            />
          </div>
        )}

        {/* Empty state */}
        {activeFiles.length === 0 && !isCreating && (
          <div style={{ padding: '14px 12px', color: '#555', fontSize: '12px', textAlign: 'center', lineHeight: 1.5 }}>
            Créez un fichier<br />ou chargez un groupe archivé
          </div>
        )}

        {/* Active file items */}
        {activeFiles.map(f => (
          <div
            key={f.name}
            className={`file-item ${activeFile === f.name ? 'active' : ''}`}
            onClick={() => { if (renamingFile !== f.name) onSelect(f.name); }}
          >
            {renamingFile === f.name ? (
              // Inline rename input
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const trimmed = renameValue.trim();
                    if (trimmed && trimmed !== f.name) onRename(f.name, trimmed);
                    setRenamingFile(null);
                  } else if (e.key === 'Escape') {
                    setRenamingFile(null);
                  }
                }}
                onBlur={() => setRenamingFile(null)}
                style={{ flex: 1, fontSize: '12px', minWidth: 0, background: '#3c3c3c', border: '1px solid #569cd6', color: '#d4d4d4', padding: '1px 4px', borderRadius: 3 }}
              />
            ) : (
              <div className="file-name">
                <File size={14} />
                {f.name}
              </div>
            )}
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
              <button
                className="delete-btn"
                title="Renommer"
                onClick={e => {
                  e.stopPropagation();
                  setRenamingFile(f.name);
                  setRenameValue(f.name);
                }}
              >
                <Pencil size={12} />
              </button>
              <button
                className="delete-btn"
                onClick={e => {
                  e.stopPropagation();
                  if (confirm(`Supprimer ${f.name} ?`)) onDelete(f.name);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* ─── Separator ─── */}
        <div style={{ borderTop: '1px solid #333', margin: '6px 0' }} />

        {/* ─── Archives section ─── */}
        <div style={{ padding: '4px 10px 2px', fontSize: '10px', textTransform: 'uppercase', color: '#666', letterSpacing: '0.08em' }}>
          Archives ({archives.length})
        </div>

        {archives.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#444', fontSize: '11px' }}>
            Aucune archive
          </div>
        )}

        {archives.map(group => {
          const expanded = expandedGroups.has(group.id);
          return (
            <div key={group.id}>
              {/* Group header */}
              <div
                className="file-item"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="file-name" style={{ flex: 1, overflow: 'hidden' }}>
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <FolderOpen size={14} style={{ marginLeft: 2 }} />
                  <span style={{ marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </span>
                  <span style={{ marginLeft: 4, color: '#555', fontSize: '10px', flexShrink: 0 }}>
                    ({group.files.length})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    className="delete-btn"
                    title="Charger ce groupe"
                    onClick={e => { e.stopPropagation(); handleRestore(group.id); }}
                    style={{ color: '#569cd6' }}
                  >
                    <Upload size={12} />
                  </button>
                  <button
                    className="delete-btn"
                    title="Supprimer cette archive"
                    onClick={e => { e.stopPropagation(); if (confirm(`Supprimer l'archive "${group.name}" ?`)) onDeleteArchive(group.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded file list */}
              {expanded && group.files.map(f => (
                <div
                  key={f.name}
                  className={`file-item ${activeFile === f.name ? 'active' : ''}`}
                  style={{ paddingLeft: '28px', opacity: 0.7 }}
                  onClick={() => onSelect(`__archive__${group.id}__${f.name}`)}
                >
                  <div className="file-name">
                    <File size={12} />
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
