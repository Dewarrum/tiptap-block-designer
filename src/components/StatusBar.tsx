interface StatusBarProps {
  jsonErrors: string[];
  xmlErrors: string[];
  conversionError: string | null;
}

export function StatusBar({ jsonErrors, xmlErrors, conversionError }: StatusBarProps) {
  const hasJsonErrors = jsonErrors.length > 0;
  const hasXmlErrors = xmlErrors.length > 0;
  const hasErrors = hasJsonErrors || hasXmlErrors || conversionError;

  return (
    <div className={`status-bar ${hasErrors ? 'status-bar--error' : 'status-bar--valid'}`}>
      <div className="status-bar__content">
        {conversionError ? (
          <span className="status-bar__message status-bar__message--error">
            <span className="status-bar__icon">⚠</span>
            Conversion: {conversionError}
          </span>
        ) : hasJsonErrors ? (
          <span className="status-bar__message status-bar__message--error">
            <span className="status-bar__icon">⚠</span>
            JSON: {jsonErrors[0]}
            {jsonErrors.length > 1 && ` (+${jsonErrors.length - 1} more)`}
          </span>
        ) : hasXmlErrors ? (
          <span className="status-bar__message status-bar__message--error">
            <span className="status-bar__icon">⚠</span>
            XML: {xmlErrors[0]}
          </span>
        ) : (
          <span className="status-bar__message status-bar__message--valid">
            <span className="status-bar__icon">✓</span>
            Valid — synced
          </span>
        )}
      </div>
      <div className="status-bar__indicators">
        <span className={`status-indicator ${hasJsonErrors ? 'status-indicator--error' : 'status-indicator--valid'}`}>
          JSON
        </span>
        <span className={`status-indicator ${hasXmlErrors ? 'status-indicator--error' : 'status-indicator--valid'}`}>
          XML
        </span>
      </div>
    </div>
  );
}
