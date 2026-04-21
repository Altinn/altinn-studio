import DOMPurify from 'dompurify';
import type { AssistantMessage, UserAttachment, UserMessage } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function createAssistantMessage(content: string): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content,
    timestamp: new Date(),
    filesChanged: [],
  };
}

export function createUserMessage(
  content: string,
  allowAppChanges: boolean,
  attachments?: UserAttachment[],
): UserMessage {
  return {
    author: MessageAuthor.User,
    content,
    timestamp: new Date(),
    allowAppChanges,
    attachments,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanSourcesFromContent(content: string): string {
  let cleaned = content;
  cleaned = cleaned.replace(/^Kilder\s*\n(?:\[Source:.*?\]\s*\n?)+/gim, '');
  cleaned = cleaned.replace(/^Sources:?\s*\n(?:\[Source:.*?\]\s*\n?)+/gim, '');
  cleaned = cleaned.replace(/^\[Source:.*?\]\s*$/gim, '');
  cleaned = cleaned.replace(/^Sources:?\s*\n(?:[-•]\s*.*?\n?)+/gim, '');
  return cleaned.trim();
}

// Converts raw text into HTML-safe text so the markdown transforms below can't
// accidentally inject live tags from user content.
function escapeUntrustedText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatAssistantMessageContent(content: string): string {
  let html = cleanSourcesFromContent(content).trim();

  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, language, code) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    const lang = language ? ` data-language="${escapeUntrustedText(language)}"` : '';
    codeBlocks.push(`<pre${lang}><code>${escapeUntrustedText(code.trim())}</code></pre>`);
    return placeholder;
  });

  html = escapeUntrustedText(html);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*(?!\*)([^\n*]+?)\*(?![*\w])/g, '<em>$1</em>');

  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<oli>$2</oli>');
  html = html.replace(/^\s*[•\-*]\s+(.*)$/gm, '<li>$1</li>');

  html = html.replace(/(<oli>.*?<\/oli>\s*)+/g, (match) => {
    return `<ol>${match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li'))}</ol>`;
  });

  html = html.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  const blocks = html
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  html = blocks
    .map((block) => {
      if (/^<(h[1-6]|ul|ol|pre|div|blockquote)/.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  codeBlocks.forEach((block, index) => {
    html = html.replace(`___CODE_BLOCK_${index}___`, block);
  });

  return DOMPurify.sanitize(html);
}
