/**
 * TypeScript interfaces for TipTap (ProseMirror) document structure
 * Based on block.schema.json
 */

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

export interface TipTapDoc {
  type: 'doc';
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
}

/**
 * Type guard to check if a node is a text node
 */
export function isTextNode(node: TipTapNode): node is TipTapNode & { text: string } {
  return node.type === 'text' && typeof node.text === 'string';
}
