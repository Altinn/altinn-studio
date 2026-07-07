import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import type { AssistantMessage, UserAttachment, UserMessage } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function createAssistantMessage(content: string): AssistantMessage {
  return {
    role: MessageAuthor.Assistant,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createUserMessage(
  content: string,
  allowAppChanges: boolean,
  attachments?: UserAttachment[],
): UserMessage {
  return {
    role: MessageAuthor.User,
    content,
    createdAt: new Date().toISOString(),
    allowAppChanges,
    attachments,
  };
}

export function filterCriticalFileNames(filePaths: string[]): string[] {
  const criticalFileNames = ['policy.xml', 'applicationmetadata.json', '.csproj', 'package.json'];
  return filePaths.filter((filePath) =>
    criticalFileNames.some((criticalFileName) => filePath.toLowerCase().endsWith(criticalFileName)),
  );
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

const markdownParser = new Marked({ gfm: true, breaks: true });

export function formatAssistantMessageContent(content: string): string {
  const markdown = cleanSourcesFromContent(content);
  const html = markdownParser.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html).trim();
}
