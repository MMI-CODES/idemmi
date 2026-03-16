import { useState } from 'react';
import { X, Search } from 'lucide-react';

const JAVA_LIBS = [
  { name: 'JUnit 5', desc: 'Framework de tests unitaires', pkg: 'org.junit.jupiter', version: '1.10.2' },
  { name: 'Apache Commons Lang', desc: 'Utilitaires pour les types Java (String, Number...)', pkg: 'org.apache.commons:commons-lang3', version: '3.14.0' },
  { name: 'Apache Commons IO', desc: 'Utilitaires pour les fichiers et flux I/O', pkg: 'commons-io:commons-io', version: '2.15.1' },
  { name: 'Gson', desc: 'Sérialisation / désérialisation JSON (Google)', pkg: 'com.google.code.gson:gson', version: '2.10.1' },
  { name: 'Commons CSV', desc: 'Lecture et écriture de fichiers CSV', pkg: 'org.apache.commons:commons-csv', version: '1.10.0' },
  { name: 'jsoup', desc: 'Parsing et scraping HTML', pkg: 'org.jsoup:jsoup', version: '1.17.2' },
  { name: 'SLF4J', desc: 'API de logging standard Java', pkg: 'org.slf4j:slf4j-api', version: '2.0.12' },
  { name: 'Logback', desc: 'Implémentation SLF4J performante', pkg: 'ch.qos.logback:logback-classic', version: '1.5.3' },
  { name: 'H2 Database', desc: 'Base de données SQL embarquée en mémoire', pkg: 'com.h2database:h2', version: '2.2.224' },
  { name: 'SQLite JDBC', desc: 'Connecteur JDBC pour SQLite', pkg: 'org.xerial:sqlite-jdbc', version: '3.45.1.0' },
  { name: 'HSQLDB', desc: 'Base de données SQL embarquée légère', pkg: 'org.hsqldb:hsqldb', version: '2.7.2' },
  { name: 'Mockito', desc: 'Mocking d\'objets pour les tests unitaires', pkg: 'org.mockito:mockito-core', version: '5.10.0' },
  { name: 'AssertJ', desc: 'Assertions fluides pour les tests', pkg: 'org.assertj:assertj-core', version: '3.25.3' },
];

const PYTHON_LIBS = [
  { name: 'psutil', desc: 'Informations système et processus', pkg: 'psutil', version: 'latest' },
  { name: 'pytest', desc: 'Framework de tests unitaires Python', pkg: 'pytest', version: 'latest' },
  { name: 'rich', desc: 'Affichage console riche (tables, couleurs, progress bars...)', pkg: 'rich', version: 'latest' },
  { name: 'pydantic', desc: 'Validation de données et sérialisation avec typage', pkg: 'pydantic', version: 'latest' },
  { name: 'numpy', desc: 'Calcul numérique et tableaux multidimensionnels', pkg: 'numpy', version: 'latest' },
  { name: 'pandas', desc: 'Analyse et manipulation de données (DataFrames)', pkg: 'pandas', version: 'latest' },
  { name: 'PyYAML', desc: 'Lecture et écriture de fichiers YAML', pkg: 'PyYAML', version: 'latest' },
];

interface InfoDialogProps {
  onClose: () => void;
}

export function InfoDialog({ onClose }: InfoDialogProps) {
  const [lang, setLang] = useState<'java' | 'python'>('java');
  const [search, setSearch] = useState('');

  const libs = lang === 'java' ? JAVA_LIBS : PYTHON_LIBS;
  const filtered = libs.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.desc.toLowerCase().includes(search.toLowerCase()) ||
    l.pkg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#252526', border: '1px solid #3c3c3c', borderRadius: 8, width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 50px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #3c3c3c', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2b75a', marginBottom: 4 }}>IDE MMI</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                Créé par <strong style={{ color: '#ccc' }}>Bastian NOEL</strong> · Proposé gratuitement<br />
                Environnement de développement en ligne — Java &amp; Python<br />
                <span style={{ color: '#555' }}>Les librairies ci-dessous sont pré-installées et disponibles directement dans l'éditeur.</span>
              </div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer', padding: 4, marginLeft: 12, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Language Toggle */}
        <div style={{ padding: '12px 24px 8px', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { setLang('java'); setSearch(''); }}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: lang === 'java' ? 700 : 400, background: lang === 'java' ? '#0e639c' : 'transparent', color: lang === 'java' ? 'white' : '#888', borderColor: lang === 'java' ? '#0e639c' : '#3c3c3c' }}
          >
            ☕ Java
          </button>
          <button
            onClick={() => { setLang('python'); setSearch(''); }}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: lang === 'python' ? 700 : 400, background: lang === 'python' ? '#3572A5' : 'transparent', color: lang === 'python' ? 'white' : '#888', borderColor: lang === 'python' ? '#3572A5' : '#3c3c3c' }}
          >
            🐍 Python
          </button>
          {/* Search */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: 4, padding: '3px 8px', marginLeft: 4 }}>
            <Search size={12} color="#555" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une librairie..."
              style={{ border: 'none', outline: 'none', background: 'transparent', color: '#ccc', fontSize: 12, flex: 1, minWidth: 0 }}
            />
          </div>
        </div>

        {/* Library list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 24px 20px' }}>
          {filtered.length === 0 && (
            <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: 24 }}>Aucun résultat</div>
          )}
          {filtered.map(lib => (
            <div key={lib.name} style={{ padding: '8px 0', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#d4d4d4', marginBottom: 2 }}>{lib.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{lib.desc}</div>
                <code style={{ fontSize: 10, color: '#4ec9b0', background: '#1e1e1e', padding: '1px 5px', borderRadius: 2, marginTop: 3, display: 'inline-block' }}>{lib.pkg}</code>
              </div>
              <span style={{ fontSize: 10, color: '#555', background: '#1e1e1e', padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginTop: 2 }}>v{lib.version}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
