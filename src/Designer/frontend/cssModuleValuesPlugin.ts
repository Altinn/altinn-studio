import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

const valueImportPattern = /@value\s+([\w\s,-]+?)\s+from\s+['"]([^'"]+)['"]\s*;/g;
const valueDefinitionPattern = /@value\s+([\w-]+)\s*:\s*([^;]+);/g;

/**
 * Replaces CSS module `@value` rules with their values. Designer transforms CSS with lightningcss,
 * which rejects `@value`, but the shared form components in src/common/ts use it for breakpoints.
 * Imports are resolved like Node resolves modules, so package names with `exports` work too.
 */
export function cssModuleValuesPlugin(): Plugin {
  return {
    name: 'css-module-values',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.module.css') || !code.includes('@value')) return null;
      const { css, importedFiles } = inlineCssModuleValues(code, file);
      importedFiles.forEach((importedFile) => this.addWatchFile(importedFile));
      return { code: css, map: null };
    },
  };
}

type InlineResult = {
  css: string;
  values: Map<string, string>;
  importedFiles: string[];
};

export function inlineCssModuleValues(css: string, file: string): InlineResult {
  const values = new Map<string, string>();
  const importedFiles: string[] = [];

  let output = css.replace(valueImportPattern, (_rule, names: string, source: string) => {
    const importedFile = resolveImport(source, file);
    const imported = inlineCssModuleValues(readFileSync(importedFile, 'utf8'), importedFile);
    importedFiles.push(importedFile, ...imported.importedFiles);
    names
      .split(',')
      .map((name) => name.trim())
      .forEach((name) => {
        if (!imported.values.has(name)) {
          throw new Error(`@value '${name}' is not defined in ${importedFile}.`);
        }
        values.set(name, imported.values.get(name));
      });
    return '';
  });

  output = output.replace(valueDefinitionPattern, (_rule, name: string, value: string) => {
    values.set(name, replaceValueNames(value.trim(), values));
    return '';
  });

  return { css: replaceValueNames(output, values), values, importedFiles };
}

function replaceValueNames(text: string, values: Map<string, string>): string {
  let result = text;
  values.forEach((value, name) => {
    result = result.replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`, 'g'), value);
  });
  return result;
}

function resolveImport(source: string, importer: string): string {
  return source.startsWith('.')
    ? path.resolve(path.dirname(importer), source)
    : createRequire(importer).resolve(source);
}
