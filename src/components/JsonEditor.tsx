import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import type { editor, MarkerSeverity } from 'monaco-editor';

// Import the schema for JSON validation
import blockSchema from '../../block.schema.json';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onValidationChange?: (errors: string[]) => void;
}

interface Monaco {
  editor: typeof editor;
  MarkerSeverity: typeof MarkerSeverity;
  languages: {
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: (options: {
          validate: boolean;
          schemas: Array<{
            uri: string;
            fileMatch: string[];
            schema: unknown;
          }>;
          enableSchemaRequest: boolean;
        }) => void;
      };
    };
  };
}

export function JsonEditor({ value, onChange, onFocus, onValidationChange }: JsonEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isExternalUpdateRef = useRef(false);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco as unknown as Monaco;

    // Configure JSON schema validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'https://example.com/schemas/tiptap-doc.schema.json',
          fileMatch: ['*'],
          schema: blockSchema,
        },
      ],
      enableSchemaRequest: false,
    });

    // Listen for content changes - this fires for BOTH user input and setValue()
    editorInstance.onDidChangeModelContent(() => {
      // Skip if this is an external update (from useEffect syncing props)
      if (isExternalUpdateRef.current) return;
      
      const newValue = editorInstance.getValue();
      onChangeRef.current(newValue);
    });

    // Listen for validation changes
    editorInstance.onDidChangeModelDecorations(() => {
      const model = editorInstance.getModel();
      if (model && onValidationChange) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const errors = markers
          .filter((m: { severity: number }) => m.severity === monaco.MarkerSeverity.Error)
          .map((m: { startLineNumber: number; message: string }) => `Line ${m.startLineNumber}: ${m.message}`);
        onValidationChange(errors);
      }
    });

    // Focus handler
    editorInstance.onDidFocusEditorText(() => {
      onFocus?.();
    });
  };

  // Update editor value when prop changes (for sync from XML)
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
        isExternalUpdateRef.current = false;
      }
    }
  }, [value]);

  return (
    <Editor
      height="100%"
      language="json"
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
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}
