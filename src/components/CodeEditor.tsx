import { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
  onRun?: () => void;
}

export function CodeEditor({ language, value, onChange, onRun }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  // Store onRun in a window-level variable so the global Monaco command always gets the fresh version
  useEffect(() => {
    (window as any).__ideRunCallback = onRun;
  }, [onRun]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Custom theme matching the requested colors
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      }
    });
    monaco.editor.setTheme('custom-dark');

    // Register Python snippets
    if (!(window as any).__idePythonSnippetsRegistered) {
      (window as any).__idePythonSnippetsRegistered = true;
      monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const snippets = [
          { label: 'def', insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', detail: 'Fonction' },
          { label: 'class', insertText: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${2:pass}', detail: 'Classe' },
          { label: 'if', insertText: 'if ${1:condition}:\n\t${2:pass}', detail: 'Condition' },
          { label: 'elif', insertText: 'elif ${1:condition}:\n\t${2:pass}', detail: 'Sinon si' },
          { label: 'else', insertText: 'else:\n\t${1:pass}', detail: 'Sinon' },
          { label: 'for', insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', detail: 'Boucle for' },
          { label: 'while', insertText: 'while ${1:condition}:\n\t${2:pass}', detail: 'Boucle while' },
          { label: 'try', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}', detail: 'Try/Except' },
          { label: 'with', insertText: 'with ${1:expression} as ${2:var}:\n\t${3:pass}', detail: 'Context manager' },
          { label: 'import', insertText: 'import ${1:module}', detail: 'Import' },
          { label: 'from', insertText: 'from ${1:module} import ${2:name}', detail: 'Import from' },
          { label: 'print', insertText: 'print(${1:value})', detail: 'Afficher' },
          { label: 'len', insertText: 'len(${1:obj})', detail: 'Longueur' },
          { label: 'range', insertText: 'range(${1:stop})', detail: 'Plage de nombres' },
          { label: 'list', insertText: 'list(${1:iterable})', detail: 'Convertir en liste' },
          { label: 'dict', insertText: 'dict(${1:})', detail: 'Dictionnaire' },
          { label: 'input', insertText: 'input(${1:"Saisie: "})', detail: 'Entrée utilisateur' },
          { label: 'int', insertText: 'int(${1:value})', detail: 'Convertir en entier' },
          { label: 'str', insertText: 'str(${1:value})', detail: 'Convertir en chaîne' },
          { label: 'float', insertText: 'float(${1:value})', detail: 'Convertir en flottant' },
          { label: 'main', insertText: 'def main():\n\t${1:pass}\n\nif __name__ == "__main__":\n\tmain()', detail: 'Bloc main' },
          { label: 'yield', insertText: 'yield ${1:value}', detail: 'Générateur' },
          { label: 'lambda', insertText: 'lambda ${1:args}: ${2:expression}', detail: 'Fonction anonyme' },
          { label: 'comp', insertText: '[${1:expr} for ${2:item} in ${3:iterable}]', detail: 'Compréhension de liste' },
          { label: 'doc', insertText: '"""\n${1:Description}\n"""', detail: 'Docstring' },
          { label: 'return', insertText: 'return ${1:value}', detail: 'Retourner' },
        ];
        // Use Monaco's native search to find all words in the document
        // This is more robust than a simple JS regex as it respects Monaco's internal word definition for Python
        const matches = model.findMatches('\\b\\w+\\b', false, true, false, null, true);
        const uniqueWords = Array.from(new Set(matches.map((m: any) => m.matches[0])));
        
        const wordSuggestions = (uniqueWords as string[])
          .filter((w) => w !== word.word && w.length > 1 && !snippets.some(s => s.label === w))
          .map((w) => ({
            label: w,
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: w,
            range
          }));

        return {
          suggestions: [
            ...snippets.map(s => ({
              ...s,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            })),
            ...wordSuggestions
          ]
        };
      }
      });
    }

    // Register Java snippets
    if (!(window as any).__ideJavaSnippetsRegistered) {
      (window as any).__ideJavaSnippetsRegistered = true;
      monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const snippets = [
          { label: 'sout', insertText: 'System.out.println(${1:value});', detail: 'Afficher' },
          { label: 'main', insertText: 'public static void main(String[] args) {\n\t${1}\n}', detail: 'Méthode main' },
          { label: 'for', insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'Boucle for' },
          { label: 'foreach', insertText: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}', detail: 'Boucle for-each' },
          { label: 'while', insertText: 'while (${1:condition}) {\n\t${2}\n}', detail: 'Boucle while' },
          { label: 'if', insertText: 'if (${1:condition}) {\n\t${2}\n}', detail: 'Condition' },
          { label: 'ifelse', insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', detail: 'If/Else' },
          { label: 'try', insertText: 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${4:e.printStackTrace();}\n}', detail: 'Try/Catch' },
          { label: 'class', insertText: 'public class ${1:Name} {\n\t${2}\n}', detail: 'Classe' },
          { label: 'method', insertText: 'public ${1:void} ${2:name}(${3:}) {\n\t${4}\n}', detail: 'Méthode' },
          { label: 'var', insertText: 'var ${1:name} = ${2:value};', detail: 'Variable locale' },
          { label: 'switch', insertText: 'switch (${1:key}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n\t\tbreak;\n}', detail: 'Switch/Case' },
          { label: 'interface', insertText: 'public interface ${1:Name} {\n\t${2}\n}', detail: 'Interface' },
          { label: 'impl', insertText: 'implements ${1:Interface}', detail: 'Implémentation' },
          { label: 'ext', insertText: 'extends ${1:Class}', detail: 'Héritage' },
          { label: 'return', insertText: 'return ${1:value};', detail: 'Retourner' },
          { label: 'scan', insertText: 'Scanner scanner = new Scanner(System.in);\n${1:Type} ${2:var} = scanner.next${3:Int}();', detail: 'Lire entrée' },
          { label: 'list', insertText: 'List<${1:Type}> ${2:list} = new ArrayList<>();', detail: 'Créer ArrayList' },
        ];
        // Use Monaco's native search to find all words in the document
        // This is more robust than a simple JS regex as it respects Monaco's internal word definition for Java
        const matches = model.findMatches('\\b\\w+\\b', false, true, false, null, true);
        const uniqueWords = Array.from(new Set(matches.map((m: any) => m.matches[0])));
        
        const wordSuggestions = (uniqueWords as string[])
          .filter((w) => w !== word.word && w.length > 1 && !snippets.some(s => s.label === w))
          .map((w) => ({
            label: w,
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: w,
            range
          }));

        return {
          suggestions: [
            ...snippets.map(s => ({
              ...s,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            })),
            ...wordSuggestions
          ]
        };
      }
      });
    }


    const codeLensProvider = monaco.languages.registerCodeLensProvider(['java', 'python'], {
      provideCodeLenses: function (model: any) {
        const lenses: any[] = [];
        const lang = model.getLanguageId();
        const text = model.getValue();
        const lines = text.split('\n');

        let regex: RegExp;
        if (lang === 'java') {
          regex = /public\s+static\s+void\s+main\s*\(/;
        } else {
          regex = /^def\s+main\s*\(/;
        }

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            lenses.push({
              range: {
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 2,
                endColumn: 1
              },
              id: "run-main",
              command: {
                id: "run.main.action",
                title: "▶ Lancer"
              }
            });
            break; // Only one main usually
          }
        }
        return {
          lenses,
          dispose: () => {}
        };
      },
      resolveCodeLens: function (_model: any, codeLens: any) {
        return codeLens;
      }
    });

    // Register command for CodeLens click globally (CodeLens uses the command registry, not actions)
    // Avoid double-registration across hot reloads by checking first
    if (!(window as any).__ideRunCommandRegistered) {
      (window as any).__ideRunCommandRegistered = true;
      monaco.editor.addCommand({
        id: 'run.main.action',
        run: () => {
          // Always read from window to get the latest onRun (avoids stale closure)
          const cb = (window as any).__ideRunCallback;
          if (cb) cb();
        }
      });
    }

    // We must dispose the lens provider if the component unmounts
    return () => {
      codeLensProvider.dispose();
    };
  };

  return (
    <div className="editor-container">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 10 },
          scrollBeyondLastLine: false,
          roundedSelection: false,
          // Autocompletion options
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          wordBasedSuggestions: "currentDocument" as any,
          suggest: {
            showWords: true,
            showSnippets: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showKeywords: true,
          },
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          parameterHints: { enabled: true },
          snippetSuggestions: 'top',
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
