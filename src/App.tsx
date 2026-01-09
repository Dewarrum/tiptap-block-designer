import { useState, useCallback, useRef } from 'react';
import { JsonEditor } from './components/JsonEditor';
import { XmlEditor } from './components/XmlEditor';
import { StatusBar } from './components/StatusBar';
import { jsonToXml, xmlToJson, validateJson, validateXml } from './utils/converters';
import { useDebounce } from './utils/debounce';
import './App.css';

// Initial empty document
const INITIAL_DOC = {
  type: 'doc',
  content: []
};

const INITIAL_JSON = JSON.stringify(INITIAL_DOC, null, 2);
const INITIAL_XML = '';

type ActiveEditor = 'json' | 'xml' | null;

function App() {
  const [jsonValue, setJsonValue] = useState(INITIAL_JSON);
  const [xmlValue, setXmlValue] = useState(INITIAL_XML);
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [xmlErrors, setXmlErrors] = useState<string[]>([]);
  const [conversionError, setConversionError] = useState<string | null>(null);
  
  // Track which editor was last active to determine sync direction
  const activeEditorRef = useRef<ActiveEditor>(null);
  
  // Flag to prevent recursive syncs
  const isSyncingRef = useRef(false);

  // Sync JSON -> XML (debounced)
  const syncJsonToXml = useCallback((json: string) => {
    // Only sync if JSON editor is active and we're not already syncing
    if (activeEditorRef.current !== 'json' || isSyncingRef.current) return;
    
    // Validate JSON syntax first
    const jsonError = validateJson(json);
    if (jsonError) {
      // Don't sync if JSON is invalid - preserve XML content
      return;
    }

    try {
      isSyncingRef.current = true;
      const doc = JSON.parse(json);
      const xml = jsonToXml(doc);
      setXmlValue(xml);
      setConversionError(null);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      // Use setTimeout to ensure the sync flag is cleared after React processes the state update
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, []);

  // Sync XML -> JSON (debounced)
  const syncXmlToJson = useCallback((xml: string) => {
    // Only sync if XML editor is active and we're not already syncing
    if (activeEditorRef.current !== 'xml' || isSyncingRef.current) return;
    
    // Validate XML syntax first
    const xmlError = validateXml(xml);
    if (xmlError) {
      // Don't sync if XML is invalid - preserve JSON content
      return;
    }

    try {
      isSyncingRef.current = true;
      const doc = xmlToJson(xml);
      const json = JSON.stringify(doc, null, 2);
      setJsonValue(json);
      setConversionError(null);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      // Use setTimeout to ensure the sync flag is cleared after React processes the state update
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, []);

  // Debounced sync functions (500ms delay)
  const debouncedSyncJsonToXml = useDebounce(syncJsonToXml, 500);
  const debouncedSyncXmlToJson = useDebounce(syncXmlToJson, 500);

  // Handle JSON editor changes
  const handleJsonChange = useCallback((value: string) => {
    setJsonValue(value);
    // Only trigger sync if not currently syncing from the other direction
    if (!isSyncingRef.current) {
      debouncedSyncJsonToXml(value);
    }
  }, [debouncedSyncJsonToXml]);

  // Handle XML editor changes
  const handleXmlChange = useCallback((value: string) => {
    setXmlValue(value);
    // Only trigger sync if not currently syncing from the other direction
    if (!isSyncingRef.current) {
      debouncedSyncXmlToJson(value);
    }
  }, [debouncedSyncXmlToJson]);

  // Track which editor is active
  const handleJsonFocus = useCallback(() => {
    activeEditorRef.current = 'json';
  }, []);

  const handleXmlFocus = useCallback(() => {
    activeEditorRef.current = 'xml';
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">TipTap Block Designer</h1>
        <p className="app__subtitle">JSON ↔ XML synchronized editor</p>
      </header>
      
      <main className="app__main">
        <div className="editor-panel">
          <div className="editor-panel__header">
            <span className="editor-panel__label">JSON</span>
            <span className={`editor-panel__status ${jsonErrors.length > 0 ? 'editor-panel__status--error' : ''}`}>
              {jsonErrors.length > 0 ? `${jsonErrors.length} error${jsonErrors.length > 1 ? 's' : ''}` : 'Valid'}
            </span>
          </div>
          <div className="editor-panel__content">
            <JsonEditor
              value={jsonValue}
              onChange={handleJsonChange}
              onFocus={handleJsonFocus}
              onValidationChange={setJsonErrors}
            />
          </div>
        </div>
        
        <div className="editor-divider" />
        
        <div className="editor-panel">
          <div className="editor-panel__header">
            <span className="editor-panel__label">XML</span>
            <span className={`editor-panel__status ${xmlErrors.length > 0 ? 'editor-panel__status--error' : ''}`}>
              {xmlErrors.length > 0 ? `${xmlErrors.length} error${xmlErrors.length > 1 ? 's' : ''}` : 'Valid'}
            </span>
          </div>
          <div className="editor-panel__content">
            <XmlEditor
              value={xmlValue}
              onChange={handleXmlChange}
              onFocus={handleXmlFocus}
              onValidationChange={setXmlErrors}
            />
          </div>
        </div>
      </main>
      
      <StatusBar
        jsonErrors={jsonErrors}
        xmlErrors={xmlErrors}
        conversionError={conversionError}
      />
    </div>
  );
}

export default App;
