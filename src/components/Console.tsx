import React, { useState, useRef, useEffect } from 'react';

export interface LogMessage {
  type: 'stdout' | 'stderr' | 'system';
  data: string;
}

interface ConsoleProps {
  logs: LogMessage[];
  onInput: (input: string) => void;
  isRunning: boolean;
}

export function Console({ logs, onInput, isRunning }: ConsoleProps) {
  const [inputValue, setInputValue] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      onInput(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="console-pane" style={{ height: '100%' }}>
      <div className="console-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Terminal {isRunning && <span style={{ color: '#00af00', marginLeft: '10px' }}>[En exécution...]</span>}</span>
      </div>
      <div className="console-output" ref={outputRef}>
        {logs.length === 0 && (
          <div style={{ color: '#666' }}>Prêt à compiler et exécuter. Cliquez sur "Lancer".</div>
        )}
        {logs.map((log, i) => (
          <span 
            key={i} 
            style={{ 
              color: log.type === 'stderr' ? '#ff5555' : log.type === 'system' ? '#569cd6' : '#cccccc'
            }}
          >
            {log.data}
          </span>
        ))}
      </div>
      
      {/* Improvise an input bar for stdin */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '5px' }}>
        <span style={{ color: '#007acc', marginRight: '8px', display: 'flex', alignItems: 'center' }}>&gt;</span>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isRunning}
          placeholder={isRunning ? "Entrez du texte (stdin)..." : "Le processus n'est pas en cours d'exécution."}
          style={{ flex: 1, border: 'none', backgroundColor: 'transparent', color: '#ccc', outline: 'none', fontFamily: 'var(--font-mono)' }}
        />
      </div>
    </div>
  );
}
