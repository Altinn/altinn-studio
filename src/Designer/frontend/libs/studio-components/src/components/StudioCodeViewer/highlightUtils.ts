import type { HLJSApi } from 'highlight.js';
import type { StudioCodeViewerLanguage } from './highlighter';

const languagesByFileExtension: Record<string, StudioCodeViewerLanguage> = {
  bpmn: 'xml',
  cjs: 'javascript',
  config: 'xml',
  cs: 'csharp',
  csproj: 'xml',
  css: 'css',
  dockerfile: 'dockerfile',
  editorconfig: 'ini',
  html: 'xml',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  md: 'markdown',
  mjs: 'javascript',
  props: 'xml',
  resx: 'xml',
  sh: 'bash',
  svg: 'xml',
  targets: 'xml',
  ts: 'typescript',
  tsx: 'typescript',
  xml: 'xml',
  xsd: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

export function getCodeLanguageFromFileName(
  fileName: string,
): StudioCodeViewerLanguage | undefined {
  const extension = fileName.split('/').pop().split('.').pop().toLowerCase();
  return languagesByFileExtension[extension];
}

let highlighterCache: HLJSApi | undefined;

export function getHighlighterIfLoaded(): HLJSApi | undefined {
  return highlighterCache;
}

export async function loadHighlighter(): Promise<HLJSApi> {
  highlighterCache ??= (await import('./highlighter')).highlighter;
  return highlighterCache;
}

export function highlightCodeLines(
  highlighter: HLJSApi,
  code: string,
  language: StudioCodeViewerLanguage,
): string[] {
  const html = highlighter.highlight(code, { language, ignoreIllegals: true }).value;
  return splitHighlightedCodeIntoLines(html);
}

/** An element that continues on the next line is closed at the end of the line and opened again on the next line. */
export function splitHighlightedCodeIntoLines(html: string): string[] {
  const lines: string[] = [];
  const openTags: string[] = [];
  let currentLine = '';
  const closeOpenTags = (): string => '</span>'.repeat(openTags.length);

  html
    .split(/(<span[^>]*>|<\/span>|\n)/)
    .filter(Boolean)
    .forEach((part) => {
      if (part === '\n') {
        lines.push(currentLine + closeOpenTags());
        currentLine = openTags.join('');
      } else {
        if (part.startsWith('<span')) openTags.push(part);
        if (part === '</span>') openTags.pop();
        currentLine += part;
      }
    });
  lines.push(currentLine + closeOpenTags());
  return lines;
}
