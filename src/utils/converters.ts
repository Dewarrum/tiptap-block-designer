import { XMLParser } from 'fast-xml-parser';
import type { TipTapDoc, TipTapNode, TipTapMark } from '../types/tiptap';

/**
 * Checks if a string is whitespace-only (used to filter insignificant whitespace in XML)
 */
function isWhitespaceOnly(text: string): boolean {
  return /^\s*$/.test(text);
}

/**
 * Escapes special XML characters in text content
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts attributes object to XML attribute string
 */
function attrsToXmlString(attrs: Record<string, unknown> | undefined): string {
  if (!attrs || Object.keys(attrs).length === 0) return '';
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join('');
}

/**
 * Wraps text content with mark elements (innermost mark first)
 * e.g., marks=[bold, italic] => <bold><italic>text</italic></bold>
 */
function wrapTextWithMarks(text: string, marks: TipTapMark[]): string {
  if (!marks || marks.length === 0) return escapeXml(text);
  
  // Build from innermost to outermost
  let result = escapeXml(text);
  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];
    const attrs = attrsToXmlString(mark.attrs);
    result = `<${mark.type}${attrs}>${result}</${mark.type}>`;
  }
  return result;
}

/**
 * Converts a TipTap node to XML string
 */
function nodeToXml(node: TipTapNode, indent: string = ''): string {
  // Text nodes become raw XML text (possibly wrapped in marks)
  if (node.type === 'text' && node.text !== undefined) {
    return wrapTextWithMarks(node.text, node.marks || []);
  }
  
  const attrs = attrsToXmlString(node.attrs);
  
  // Check if node has content
  if (!node.content || node.content.length === 0) {
    // Self-closing tag for void elements
    return `${indent}<${node.type}${attrs} />`;
  }
  
  // Check if content contains only text nodes (inline content)
  const hasOnlyTextContent = node.content.every(child => child.type === 'text');
  
  if (hasOnlyTextContent) {
    // Inline content - no extra whitespace
    const innerContent = node.content.map(child => nodeToXml(child, '')).join('');
    return `${indent}<${node.type}${attrs}>${innerContent}</${node.type}>`;
  }
  
  // Block content - add newlines and indentation
  const childIndent = indent + '  ';
  const innerContent = node.content
    .map(child => nodeToXml(child, childIndent))
    .join('\n');
  return `${indent}<${node.type}${attrs}>\n${innerContent}\n${indent}</${node.type}>`;
}

/**
 * Converts a TipTap JSON document to semantic XML
 * Note: The top-level "doc" wrapper is omitted - only content is output
 */
export function jsonToXml(doc: TipTapDoc): string {
  if (!doc.content || doc.content.length === 0) {
    return '';
  }
  
  // Output content directly without <doc> wrapper
  return doc.content
    .map(node => nodeToXml(node, ''))
    .join('\n');
}

// ============================================================================
// XML to JSON conversion
// ============================================================================

const MARK_TYPES = new Set([
  'bold', 'italic', 'strike', 'underline', 'code',
  'link', 'textStyle', 'highlight', 'subscript', 'superscript'
]);

/**
 * Checks if an element name is a known mark type
 */
function isMarkType(tagName: string): boolean {
  return MARK_TYPES.has(tagName);
}

// Type for parsed XML with preserveOrder
// Using a more permissive type since fast-xml-parser's output is complex
type ParsedElement = {
  [key: string]: ParsedElement[] | string | Record<string, unknown> | undefined;
};

/**
 * Gets the tag name from a parsed element (the key that's not :@ or #text)
 */
function getTagName(element: ParsedElement): string | null {
  for (const key of Object.keys(element)) {
    if (key !== ':@' && key !== '#text') {
      return key;
    }
  }
  return null;
}

/**
 * Extracts text and marks from nested mark elements
 */
