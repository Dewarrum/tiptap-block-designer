# TipTap Block Designer

A client-side application for editing TipTap block schemas with synchronized JSON and XML views.

## Features

- **Dual-panel editor** — Edit TipTap documents in either JSON or XML format
- **Real-time synchronization** — Changes in one panel automatically sync to the other (500ms debounce)
- **Monaco Editor** — Full-featured code editing with syntax highlighting, validation, and intellisense
- **JSON Schema validation** — JSON panel validates against the TipTap block schema
- **Semantic XML mapping** — XML format uses element names as node types, attributes as `attrs`, and inline marks as wrapper elements
- **Error isolation** — Validation errors in one panel don't affect the other panel's content

## XML ↔ JSON Mapping

### Elements

JSON nodes map to XML elements where the `type` becomes the tag name:

```json
{
  "type": "paragraph",
  "content": [{ "type": "text", "text": "Hello" }]
}
```

```xml
<paragraph>Hello</paragraph>
```

### Attributes

Node `attrs` become XML attributes:

```json
{
  "type": "heading",
  "attrs": { "level": 1 },
  "content": [{ "type": "text", "text": "Title" }]
}
```

```xml
<heading level="1">Title</heading>
```

### Marks (Inline Formatting)

Text marks become wrapper elements around text content:

```json
{
  "type": "text",
  "text": "bold text",
  "marks": [{ "type": "bold" }]
}
```

```xml
<bold>bold text</bold>
```

Marks can have attributes:

```json
{
  "type": "text",
  "text": "colored",
  "marks": [{ "type": "textStyle", "attrs": { "color": "#FF0000" } }]
}
```

```xml
<textStyle color="#FF0000">colored</textStyle>
```

### Nested Structures

Deeply nested structures are fully supported:

```xml
<flashcards>
  <flashcardCards>
    <flashcardCard id="1">
      <front text="Question">What is TipTap?</front>
      <back text="Answer">A headless editor framework</back>
    </flashcardCard>
  </flashcardCards>
</flashcards>
```

### Document Wrapper

- **JSON → XML**: The top-level `doc` wrapper is omitted; only content is output
- **XML → JSON**: A `doc` wrapper is automatically added; top-level `<doc>` element is optional

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm run build
```

The production build will be in the `dist/` directory.

## Tech Stack

- **React** — UI framework
- **Vite** — Build tool and dev server
- **Monaco Editor** — Code editor (same as VS Code)
- **fast-xml-parser** — XML parsing and building
- **TypeScript** — Type safety

## Project Structure

```
src/
├── components/
│   ├── JsonEditor.tsx    # Monaco editor for JSON with schema validation
│   ├── XmlEditor.tsx     # Monaco editor for XML
│   └── StatusBar.tsx     # Error display component
├── utils/
│   ├── converters.ts     # JSON ↔ XML conversion logic
│   └── debounce.ts       # Debounce hook for sync
├── types/
│   └── tiptap.ts         # TypeScript interfaces
├── App.tsx               # Main application component
├── App.css               # Application styles
└── index.css             # Global styles
```

## License

MIT
