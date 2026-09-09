import { describe, expect, it } from 'vitest';

import { ComponentCatalogContext } from 'src/codegen/ComponentCatalogContext';
import { GenerateArray } from 'src/codegen/dataTypes/GenerateArray';
import { GenerateString } from 'src/codegen/dataTypes/GenerateString';

describe('GenerateArray', () => {
  it.each([
    [0, 0],
    [1, 3],
    [undefined, 3],
    [1, undefined],
    [undefined, undefined],
  ])('preserves cardinality limits %s and %s in the catalogue', (minItems, maxItems) => {
    const array = new GenerateArray(new GenerateString());
    if (minItems !== undefined) {
      array.setMinItems(minItems);
    }
    if (maxItems !== undefined) {
      array.setMaxItems(maxItems);
    }

    const bounds = { minItems, maxItems };
    const { root } = ComponentCatalogContext.generate(() => array.toComponentCatalog());
    expect(root).toMatchObject({ type: 'array', items: { type: 'string' }, ...bounds });
    expect(array.toJsonSchema()).toMatchObject(bounds);
  });
});
