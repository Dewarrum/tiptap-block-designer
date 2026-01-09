import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import type { editor, MarkerSeverity } from 'monaco-editor';
import { validateXml } from '../utils/converters';

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onValidationChange?: (errors: string[]) => void;
}

interface Monaco {
  editor: typeof editor;
  MarkerSeverity: typeof MarkerSeverity;
}

export function XmlEditor({ value, onChange, onFocus, onValidationChange }: XmlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isExternalUpdateRef = useRef(false);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const validateAndReport = (content: string) => {
    if (!onValidationChange) return;
    
    const error = validateXml(content);
    if (error) {
      onValidationChange([error]);
    } else {
      onValidationChange([]);
    }

    // Update Monaco markers for visual feedback
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        if (error) {
          monacoRef.current.editor.setModelMarkers(model, 'xml-validator', [
            {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
              message: error,
              severity: monacoRef.current.MarkerSeverity.Error,
            },
          ]);
        } else {
          monacoRef.current.editor.setModelMarkers(model, 'xml-validator', []);
        }
      }
    }
  };

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco as unknown as Monaco;

    // Listen for content changes - this fires for BOTH user input and setValue()
    editorInstance.onDidChangeModelContent(() => {
      // Skip if this is an external update (from useEffect syncing props)
      if (isExternalUpdateRef.current) return;
      
      const newValue = editorInstance.getValue();
      onChangeRef.current(newValue);
      validateAndReport(newValue);
    });

    // Focus handler
    editorInstance.onDidFocusEditorText(() => {
      onFocus?.();
    });

    // Initial validation
    validateAndReport(editorInstance.getValue());
  };

  // Update editor value when prop changes (for sync from JSON)
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        isExternalUpdateRef.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(value);
        if (position) {
          editorRef.current.setPosition(position);
        }
        validateAndReport(value);
        isExternalUpdateRef.current = false;
      }
    }
  }, [value]);

  return (
    <Editor
      height="100%"
      language="xml"
      theme="vs-dark"
      value={value}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      }}
    />
  );
}
