import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import { CG } from 'src/codegen/CG';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';
import { ComponentCatalogContext } from 'src/codegen/ComponentCatalogContext';

function customObject() {
  return new CG.obj().addProperty(new CG.prop('label', new CG.str())).additionalProperties(true);
}

describe('GenerateObject with unrestricted additional properties', () => {
  it('accepts arbitrary values while still validating declared properties', () => {
    const validate = new Ajv().compile(customObject().toJsonSchema());
    const values = { count: 42, enabled: true, choices: ['red', 'blue'], metadata: { nested: null } };
    expect(validate({ label: 'Custom', ...values })).toBe(true);
    expect(validate({ label: 42, ...values })).toBe(false);
    expect(validate(values)).toBe(false);
  });

  it('preserves the open object in the catalogue and TypeScript', async () => {
    const { root } = ComponentCatalogContext.generate(() => customObject().toComponentCatalog());
    expect(root).toMatchObject({ type: 'object', additionalProperties: { type: 'any' } });
    const { result } = await CodeGeneratorContext.generateTypeScript('custom.generated.ts', () =>
      customObject().toTypeScriptDefinition('CustomPayload'),
    );
    expect(result).toContain('[key: string]: unknown;');
    expect(result).toContain('label: string;');
  });
});
