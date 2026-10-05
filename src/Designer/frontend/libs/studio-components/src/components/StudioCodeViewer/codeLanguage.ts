import type { StudioCodeViewerLanguage } from './highlightCode';

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

/** Larger files are shown without highlighting, because highlighting blocks the page for too long. */
export const MAX_HIGHLIGHT_LENGTH = 200_000;