function extractTextWithMarks(
  elements: ParsedElement[],
  parentMarks: TipTapMark[] = []
): TipTapNode[] {
  const results: TipTapNode[] = [];
  
  for (const element of elements) {
    const tagName = getTagName(element);
    const attrs = element[':@'] as Record<string, unknown> | undefined;
    
    // Handle text content (skip whitespace-only text nodes)
    if ('#text' in element) {
      const text = element['#text'] as string;
      if (text && !isWhitespaceOnly(text)) {
        const textNode: TipTapNode = { type: 'text', text };
        if (parentMarks.length > 0) {
          textNode.marks = [...parentMarks];
        }
        results.push(textNode);
      }
    }
    
    // Handle nested elements
    if (tagName) {
      const children = element[tagName] as ParsedElement[];
      
      if (isMarkType(tagName)) {
        // This is a mark - accumulate and recurse
        const mark: TipTapMark = { type: tagName };
        if (attrs && Object.keys(attrs).length > 0) {
          mark.attrs = { ...attrs };
        }
        const newMarks = [...parentMarks, mark];
        results.push(...extractTextWithMarks(children, newMarks));
      } else {
        // Non-mark element inside text - convert normally
        results.push(convertElement(element));
      }
    }
  }
  
  return results;
}

/**
 * Converts a parsed XML element to TipTap node
 */
function convertElement(element: ParsedElement): TipTapNode {
  const tagName = getTagName(element);
  if (!tagName) {
    throw new Error('Element has no tag name');
  }
  
  const attrs = element[':@'] as Record<string, unknown> | undefined;
  const children = element[tagName] as ParsedElement[];
  
  const result: TipTapNode = { type: tagName };
  
  if (attrs && Object.keys(attrs).length > 0) {
    result.attrs = { ...attrs };
  }
  
  if (children && children.length > 0) {
    const content: TipTapNode[] = [];
    
    for (const child of children) {
      const childTagName = getTagName(child);
      
      // Handle text content (skip whitespace-only text nodes)
      if ('#text' in child) {
        const text = child['#text'] as string;
        if (text && !isWhitespaceOnly(text)) {
          content.push({ type: 'text', text });
        }
      }
      
      // Handle child elements
      if (childTagName) {
        if (isMarkType(childTagName)) {
          // Mark element - extract text with marks
          content.push(...extractTextWithMarks([child], []));
        } else {
          // Regular element - recurse
          content.push(convertElement(child));
        }
      }
    }
    
    if (content.length > 0) {
      result.content = content;
    }
  }
  
  return result;
}

/**
 * Processes a list of parsed elements into TipTap nodes
 */
function processElements(elements: ParsedElement[]): TipTapNode[] {
  const content: TipTapNode[] = [];
  
  for (const child of elements) {
    const tagName = getTagName(child);
    
    // Handle text content (skip whitespace-only text nodes)
    if ('#text' in child) {
      const text = (child['#text'] as string);
      if (text && !isWhitespaceOnly(text)) {
        content.push({ type: 'text', text });
      }
    }
    
    // Handle child elements
    if (tagName) {
      // Skip "doc" wrapper if present - just process its children
      if (tagName === 'doc') {
        const docChildren = child.doc as ParsedElement[];
        if (Array.isArray(docChildren) && docChildren.length > 0) {
          content.push(...processElements(docChildren));
        }
      } else if (isMarkType(tagName)) {
        // Mark at top level - extract text with marks
        content.push(...extractTextWithMarks([child], []));
      } else {
        // Regular element
        content.push(convertElement(child));
      }
    }
  }
  
  return content;
}

/**
 * Converts semantic XML to TipTap JSON document
 * Note: The <doc> wrapper is optional - all top-level elements become doc content
 */
export function xmlToJson(xml: string): TipTapDoc {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    trimValues: false,
    parseAttributeValue: true,
  });
  
  const parsed = parser.parse(xml) as ParsedElement[];
  
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { type: 'doc', content: [] };
  }
  
  const result: TipTapDoc = { type: 'doc' };
  const content = processElements(parsed);
  
  if (content.length > 0) {
    result.content = content;
  }
  
  return result;
}

/**
 * Validates XML syntax and returns error message if invalid
 */
export function validateXml(xml: string): string | null {
  try {
    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
    });
    parser.parse(xml);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid XML';
  }
}

/**
 * Validates JSON syntax and returns error message if invalid
 */
export function validateJson(json: string): string | null {
  try {
    JSON.parse(json);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid JSON';
  }
}
