// Import this file only with import(). Then highlight.js stays in a separate chunk.
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

export { hljs as highlighter };
