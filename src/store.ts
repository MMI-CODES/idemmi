import { useState, useEffect } from 'react';

export interface FileData {
  name: string;
  content: string;
  language: string;
}

export interface ArchiveGroup {
  id: string;
  name: string;
  files: FileData[];
  createdAt: number;
}

export const MAX_ACTIVE_FILES = 5;

function getLanguage(name: string): string {
  if (name.endsWith('.java')) return 'java';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.js')) return 'javascript';
  if (name.endsWith('.ts')) return 'typescript';
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.json')) return 'json';
  return 'plaintext';
}

function scaffoldContent(name: string): string {
  if (name.endsWith('.java')) {
    const className = name.replace('.java', '');
    return `public class ${className} {\n    public static void main(String[] args) {\n        \n    }\n}`;
  }
  return '';
}

export function useFileSystem() {
  const [activeFiles, setActiveFiles] = useState<FileData[]>([]);
  const [archives, setArchives] = useState<ArchiveGroup[]>([]);
  const [activeFile, setActiveFileState] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedActive = localStorage.getItem('ide_active_files');
    const savedArchives = localStorage.getItem('ide_archives');
    const savedCurrent = localStorage.getItem('ide_current_file');

    if (savedActive) {
      const parsed: FileData[] = JSON.parse(savedActive);
      setActiveFiles(parsed);
      if (savedCurrent && parsed.some(f => f.name === savedCurrent)) {
        setActiveFileState(savedCurrent);
      } else if (parsed.length > 0) {
        setActiveFileState(parsed[0].name);
      }
    } else {
      const defaults: FileData[] = [
        { name: 'Main.java', content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Bonjour le monde !");\n    }\n}', language: 'java' },
        { name: 'script.py', content: 'print("Bonjour depuis Python !")', language: 'python' }
      ];
      setActiveFiles(defaults);
      setActiveFileState('Main.java');
      localStorage.setItem('ide_active_files', JSON.stringify(defaults));
      localStorage.setItem('ide_current_file', 'Main.java');
    }

    if (savedArchives) {
      setArchives(JSON.parse(savedArchives));
    }
  }, []);

  const persistActive = (files: FileData[]) => {
    setActiveFiles(files);
    localStorage.setItem('ide_active_files', JSON.stringify(files));
  };

  const persistArchives = (groups: ArchiveGroup[]) => {
    setArchives(groups);
    localStorage.setItem('ide_archives', JSON.stringify(groups));
  };

  const setActive = (name: string | null) => {
    setActiveFileState(name);
    if (name) localStorage.setItem('ide_current_file', name);
    else localStorage.removeItem('ide_current_file');
  };

  const updateFileContent = (name: string, content: string) => {
    const updated = activeFiles.map(f => f.name === name ? { ...f, content } : f);
    persistActive(updated);
  };

  const createFile = (name: string): boolean => {
    if (activeFiles.length >= MAX_ACTIVE_FILES) return false;
    if (activeFiles.some(f => f.name === name)) return false;
    const newFile: FileData = { name, content: scaffoldContent(name), language: getLanguage(name) };
    const updated = [...activeFiles, newFile];
    persistActive(updated);
    setActive(name);
    return true;
  };

  const deleteFile = (name: string) => {
    const updated = activeFiles.filter(f => f.name !== name);
    persistActive(updated);
    if (activeFile === name) {
      setActive(updated.length > 0 ? updated[0].name : null);
    }
  };

  const renameFile = (oldName: string, newName: string) => {
    if (activeFiles.some(f => f.name === newName)) return false;
    const updated = activeFiles.map(f =>
      f.name === oldName ? { ...f, name: newName, language: getLanguage(newName) } : f
    );
    persistActive(updated);
    if (activeFile === oldName) setActive(newName);
    return true;
  };

  /**
   * Archive the current set of active files under a given name.
   * Clears the active files afterward.
   */
  const archiveActiveFiles = (groupName: string) => {
    if (activeFiles.length === 0) return;
    const group: ArchiveGroup = {
      id: Date.now().toString(),
      name: groupName,
      files: [...activeFiles],
      createdAt: Date.now(),
    };
    persistArchives([...archives, group]);
    persistActive([]);
    setActive(null);
  };

  /**
   * Restore an archive group to active files.
   * Returns 'overwrite-needed' if active files exist (so caller can prompt),
   * or forces overwrite if confirmed.
   */
  const restoreArchive = (groupId: string, force = false): 'overwrite-needed' | 'done' => {
    if (activeFiles.length > 0 && !force) return 'overwrite-needed';
    const group = archives.find(a => a.id === groupId);
    if (!group) return 'done';
    persistActive(group.files);
    persistArchives(archives.filter(a => a.id !== groupId));
    setActive(group.files.length > 0 ? group.files[0].name : null);
    return 'done';
  };

  const deleteArchive = (groupId: string) => {
    persistArchives(archives.filter(a => a.id !== groupId));
  };

  return {
    // Active workspace
    activeFiles,
    activeFile,
    updateFileContent,
    createFile,
    deleteFile,
    renameFile,
    setActive,
    // Archive system
    archives,
    archiveActiveFiles,
    restoreArchive,
    deleteArchive,
  };
}
