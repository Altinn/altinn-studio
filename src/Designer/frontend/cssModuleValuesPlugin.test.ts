import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { inlineCssModuleValues } from './cssModuleValuesPlugin';

const flexCssFile = path.resolve(
  __dirname,
  '../../common/ts/form-component/src/app-components/Flex/Flex.module.css',
);

describe('inlineCssModuleValues', () => {
  it('replaces values defined in the same file', () => {
    const css = '@value small: (max-width: 599px);\n@media small { .a { color: red; } }';
    const { css: result } = inlineCssModuleValues(css, '/styles/a.module.css');
    expect(result).not.toContain('@value');
    expect(result).toContain('@media (max-width: 599px) { .a { color: red; } }');
  });

  it('resolves values that refer to other values', () => {
    const css =
      '@value small: (max-width: 599px);\n@value screenSmall: screen and small;\n@media screenSmall {}';
    const { css: result } = inlineCssModuleValues(css, '/styles/a.module.css');
    expect(result).toContain('@media screen and (max-width: 599px) {}');
  });

  it('does not replace parts of longer names', () => {
    const css = '@value small: 1px;\n.smallest { width: small; }';
    const { css: result } = inlineCssModuleValues(css, '/styles/a.module.css');
    expect(result).toContain('.smallest { width: 1px; }');
  });

  it('replaces values imported from the shared breakpoints', () => {
    const css =
      "@value mediaSmUp from '../breakpoints/breakpoints.module.css';\n@media mediaSmUp {}";
    const { css: result, importedFiles } = inlineCssModuleValues(css, flexCssFile);
    expect(result).toContain('@media (min-width: 600px) {}');
    expect(importedFiles).toHaveLength(1);
  });

  it('replaces values imported by package name', () => {
    const css =
      "@value mediaSmUp from '@app/form-component/styles/breakpoints.module.css';\n@media mediaSmUp {}";
    const { css: result } = inlineCssModuleValues(css, flexCssFile);
    expect(result).toContain('@media (min-width: 600px) {}');
  });

  it('throws when an imported value does not exist', () => {
    const css = "@value missing from '../breakpoints/breakpoints.module.css';";
    expect(() => inlineCssModuleValues(css, flexCssFile)).toThrow(
      "@value 'missing' is not defined",
    );
  });
});
