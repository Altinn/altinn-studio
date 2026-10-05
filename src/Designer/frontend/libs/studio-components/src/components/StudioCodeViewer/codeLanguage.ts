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

/**
 * Larger code is shown as plain text in one element, without colors and folds,
 * because one element for each line blocks the page for too long.
 */
export const MAX_FORMATTED_CODE_LENGTH = 100_000;
