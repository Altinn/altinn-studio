import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const languageDefinitions = {
  bash,
  csharp,
  css,
  dockerfile,
  ini,
  javascript,
  json,
  markdown,
  typescript,
  xml,
  yaml,
};

export type StudioCodeViewerLanguage = keyof typeof languageDefinitions;

Object.entries(languageDefinitions).forEach(([name, definition]) =>
  hljs.registerLanguage(name, definition),
);

/** A file name without an extension, for example Dockerfile, is also its own extension here. */
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

export function highlightCode(code: string, language: StudioCodeViewerLanguage): string {
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}
